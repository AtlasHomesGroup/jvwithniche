import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  crmSyncQueue,
  submissions,
  type Submission,
} from "@/db/schema";
import { sendDevAlert } from "@/lib/email/resend";
import { crmPushFailedEmail } from "@/lib/email/templates";
import {
  CrmApiError,
  CrmConfigError,
  isConfigured,
  pushToCrm,
} from "./client";
import { buildCrmPayload } from "./payload";

const BACKOFF_MS: number[] = [
  5 * 60 * 1000, // attempt 1 → retry in 5m
  15 * 60 * 1000, // attempt 2 → retry in 15m
  60 * 60 * 1000, // attempt 3 → retry in 1h
  6 * 60 * 60 * 1000, // attempt 4 → retry in 6h
  24 * 60 * 60 * 1000, // attempt 5 → retry in 24h
];
const MAX_ATTEMPTS = BACKOFF_MS.length;

export interface PushOutcome {
  kind: "skipped" | "already_synced" | "succeeded" | "enqueued_for_retry" | "failed_permanently";
  submissionId: string;
  crmOpportunityId?: string;
  reason?: string;
}

/**
 * Push one signed submission to the Niche CRM. Handles idempotency, error
 * classification, retry enqueueing, and dev-alert emails. Safe to call
 * from both the PandaDoc webhook (initial push) and the retry cron (queued
 * reattempts).
 */
export async function pushSubmissionToCrm(
  submission: Submission,
  opts: { queueItemId?: string; attemptsSoFar?: number } = {},
): Promise<PushOutcome> {
  if (!isConfigured()) {
    console.info(
      "[crm] skipped — CRM_ENDPOINT_URL not set",
      submission.id,
    );
    return { kind: "skipped", submissionId: submission.id };
  }
  if (submission.crmSyncedAt && submission.crmOpportunityId) {
    console.info("[crm] already synced", submission.id);
    return {
      kind: "already_synced",
      submissionId: submission.id,
      crmOpportunityId: submission.crmOpportunityId,
    };
  }
  if (!submission.signedPdfUrl) {
    const reason = "signed PDF not yet archived — cannot push to CRM";
    console.warn("[crm] push skipped", submission.id, reason);
    return { kind: "skipped", submissionId: submission.id, reason };
  }

  const attemptNumber = (opts.attemptsSoFar ?? 0) + 1;

  try {
    const payload = await buildCrmPayload(submission);
    console.info(
      "[crm] pushing",
      JSON.stringify({
        submissionId: submission.id,
        attempt: attemptNumber,
        notes: payload.notes.length,
        files: payload.files.length,
        payloadBytes: JSON.stringify(payload).length,
      }),
    );
    const { recordId, rawBody } = await pushToCrm(payload);
    const now = new Date();
    await db
      .update(submissions)
      .set({
        crmOpportunityId: recordId,
        crmSyncedAt: now,
        status: "crm_synced",
        updatedAt: now,
      })
      .where(eq(submissions.id, submission.id));

    if (opts.queueItemId) {
      await db
        .delete(crmSyncQueue)
        .where(eq(crmSyncQueue.id, opts.queueItemId));
    }

    console.info(
      "[crm] push succeeded",
      JSON.stringify({
        submissionId: submission.id,
        recordId,
        rawBodyPrefix: rawBody.slice(0, 120),
      }),
    );
    return {
      kind: "succeeded",
      submissionId: submission.id,
      crmOpportunityId: recordId,
    };
  } catch (err) {
    return handleFailure(submission, err, opts, attemptNumber);
  }
}

async function handleFailure(
  submission: Submission,
  err: unknown,
  opts: { queueItemId?: string; attemptsSoFar?: number },
  attemptNumber: number,
): Promise<PushOutcome> {
  const diag =
    err instanceof CrmApiError
      ? {
          kind: "CrmApiError" as const,
          status: err.status,
          body: err.body.slice(0, 600),
          message: err.message,
        }
      : err instanceof CrmConfigError
        ? { kind: "CrmConfigError" as const, message: err.message }
        : err instanceof Error
          ? {
              kind: err.name,
              message: err.message,
              stack: err.stack?.slice(0, 500),
            }
          : { kind: "unknown", message: String(err) };

  console.error(
    "[crm] push failed",
    JSON.stringify({
      submissionId: submission.id,
      attempt: attemptNumber,
      ...diag,
    }),
  );

  const errorSummary =
    err instanceof CrmApiError
      ? `CrmApiError ${err.status}: ${err.body.slice(0, 200)}`
      : `${diag.kind}: ${"message" in diag ? diag.message ?? "" : ""}`.slice(
          0,
          400,
        );

  // Decide whether to retry. We don't retry CrmConfigError — it's a setup
  // issue that won't fix itself. Everything else is retryable.
  const retryable = !(err instanceof CrmConfigError);

  if (retryable && attemptNumber < MAX_ATTEMPTS) {
    await enqueueRetry({
      submissionId: submission.id,
      queueItemId: opts.queueItemId,
      attempts: attemptNumber,
      lastError: errorSummary,
    });
    return {
      kind: "enqueued_for_retry",
      submissionId: submission.id,
      reason: errorSummary,
    };
  }

  // Out of retries (or permanent error). Mark the queue item closed with
  // the last error; leave the submission at crm_sync_pending so an admin
  // can intervene.
  if (opts.queueItemId) {
    await db
      .update(crmSyncQueue)
      .set({
        attempts: attemptNumber,
        lastAttemptAt: new Date(),
        lastError: errorSummary,
        nextAttemptAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      })
      .where(eq(crmSyncQueue.id, opts.queueItemId));
  }

  try {
    const { subject, html, text } = crmPushFailedEmail(submission, {
      kind: diag.kind,
      message: "message" in diag ? diag.message : undefined,
      status: "status" in diag ? diag.status : undefined,
      body: "body" in diag ? diag.body : undefined,
      attempt: attemptNumber,
      permanent: true,
    });
    await sendDevAlert({ subject, html, text });
  } catch (alertErr) {
    console.warn("[crm] failed to send permanent-failure alert", alertErr);
  }

  return {
    kind: "failed_permanently",
    submissionId: submission.id,
    reason: errorSummary,
  };
}

