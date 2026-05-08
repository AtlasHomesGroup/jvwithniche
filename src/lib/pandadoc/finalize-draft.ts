/**
 * Server-side "press the Generate button" — used by:
 *   - POST /api/submissions (when the user actually clicks the button)
 *   - the stall-alerts cron (when a draft is fully complete but the user
 *     never pressed Generate; we auto-finalize so the contract goes out
 *     and we can send them a `/sign/<id>` link).
 *
 * Builds the Pandadoc document from the draft's formData, polls until
 * the doc leaves the `uploaded` state, sends it to the recipient, and
 * flips the submission row to awaiting_signature with the new doc id.
 */

import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { submissions, type Submission } from "@/db/schema";
import {
  createDocument,
  getDocumentStatus,
  hasTemplate as hasPandadocTemplate,
  sendDocument,
  PandaDocApiError,
} from "@/lib/pandadoc/client";
import {
  buildDocumentName,
  buildMergeTokens,
  buildRecipients,
} from "@/lib/pandadoc/merge-fields";
import type { FullFormData } from "@/lib/form-schema";

export interface FinalizeDraftResult {
  ok: boolean;
  esignDocumentId?: string;
  error?: string;
  /** The submission row reflecting the post-finalize state. */
  submission?: Submission;
}

export async function finalizeDraft(
  submission: Submission,
): Promise<FinalizeDraftResult> {
  if (!hasPandadocTemplate()) {
    return { ok: false, error: "pandadoc_template_not_configured" };
  }
  const fd = (submission.formData as FullFormData) ?? ({} as FullFormData);

  try {
    const doc = await createDocument({
      name: buildDocumentName(fd),
      template_uuid: process.env.PANDADOC_TEMPLATE_ID!,
      recipients: buildRecipients(fd),
      tokens: buildMergeTokens(fd),
      metadata: {
        submission_id: submission.id,
        deal_type: fd.dealType ?? "",
      },
    });

    // Pandadoc refuses to send while the doc is in document.uploaded.
    // Cap polling at ~8s.
    for (let i = 0; i < 6; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, 1200));
      const s = await getDocumentStatus(doc.id);
      if (s.status !== "document.uploaded") break;
    }

    try {
      await sendDocument(doc.id, { silent: false });
    } catch (sendErr) {
      const body =
        sendErr instanceof PandaDocApiError
          ? sendErr.body.slice(0, 300)
          : String(sendErr);
      console.warn(
        "[finalize-draft] pandadoc send failed; retrying",
        JSON.stringify({ docId: doc.id, body }),
      );
      await new Promise((r) => setTimeout(r, 1500));
      await sendDocument(doc.id, { silent: false });
    }

    const now = new Date();
    const [updated] = await db
      .update(submissions)
      .set({
        status: "awaiting_signature",
        esignProvider: "pandadoc",
        esignDocumentId: doc.id,
        updatedAt: now,
        lastActivityAt: now,
      })
      .where(eq(submissions.id, submission.id))
      .returning();

    return { ok: true, esignDocumentId: doc.id, submission: updated };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
