import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { badRequest, serverError, unauthorized } from "@/lib/api";
import { db } from "@/db/client";
import { submissions } from "@/db/schema";
import { getAdminSession } from "@/lib/admin/session";
import { logAdminAction } from "@/lib/admin/audit";
import { pushSubmissionToCrm } from "@/lib/crm/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin-triggered manual CRM push. Always passes `force: true` so an
 * admin can re-create the Salesforce Lead after manually deleting it on
 * the CRM side. The auto-flow (webhook, cron) keeps the idempotency
 * guard, so this can't double-push without an explicit admin click.
 */
export async function POST(
  req: Request,
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

    const previousLeadId = submission.crmOpportunityId;
    const outcome = await pushSubmissionToCrm(submission, { force: true });
    await logAdminAction({
      admin,
      actionType: "retry_crm",
      submissionId: submission.id,
      details: {
        outcome: outcome.kind,
        reason: outcome.reason ?? null,
        crmOpportunityId: outcome.crmOpportunityId ?? null,
        previousLeadId: previousLeadId ?? null,
        forced: true,
      },
    });
    return NextResponse.json({
      ok: true,
      outcome,
      triggeredBy: admin.email,
    });
  } catch (err) {
    console.error("[admin/retry-crm] failed", err);
    return serverError("retry failed");
  }
}
