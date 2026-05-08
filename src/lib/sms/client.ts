import twilio from "twilio";

import type { Twilio } from "twilio";

let client: Twilio | null = null;

function getClient(): Twilio | null {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  if (!client) client = twilio(sid, token);
  return client;
}

export function isConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      (process.env.TWILIO_MESSAGING_SERVICE_SID ||
        process.env.TWILIO_FROM_NUMBER),
  );
}

/** Comma-separated E.164 list of ops phone numbers. Used to fan out
 *  SMS to internal recipients (Rashad + Michael). */
export function opsSmsNumbers(): string[] {
  const raw = process.env.OPS_NOTIFY_SMS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Send the same SMS body to every number configured in OPS_NOTIFY_SMS.
 * Returns one result per recipient. Empty array if no ops numbers
 * are configured (silent no-op).
 */
export async function sendOpsSms(
  body: string,
): Promise<Array<{ to: string; sent: boolean; sid?: string; reason?: string }>> {
  const targets = opsSmsNumbers();
  if (targets.length === 0) return [];
  const results = await Promise.all(
    targets.map(async (to) => {
      const r = await sendSms({ to, body });
      return { to, ...r };
    }),
  );
  return results;
}

/**
 * Send a single SMS. Prefers TWILIO_MESSAGING_SERVICE_SID (which routes
 * through the 10DLC-registered campaign and pools senders) and falls
 * back to TWILIO_FROM_NUMBER when only a bare number is configured.
 *
 * Returns `{ sent: false, reason }` on every failure path so callers
 * can fan out without unhandled exceptions.
 */
export async function sendSms({
  to,
  body,
}: {
  to: string;
  body: string;
}): Promise<{ sent: boolean; sid?: string; reason?: string }> {
  const tw = getClient();
  if (!tw) return { sent: false, reason: "twilio_not_configured" };

  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  if (!messagingServiceSid && !fromNumber) {
    return { sent: false, reason: "no_sender_configured" };
  }

  try {
    const msg = await tw.messages.create({
      to,
      body,
      ...(messagingServiceSid
        ? { messagingServiceSid }
        : { from: fromNumber }),
    });
    return { sent: true, sid: msg.sid };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[sms] send failed", { to, message });
    return { sent: false, reason: message };
  }
}
