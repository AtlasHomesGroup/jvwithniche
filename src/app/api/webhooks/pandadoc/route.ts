import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { submissions, type Submission } from "@/db/schema";
import { downloadSignedPdf } from "@/lib/pandadoc/client";
import { verifyPandaDocSignature } from "@/lib/pandadoc/verify";
import { uploadSignedPdf } from "@/lib/blob-storage";
import {
  isConfigured as whatsappConfigured,
  WhapiApiError,
} from "@/lib/whatsapp/client";
import { notifyOperatorOfSignedSubmission } from "@/lib/whatsapp/group";
import { pushSubmissionToCrm } from "@/lib/crm/push";
import { sendDevAlert } from "@/lib/email/resend";
import { whatsappNotifyFailedEmail } from "@/lib/email/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PandaDocWebhookEvent {
  event: string;
  data?: {
    id?: string;
    status?: string;
    name?: string;
    metadata?: Record<string, string>;
  };
}

/**
 * PandaDoc webhook receiver.
 *
 * PandaDoc delivers webhooks as an array of events in a single POST. We
 * verify the HMAC signature on the raw body, then process each event.
 *
 * The event we care about most is `document_state_changed` transitioning
 * to `document.completed`. When that lands we download the signed PDF,
 * store it in Vercel Blob, and flip the submission to crm_sync_pending
 * so the CRM retry worker (M4) can pick it up.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const url = new URL(req.url);

  const verify = verifyPandaDocSignature(rawBody, {
    signatureQuery: url.searchParams.get("signature"),
    signatureHeader: req.headers.get("x-signature-sha256"),
  });
  if (!verify.ok) {
    console.warn("[pandadoc webhook] signature failed", verify.reason);
    return NextResponse.json(
      { error: "invalid_signature", reason: verify.reason },
      { status: 401 },
    );
  }

  let events: PandaDocWebhookEvent[] = [];
  try {
    const parsed = JSON.parse(rawBody);
    events = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const processed: string[] = [];
  const failures: Array<{
    event: string | undefined;
    id: string | undefined;
    kind: string;
    message: string;
    stack?: string;
  }> = [];
  for (const event of events) {
    try {
      await processEvent(event);
      processed.push(`${event.event}:${event.data?.id ?? "?"}`);
    } catch (err) {
      // Log and continue - PandaDoc retries failed deliveries, but other
      // events in the same batch shouldn't be held up by one bad row.
      const diag = {
        event: event.event,
        id: event.data?.id,
        kind: err instanceof Error ? err.name : "unknown",
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack?.slice(0, 800) : undefined,
      };
      console.error("[pandadoc webhook] event failed", JSON.stringify(diag));
      failures.push(diag);
    }
  }

  return NextResponse.json({ ok: true, processed, failures });
}

async function processEvent(event: PandaDocWebhookEvent): Promise<void> {
  const docId = event.data?.id;
  console.info(
    "[pandadoc webhook] event received",
    JSON.stringify({
      event: event.event,
      docId,
      status: event.data?.status,
      keys: event.data ? Object.keys(event.data) : [],
    }),
  );
  if (!docId) return;

  // Look up our submission by the PandaDoc document id.
  const rows = await db
    .select()
    .from(submissions)
    .where(eq(submissions.esignDocumentId, docId))
    .limit(1);
  const submission = rows[0];
  if (!submission) {
    console.warn(
      "[pandadoc webhook] no submission for doc",
      JSON.stringify({ docId, docIdLen: docId.length }),
    );
    return;
  }

  console.info(
    "[pandadoc webhook] submission matched",
    JSON.stringify({
      docId,
      submissionId: submission.id,
      status: submission.status,
      eventStatus: event.data?.status,
    }),
  );

  const isComplete =
    event.event === "document_state_changed" &&
    event.data?.status === "document.completed";
  if (!isComplete) return;

  // Already processed - PandaDoc retries deliveries on failure, so treat
  // duplicates as no-ops.
  if (submission.signedAt && submission.signedPdfUrl) {
    console.info("[pandadoc webhook] already processed", docId);
    return;
  }

  // Download the signed PDF and archive it in Vercel Blob.
  const pdf = await downloadSignedPdf(docId);
  const stored = await uploadSignedPdf({
    submissionId: submission.id,
    pdf,
    provider: "pandadoc",
  });

  const now = new Date();
  const [updated] = await db
    .update(submissions)
    .set({
      signedAt: now,
      signedPdfUrl: stored.url,
      status: "crm_sync_pending",
      updatedAt: now,
      lastActivityAt: now,
    })
    .where(eq(submissions.id, submission.id))
    .returning();

  console.info(
    "[pandadoc webhook] signed + archived",
    submission.id,
    stored.url,
  );

  // Kick off operator notification + CRM push in parallel so neither
  // blocks the other. Failures on either side are non-fatal - the
  // submission is already persisted; the team has the admin view + dev
  // alerts to recover manually, and the CRM push self-enqueues for retry.
  await Promise.allSettled([
    notifyOperatorOfSignedWrapper(updated),
    pushSubmissionToCrm(updated).catch((err) => {
      // pushSubmissionToCrm catches its own errors, but we add a safety
      // net here so an unexpected throw can't abort other settled calls.
      console.error(
        "[pandadoc webhook] unexpected CRM push throw",
        err instanceof Error ? err.message : String(err),
      );
    }),
  ]);
}

async function notifyOperatorOfSignedWrapper(
  submission: Submission,
): Promise<void> {
  if (!whatsappConfigured()) {
    console.info(
      "[pandadoc webhook] whatsapp notify skipped - WHAPI_API_KEY not set",
      submission.id,
    );
    return;
  }
  try {
    await notifyOperatorOfSignedSubmission(submission);
    console.info(
      "[pandadoc webhook] operator notified of signing",
      submission.id,
    );
  } catch (err) {
    const diag =
      err instanceof WhapiApiError
        ? {
            kind: "WhapiApiError" as const,
            status: err.status,
            body: err.body.slice(0, 400),
            message: err.message,
          }
        : err instanceof Error
          ? {
              kind: err.name,
              message: err.message,
              stack: err.stack?.slice(0, 500),
            }
          : { kind: "unknown", message: String(err) };
    console.error(
      "[pandadoc webhook] operator notify failed",
      JSON.stringify({ submissionId: submission.id, ...diag }),
    );
    try {
      const { subject, html, text } = whatsappNotifyFailedEmail(submission, {
        kind: diag.kind,
        message: "message" in diag ? diag.message : undefined,
        status: "status" in diag ? diag.status : undefined,
        body: "body" in diag ? diag.body : undefined,
      });
      await sendDevAlert({ subject, html, text });
    } catch (alertErr) {
      console.warn(
        "[pandadoc webhook] failed to send notify-failure alert",
        alertErr,
      );
    }
  }
}
