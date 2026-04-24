import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { badRequest, serverError, unauthorized } from "@/lib/api";
import { db } from "@/db/client";
import { submissions } from "@/db/schema";
import { getAdminSession } from "@/lib/admin/session";
import { logAdminAction } from "@/lib/admin/audit";
import { sendDocument, PandaDocApiError } from "@/lib/pandadoc/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin-triggered resend of the PandaDoc signing email. PandaDoc's
 * `/documents/{id}/send` endpoint acts as a reminder trigger when the
 * document is already in the sent state, re-mailing every recipient.
 *
 * Only valid while the submission is awaiting signature — once signed, a
 * fresh signing email doesn't make sense.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminSession();
  if (!admin) return unauthorized("not authenticated");

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return badRequest("invalid id");

  try {
    const [submission] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, id))
      .limit(1);
    if (!submission) return badRequest("submission not found");
    if (!submission.esignDocumentId) {
      return badRequest("no PandaDoc document id for this submission");
    }
    if (submission.status !== "awaiting_signature") {
      return badRequest(
        `submission is ${submission.status} — resend only makes sense while awaiting_signature`,
      );
    }

    try {
      await sendDocument(submission.esignDocumentId, { silent: false });
    } catch (err) {
      if (err instanceof PandaDocApiError) {
        await logAdminAction({
          admin,
          actionType: "resend_signing_email",
          submissionId: submission.id,
          details: {
            outcome: "failed",
            status: err.status,
            body: err.body.slice(0, 400),
          },
        });
        return NextResponse.json(
          { error: "pandadoc_error", status: err.status, body: err.body.slice(0, 400) },
          { status: 502 },
        );
      }
      throw err;
    }

    await logAdminAction({
      admin,
      actionType: "resend_signing_email",
      submissionId: submission.id,
      details: {
        outcome: "succeeded",
        docId: submission.esignDocumentId,
      },
    });

    return NextResponse.json({ ok: true, triggeredBy: admin.email });
  } catch (err) {
    console.error("[admin/resend-signing] failed", err);
    return serverError("resend failed");
  }
}
