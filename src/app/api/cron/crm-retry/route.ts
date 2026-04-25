import { NextResponse } from "next/server";
import { and, eq, isNotNull, lte } from "drizzle-orm";

import { serverError, unauthorized } from "@/lib/api";
import { db } from "@/db/client";
import { crmSyncQueue, submissions } from "@/db/schema";
import { pushSubmissionToCrm } from "@/lib/crm/push";
import { isConfigured as crmConfigured } from "@/lib/crm/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Vercel Cron entry point (scheduled in vercel.json every 5 min).
 *
 * Drains `crm_sync_queue` rows whose `next_attempt_at` has elapsed. Each
 * row is re-driven through `pushSubmissionToCrm`, which updates the queue
 * row in place (backoff) or deletes it on success.
 *
 * Guarded by CRON_SECRET passed via Authorization: Bearer {secret}. When
 * CRON_SECRET isn't configured locally, we allow any call (dev mode).
 */
export async function GET(req: Request) {
  if (!isAuthorized(req)) return unauthorized();
  if (!crmConfigured()) {
    return NextResponse.json({
      ok: true,
      skipped: "CRM_ENDPOINT_URL not set",
    });
  }

  try {
    const now = new Date();
    const due = await db
      .select({
        queueId: crmSyncQueue.id,
        attempts: crmSyncQueue.attempts,
        submissionId: crmSyncQueue.submissionId,
      })
      .from(crmSyncQueue)
      .where(
        and(
          isNotNull(crmSyncQueue.submissionId),
          lte(crmSyncQueue.nextAttemptAt, now),
        ),
      )
      .limit(25);

    const results: Array<{
      queueId: string;
      submissionId: string;
      outcome: string;
    }> = [];

    for (const row of due) {
      if (!row.submissionId) continue;
      const [submission] = await db
        .select()
        .from(submissions)
        .where(eq(submissions.id, row.submissionId))
        .limit(1);
      if (!submission) {
        // Submission was deleted - drop the orphan queue row.
        await db.delete(crmSyncQueue).where(eq(crmSyncQueue.id, row.queueId));
        results.push({
          queueId: row.queueId,
          submissionId: row.submissionId,
          outcome: "orphan_dropped",
        });
        continue;
      }

      const outcome = await pushSubmissionToCrm(submission, {
        queueItemId: row.queueId,
        attemptsSoFar: row.attempts,
      });
      results.push({
        queueId: row.queueId,
        submissionId: submission.id,
        outcome: outcome.kind,
      });
    }

    return NextResponse.json({ ok: true, processed: results.length, results });
  } catch (err) {
    console.error("[cron crm-retry] failed", err);
    return serverError("cron run failed");
  }
}

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev fallback
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}
