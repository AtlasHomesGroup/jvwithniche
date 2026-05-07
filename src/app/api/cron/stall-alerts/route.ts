import { NextResponse } from "next/server";
import { and, eq, inArray, isNull, lt, or } from "drizzle-orm";

import { unauthorized, serverError } from "@/lib/api";
import { db } from "@/db/client";
import { submissions, type Submission } from "@/db/schema";
import {
  sendCustomerEmail,
  sendDevAlert,
  sendOpsAlert,
} from "@/lib/email/resend";
import {
  autoDeletedDigestEmail,
  stalledDraftEmail,
  submitterPleaseSignEmail,
} from "@/lib/email/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stalled-alert threshold. Tunable via STALLED_ALERT_THRESHOLD_MINUTES env
 * var - e.g. 30 for 30 min, 1440 for 24h. Defaults to 120 (2h).
 *
 * Auto-delete runs at a fixed 7-day-idle threshold (retention policy is
 * more sensitive than alert timing - changing it needs a code review).
 */
function stalledThresholdMs(): number {
  const raw = process.env.STALLED_ALERT_THRESHOLD_MINUTES;
  const minutes = raw ? Number(raw) : NaN;
  if (!Number.isFinite(minutes) || minutes <= 0) return 2 * 60 * 60 * 1000;
  return minutes * 60 * 1000;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Vercel Cron entry point (scheduled in vercel.json every 15 min).
 * Two responsibilities:
 *   1. Alert Michael about drafts stalled in awaiting_signature > 2h.
 *   2. Delete drafts (status = draft OR awaiting_signature) older than
 *      7 days of inactivity; send a digest email summarising the sweep.
 *
 * Guarded by CRON_SECRET passed via Authorization: Bearer {secret}. When
 * CRON_SECRET isn't configured locally, we allow any call (dev mode).
 */
export async function GET(req: Request) {
  if (!isAuthorized(req)) return unauthorized();

  try {
    const stalledAlerted = await runStalledAlerts();
    const autoDeleted = await runAutoDelete();

    return NextResponse.json({
      ok: true,
      stalledAlerted: stalledAlerted.map((s) => ({
        id: s.id,
        email: s.submitterEmail,
      })),
      autoDeletedCount: autoDeleted.length,
    });
  } catch (err) {
    console.error("[cron stall-alerts] failed", err);
    return serverError("cron run failed");
  }
}

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev fallback
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

async function runStalledAlerts(): Promise<Submission[]> {
  const cutoff = new Date(Date.now() - stalledThresholdMs());

  const stalled = await db
    .select()
    .from(submissions)
    .where(
      and(
        eq(submissions.status, "awaiting_signature"),
        lt(submissions.lastActivityAt, cutoff),
        isNull(submissions.stalledAlertSentAt),
      ),
    );

  for (const s of stalled) {
    // 1. Ops alert (Michael).
    const ops = stalledDraftEmail(s);
    const opsResult = await sendOpsAlert({
      subject: ops.subject,
      html: ops.html,
      text: ops.text,
    });
    if (!opsResult.sent) {
      console.warn(
        "[cron stall-alerts] ops send failed",
        s.id,
        opsResult.reason,
      );
      // Don't continue - we still want to try the customer email.
    }

    // 2. Customer-facing nudge - skip if no email on file.
    if (s.submitterEmail) {
      const cust = submitterPleaseSignEmail(s);
      const custResult = await sendCustomerEmail({
        to: s.submitterEmail,
        subject: cust.subject,
        html: cust.html,
        text: cust.text,
      });
      if (!custResult.sent) {
        console.warn(
          "[cron stall-alerts] customer send failed",
          s.id,
          custResult.reason,
        );
      }
    } else {
      console.info(
        "[cron stall-alerts] no submitter email - customer nudge skipped",
        s.id,
      );
    }

    // Mark sent if either email succeeded; otherwise leave the flag null
    // so the next cron run retries.
    if (opsResult.sent || s.submitterEmail) {
      await db
        .update(submissions)
        .set({ stalledAlertSentAt: new Date() })
        .where(eq(submissions.id, s.id));
    }
  }

  return stalled;
}

async function runAutoDelete(): Promise<Submission[]> {
  const cutoff = new Date(Date.now() - SEVEN_DAYS_MS);

  const stale = await db
    .select()
    .from(submissions)
    .where(
      and(
        or(
          eq(submissions.status, "draft"),
          eq(submissions.status, "awaiting_signature"),
        ),
        lt(submissions.lastActivityAt, cutoff),
      ),
    );

  if (stale.length === 0) return [];

  await db
    .delete(submissions)
    .where(
      inArray(
        submissions.id,
        stale.map((s) => s.id),
      ),
    );

  const { subject, html, text } = autoDeletedDigestEmail(stale);
  await sendDevAlert({ subject, html, text });

  return stale;
}
