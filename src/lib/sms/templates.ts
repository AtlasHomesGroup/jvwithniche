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

function setterFullName(s: Submission): string {
  const fd = (s.formData as { firstName?: unknown; lastName?: unknown } | null) ?? {};
  const fn = typeof fd.firstName === "string" ? fd.firstName.trim() : "";
  const ln = typeof fd.lastName === "string" ? fd.lastName.trim() : "";
  return [fn, ln].filter(Boolean).join(" ") || "(no name)";
}

function setterPhone(s: Submission): string {
  const fd = (s.formData as { phoneE164?: unknown } | null) ?? {};
  return typeof fd.phoneE164 === "string" ? fd.phoneE164 : "";
}

function adminLink(s: Submission): string {
  return `${siteUrl()}/admin/submissions/${s.id}`;
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
 * Acknowledgement SMS sent to the setter the moment they're identifiable
 * on the form (firstName + phone captured). Confirms we received the
 * start and points them back to finish + sign.
 */
export function submitterFormStartedSms(s: Submission): string {
  const fn = firstName(s);
  const property = shortProperty(s);
  return [
    `Hi ${fn} — we received your JV submission for ${property}.`,
    `Continue / sign the agreement at ${siteUrl()}/sign/${s.id}.`,
    `Booking link unlocks after signing.`,
    `Reply STOP to opt out.`,
  ].join(" ");
}

/**
 * Ops alert sent to OPS_NOTIFY_SMS the moment a setter is identifiable.
 * Carries name + phone + property so Rashad/Michael can react fast.
 */
export function opsFormStartedSms(s: Submission): string {
  const phone = setterPhone(s);
  return [
    `JV form STARTED:`,
    `${setterFullName(s)} (${phone || "no phone"})`,
    `for ${shortProperty(s) || "(no property yet)"}.`,
    `Admin: ${adminLink(s)}`,
  ].join(" ");
}

/**
 * Ops alert when a setter's draft has been sitting in awaiting-signature
 * past STALLED_ALERT_THRESHOLD_MINUTES (5 min default). Symmetric
 * counterpart to submitterPleaseSignSms.
 */
export function opsStalledSms(s: Submission): string {
  return [
    `JV STALLED at signature:`,
    `${setterFullName(s)} (${setterPhone(s) || s.submitterPhoneE164 || "no phone"})`,
    `for ${shortProperty(s)}.`,
    `Admin: ${adminLink(s)}`,
  ].join(" ");
}

/**
 * Ops alert when a known setter (matched by phone) submits a NEW deal
 * after having previously signed. Their prior contract is reused, so
 * no Pandadoc round-trip needed and Michael doesn't have to counter-sign.
 */
export function opsReturningSetterSms(s: Submission): string {
  return [
    `JV RETURNING setter — new deal, contract reused:`,
    `${setterFullName(s)} for ${shortProperty(s)}.`,
    `Admin: ${adminLink(s)}`,
  ].join(" ");
}

/**
 * Ops alert when the setter just finished signing — Michael's cue to
 * counter-sign in PandaDoc. Includes admin link with one-tap access.
 */
export function opsSignedSms(s: Submission): string {
  return [
    `JV SIGNED by setter — Michael needs to counter-sign:`,
    `${setterFullName(s)} for ${shortProperty(s)}.`,
    `PandaDoc + admin: ${adminLink(s)}`,
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
