import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { del, list } from "@vercel/blob";

import { badRequest, serverError, unauthorized } from "@/lib/api";
import { db } from "@/db/client";
import { submissions } from "@/db/schema";
import { getAdminSession } from "@/lib/admin/session";
import { logAdminAction } from "@/lib/admin/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Hard-delete a submission plus all its artefacts. Cascades via the
 * schema-level ON DELETE CASCADE on submission_updates + crm_sync_queue,
 * so all we have to do at the app layer is:
 *   1. Best-effort remove every Blob under `submissions/{id}/`.
 *   2. Delete the submission row.
 *   3. Log the action (audit row survives because admin_actions.submission_id
 *      is ON DELETE SET NULL, not cascade).
 *
 * No soft-delete — the user explicitly asked for a way to wipe test data.
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

    // Snapshot the details we want to log before the row is gone.
    const snapshot = {
      propertyStreet: submission.propertyStreet,
      propertyCity: submission.propertyCity,
      propertyState: submission.propertyState,
      submitterEmail: submission.submitterEmail,
      dealType: submission.dealType,
      status: submission.status,
      crmOpportunityId: submission.crmOpportunityId,
      whatsappGroupId: submission.whatsappGroupId,
    };

    // Best-effort: remove every blob under submissions/{id}/.
    let deletedBlobCount = 0;
    try {
      const prefix = `submissions/${id}/`;
      let cursor: string | undefined;
      do {
        const page = await list({ prefix, cursor, limit: 1000 });
        if (page.blobs.length > 0) {
          await del(page.blobs.map((b) => b.url));
          deletedBlobCount += page.blobs.length;
        }
        cursor = page.cursor ?? undefined;
      } while (cursor);
    } catch (err) {
      console.warn(
        "[admin/delete] blob cleanup failed (non-fatal)",
        JSON.stringify({
          submissionId: id,
          message: err instanceof Error ? err.message : String(err),
        }),
      );
    }

    await db.delete(submissions).where(eq(submissions.id, id));

    await logAdminAction({
      admin,
      actionType: "delete_submission",
      // Intentional null — the FK set-null avoids breaking the audit row.
      submissionId: null,
      details: {
        deletedSubmissionId: id,
        deletedBlobCount,
        ...snapshot,
      },
    });

    return NextResponse.json({
      ok: true,
      deletedBlobCount,
      triggeredBy: admin.email,
    });
  } catch (err) {
    console.error("[admin/delete] failed", err);
    return serverError("delete failed");
  }
}
