import type { Submission } from "@/db/schema";
import { buildCalendlyUrl } from "@/lib/calendly/url";

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://jvwithniche.com")
  );
}

function firstName(s: Submission): string {
  const fd = s.formData as { firstName?: unknown } | null;
  if (typeof fd?.firstName === "string" && fd.firstName.trim()) {
    return fd.firstName.trim();
  }
  return "there";
}

function shortProperty(s: Submission): string {
  // Just street + city to keep the SMS short.
  return [s.propertyStreet, s.propertyCity]
    .map((v) => v?.trim())
    .filter(Boolean)
    .join(", ") || "your submission";
}

/**
 * Stalled-signing nudge sent alongside the email when the JV setter
 * hasn't signed within STALLED_ALERT_THRESHOLD_MINUTES (currently 5min).
 */
export function submitterPleaseSignSms(s: Submission): string {
  const signLink = `${siteUrl()}/sign/${s.id}`;
  return [
    `Hi ${firstName(s)} — your JV agreement for ${shortProperty(s)} is waiting on your signature: ${signLink}`,
    `Booking link unlocks after signing.`,
    `Reply STOP to opt out.`,
  ].join(" ");
}

/**
 * Confirmation SMS sent the moment the setter finishes signing the
 * PandaDoc agreement. Carries the Calendly link (prefilled) and the
 * private JV portal link.
 */
export function submitterSignedSms(s: Submission): string {
  const calendlyUrl = buildCalendlyUrl(s);
  const viewLink = `${siteUrl()}/view/${s.returnLinkToken}`;
  const calendlyLine = calendlyUrl
    ? `Book your kickoff call: ${calendlyUrl}.`
    : `We'll send a calendar link shortly.`;
  return [
    `Hi ${firstName(s)} — JV agreement signed ✓.`,
    calendlyLine,
    `Your portal: ${viewLink}.`,
    `Reply STOP to opt out.`,
  ].join(" ");
}
