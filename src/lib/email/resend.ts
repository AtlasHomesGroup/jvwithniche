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
  const resend = getClient();
  if (!resend) return { sent: false, reason: "resend_not_configured" };

  const recipient = to ?? process.env.DEV_ALERT_TO;
  if (!recipient) return { sent: false, reason: "no_recipient" };

  try {
    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to: recipient,
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
