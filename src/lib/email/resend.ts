import { Resend } from "resend";

let client: Resend | null = null;

function getClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

const DEFAULT_FROM =
  process.env.DEV_ALERT_FROM ??
  "Niche JV Alerts <alerts@jvwithniche.com>";

async function sendOne({
  to,
  subject,
  html,
  text,
}: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<{ sent: boolean; id?: string; reason?: string }> {
  const resend = getClient();
  if (!resend) return { sent: false, reason: "resend_not_configured" };
  try {
    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to,
      subject,
      html,
      text,
    });
    if (error) {
      console.error("[email] resend error", error);
      return { sent: false, reason: error.message };
    }
    return { sent: true, id: data?.id };
  } catch (err) {
    console.error("[email] exception", err);
    return {
      sent: false,
      reason: err instanceof Error ? err.message : "unknown",
    };
  }
}

/** Tech failure alerts (Whapi/CRM/etc.) → DEV_ALERT_TO. */
export async function sendDevAlert({
  to,
  subject,
  html,
  text,
}: {
  to?: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ sent: boolean; id?: string; reason?: string }> {
  const recipient = to ?? process.env.DEV_ALERT_TO;
  if (!recipient) return { sent: false, reason: "no_recipient" };
  return sendOne({ to: recipient, subject, html, text });
}

/** Business event notifications (form submitted, signed, stalled) →
 *  OPS_NOTIFY_EMAIL (comma-separated for multiple recipients) with
 *  DEV_ALERT_TO as fallback. */
export async function sendOpsAlert({
  subject,
  html,
  text,
}: {
  subject: string;
  html: string;
  text?: string;
}): Promise<{ sent: boolean; id?: string; reason?: string }> {
  const raw =
    process.env.OPS_NOTIFY_EMAIL ?? process.env.DEV_ALERT_TO;
  if (!raw) return { sent: false, reason: "no_recipient" };
  const recipients = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (recipients.length === 0) return { sent: false, reason: "no_recipient" };
  // Resend's `to` accepts a string array - one email is sent with all
  // recipients in the To header.
  return sendOne({
    to: recipients.length === 1 ? recipients[0] : recipients,
    subject,
    html,
    text,
  });
}

/** Customer-facing email (always to an explicit recipient). */
export async function sendCustomerEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ sent: boolean; id?: string; reason?: string }> {
  return sendOne({ to, subject, html, text });
}
