/**
 * Centralized post-signing fan-out used by both:
 *   - the Pandadoc webhook (when a fresh signing completes), and
 *   - POST /api/submissions when we detect a returning setter and reuse
 *     their prior signed contract.
 *
 * Each side effect is wrapped in its own try/catch so a single failure
 * (Whapi 401, Resend hiccup, Twilio rate limit) doesn't take down the
 * rest of the fan-out.
 */

import type { Submission } from "@/db/schema";

import { pushSubmissionToCrm } from "@/lib/crm/push";
import {
  sendCustomerEmail,
  sendDevAlert,
} from "@/lib/email/resend";
import {
  submitterSignedEmail,
  whatsappNotifyFailedEmail,
} from "@/lib/email/templates";
import {
  isConfigured as smsConfigured,
  sendOpsSms,
  sendSms,
} from "@/lib/sms/client";
import { opsSignedSms, submitterSignedSms } from "@/lib/sms/templates";
import {
  isConfigured as whatsappConfigured,
  WhapiApiError,
} from "@/lib/whatsapp/client";
import { notifyOperatorOfSignedSubmission } from "@/lib/whatsapp/group";

export interface PostSigningOptions {
  /** True when the signing was inherited from a prior submission by the
   *  same setter (phone match). Adjusts message wording for ops. */
  isReturning?: boolean;
}

export async function runPostSigningSideEffects(
  submission: Submission,
  opts: PostSigningOptions = {},
): Promise<void> {
  const isReturning = opts.isReturning ?? false;

  await Promise.allSettled([
    // operatorWhatsappNotify(submission),
    // ↑ paused per ops decision (2026-05-08). Whapi is still configured;
    //   re-enable here when ready to go back to the "5-message bundle to
    //   bound number" workflow.
    submitterSignedEmailFanout(submission),
    submitterSignedSmsFanout(submission),
    opsSignedSmsFanout(submission, isReturning),
    pushSubmissionToCrm(submission).catch((err) => {
      console.error(
        "[post-sign] unexpected CRM push throw",
        err instanceof Error ? err.message : String(err),
      );
    }),
  ]);
}

async function operatorWhatsappNotify(submission: Submission): Promise<void> {
  if (!whatsappConfigured()) {
    console.info(
      "[post-sign] whatsapp notify skipped - WHAPI_API_KEY not set",
      submission.id,
    );
    return;
  }
  try {
    await notifyOperatorOfSignedSubmission(submission);
    console.info("[post-sign] operator notified of signing", submission.id);
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
      "[post-sign] operator notify failed",
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
        "[post-sign] failed to send notify-failure alert",
        alertErr,
      );
    }
  }
}

async function submitterSignedEmailFanout(
  submission: Submission,
): Promise<void> {
  const tpl = submitterSignedEmail(submission);
  if (!tpl) {
    console.info(
      "[post-sign] submitter thank-you email skipped - no email on file",
      submission.id,
    );
    return;
  }
  if (!submission.submitterEmail) return;
  const result = await sendCustomerEmail({
    to: submission.submitterEmail,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  });
  if (!result.sent) {
    console.warn(
      "[post-sign] submitter thank-you email failed",
      submission.id,
      result.reason,
    );
    return;
  }
  console.info(
    "[post-sign] submitter thank-you email sent",
    JSON.stringify({ submissionId: submission.id, to: submission.submitterEmail }),
  );
}

async function submitterSignedSmsFanout(
  submission: Submission,
): Promise<void> {
  if (!smsConfigured()) {
    console.info(
      "[post-sign] submitter sms skipped - twilio not configured",
      submission.id,
    );
    return;
  }
  if (!submission.submitterPhoneE164) {
    console.info("[post-sign] submitter sms skipped - no phone", submission.id);
    return;
  }
  const fd =
    (submission.formData as { whatsappConsent?: unknown } | null) ?? {};
  if (fd.whatsappConsent !== true) {
    console.info("[post-sign] submitter sms skipped - no consent", submission.id);
    return;
  }
  const result = await sendSms({
    to: submission.submitterPhoneE164,
    body: submitterSignedSms(submission),
  });
  if (!result.sent) {
    console.warn(
      "[post-sign] submitter sms failed",
      submission.id,
      result.reason,
    );
    return;
  }
  console.info(
    "[post-sign] submitter sms sent",
    JSON.stringify({ submissionId: submission.id, sid: result.sid }),
  );
}

async function opsSignedSmsFanout(
  submission: Submission,
  _isReturning: boolean,
): Promise<void> {
  if (!smsConfigured()) return;
  const results = await sendOpsSms(opsSignedSms(submission));
  for (const r of results) {
    if (!r.sent) {
      console.warn(
        "[post-sign] ops signed sms failed",
        JSON.stringify({ submissionId: submission.id, to: r.to, reason: r.reason }),
      );
    } else {
      console.info(
        "[post-sign] ops signed sms sent",
        JSON.stringify({ submissionId: submission.id, to: r.to, sid: r.sid }),
      );
    }
  }
}