async function enqueueRetry(input: {
  submissionId: string;
  queueItemId?: string;
  attempts: number;
  lastError: string;
}): Promise<void> {
  const backoff = BACKOFF_MS[Math.min(input.attempts - 1, BACKOFF_MS.length - 1)];
  const nextAttemptAt = new Date(Date.now() + backoff);
  const now = new Date();

  if (input.queueItemId) {
    await db
      .update(crmSyncQueue)
      .set({
        attempts: input.attempts,
        lastAttemptAt: now,
        nextAttemptAt,
        lastError: input.lastError,
      })
      .where(eq(crmSyncQueue.id, input.queueItemId));
    return;
  }

  // First failure — check if a queue row already exists for this submission
  // (defensive — we don't want two rows racing).
  const existing = await db
    .select({ id: crmSyncQueue.id })
    .from(crmSyncQueue)
    .where(eq(crmSyncQueue.submissionId, input.submissionId))
    .limit(1);

  if (existing[0]) {
    await db
      .update(crmSyncQueue)
      .set({
        attempts: input.attempts,
        lastAttemptAt: now,
        nextAttemptAt,
        lastError: input.lastError,
      })
      .where(eq(crmSyncQueue.id, existing[0].id));
    return;
  }

  await db.insert(crmSyncQueue).values({
    submissionId: input.submissionId,
    attempts: input.attempts,
    lastAttemptAt: now,
    nextAttemptAt,
    lastError: input.lastError,
  });
}

export { BACKOFF_MS, MAX_ATTEMPTS };

export interface FollowUpInput {
  note?: { title: string; body: string };
  file?: { filename: string; contentType: string; base64: string };
}

export interface FollowUpOutcome {
  ok: boolean;
  rawBody?: string;
  reason?: string;
}

/**
 * Post a follow-up (note or file) against an existing CRM Lead. Uses the
 * same `jvRequest` endpoint with `requestObject.Id` set so the Apex method
 * can detect an update-case and append notes/files to the existing Lead.
 *
 * Only pushes when the submission has a stored `crmOpportunityId`; when
 * that's null the caller should persist the update locally and the CRM
 * sync will catch up once the initial push succeeds.
 */
export async function pushFollowUpToCrm(
  submission: Submission,
  input: FollowUpInput,
): Promise<FollowUpOutcome> {
  if (!isConfigured()) {
    return { ok: false, reason: "CRM_ENDPOINT_URL not set" };
  }
  if (!submission.crmOpportunityId) {
    return {
      ok: false,
      reason: "submission has no crmOpportunityId yet — skipping follow-up push",
    };
  }
  if (!input.note && !input.file) {
    return { ok: false, reason: "nothing to push" };
  }

  const payload = {
    requestObject: {
      attributes: {
        type: "Lead__c" as const,
        url: `/services/data/v65.0/sobjects/Lead__c/${submission.crmOpportunityId}`,
      },
      Id: submission.crmOpportunityId,
    },
    description: "",
    notes: input.note ? [input.note] : [],
    files: input.file ? [input.file] : [],
  };

  try {
    const res = await pushToCrm(payload);
    console.info(
      "[crm] follow-up push succeeded",
      JSON.stringify({
        submissionId: submission.id,
        leadId: submission.crmOpportunityId,
        kind: input.note ? "note" : "file",
      }),
    );
    return { ok: true, rawBody: res.rawBody };
  } catch (err) {
    const reason =
      err instanceof CrmApiError
        ? `CrmApiError ${err.status}: ${err.body.slice(0, 200)}`
        : err instanceof Error
          ? `${err.name}: ${err.message}`
          : String(err);
    console.error(
      "[crm] follow-up push failed",
      JSON.stringify({
        submissionId: submission.id,
        leadId: submission.crmOpportunityId,
        reason,
      }),
    );
    return { ok: false, reason };
  }
}
