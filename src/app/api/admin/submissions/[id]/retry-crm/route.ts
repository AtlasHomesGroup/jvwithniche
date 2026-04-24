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
 * Admin-triggered manual CRM push. Runs through the same orchestrator as
 * the automatic webhook path — idempotency guard + retry-queue bookkeeping
 * is already built in, so calling this on a synced submission is a no-op.
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

    const outcome = await pushSubmissionToCrm(submission);
    await logAdminAction({
      admin,
      actionType: "retry_crm",
      submissionId: submission.id,
      details: {
        outcome: outcome.kind,
        reason: outcome.reason ?? null,
        crmOpportunityId: outcome.crmOpportunityId ?? null,
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
