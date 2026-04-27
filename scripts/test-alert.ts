/**
 * Fire a single stall-alert email at a chosen recipient. Used to verify
 * the Resend pipeline (alerts@jvwithniche.com → recipient) without having
 * to wait for a real submission to stall.
 *
 *   ALERT_TO=rashad@nichedata.ai npm run alert:test
 */

import { sendDevAlert } from "@/lib/email/resend";
import { stalledDraftEmail } from "@/lib/email/templates";
import type { Submission } from "@/db/schema";

async function main() {
  const to = process.env.ALERT_TO ?? "rashad@nichedata.ai";

  const fakeSubmission = {
    id: "00000000-0000-0000-0000-000000000000",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActivityAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    status: "awaiting_signature",
    formData: {},
    submitterEmail: to,
    submitterPhoneE164: "+18165551234",
    propertyStreet: "123 Test Street",
    propertyCity: "Tampa",
    propertyState: "FL",
    dealType: "Foreclosure",
    esignProvider: "pandadoc",
    esignDocumentId: null,
    signedPdfUrl: null,
    signedAt: null,
    stalledAlertSentAt: null,
    crmOpportunityId: null,
    crmSyncedAt: null,
    whatsappGroupCreated: false,
    whatsappGroupId: null,
    whatsappGroupInviteLink: null,
    returnLinkToken: "test-token-not-real",
    draftSessionToken: null,
    submitterIp: null,
    submitterUserAgent: null,
  } as unknown as Submission;

  const { subject, html, text } = stalledDraftEmail(fakeSubmission);
  // Override the subject so it's obvious in your inbox this is the
  // pipeline test, not a real alert.
  const result = await sendDevAlert({
    to,
    subject: `[TEST] ${subject}`,
    html,
    text,
  });

  console.log("From:", process.env.DEV_ALERT_FROM ?? "(default)");
  console.log("To:  ", to);
  console.log("Result:", JSON.stringify(result, null, 2));

  if (!result.sent) {
    process.exit(1);
  }
}

void main();
