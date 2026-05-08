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

function pandadocUrl(s: Submission): string | null {
  if (!s.esignDocumentId) return null;
  return `https://app.pandadoc.com/a/#/documents/${s.esignDocumentId}`;
}

function fullProperty(s: Submission): string {
  return [s.propertyStreet, s.propertyCity, s.propertyState]
    .map((v) => v?.trim())
    .filter(Boolean)
    .join(", ") || "(no property)";
}

/**
 * Stalled-draft nudge — the setter filled the whole form but never
 * pressed "Generate my JV agreement". Routes them back to /submit
 * (cookie picks up the draft) so they can press the button.
 */
export function submitterFinishSubmissionSms(s: Submission): string {
  return [
    `Hi ${firstName(s)} — your JV submission for ${shortProperty(s)} is one click away.`,
    ``,
    `Open the form and press the orange "Generate my JV agreement" button: ${siteUrl()}/submit`,
  ].join("\n");
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
 * Acknowledgement SMS sent to the setter the moment they progress past
 * screen 1 of the form. They're still mid-flow at this point — no
 * submission has been made and no contract exists yet — so the copy
 * confirms we're tracking their progress and gives them a resume link
 * in case they bail and come back later.
 */
export function submitterFormStartedSms(s: Submission): string {
  const fn = firstName(s);
  return [
    `Hi ${fn} — thanks for starting your JV submission with Niche Acquisitions. We're saving your progress as you go.`,
    ``,
    `Pick up where you left off here: ${siteUrl()}/submit`,
  ].join("\n");
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
 * counter-sign in PandaDoc. Includes both the admin and the PandaDoc
 * deep link so Michael can jump straight to the document.
 */
export function opsSignedSms(s: Submission): string {
  const lines = [
    `JV signed by setter. Michael needs to counter-sign.`,
    ``,
    setterFullName(s),
    fullProperty(s),
    ``,
    `Admin: ${adminLink(s)}`,
  ];
  const pdUrl = pandadocUrl(s);
  if (pdUrl) {
    lines.push(``);
    lines.push(`PandaDoc: ${pdUrl}`);
  }
  return lines.join("\n");
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
    ? `Book your kickoff call: ${calendlyUrl}`
    : `We'll send a calendar link shortly.`;
  return [
    `Hi ${firstName(s)} — JV agreement signed ✓.`,
    ``,
    calendlyLine,
    ``,
    `Your portal: ${viewLink}`,
  ].join("\n");
}
