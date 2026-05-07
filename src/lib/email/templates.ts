import type { Submission } from "@/db/schema";
import { buildCalendlyUrl } from "@/lib/calendly/url";

const NICHE_NAVY = "#1b3a5c";
const NICHE_ORANGE = "#e8640a";
const NICHE_TEXT = "#2d2d2d";
const NICHE_MUTED = "#666666";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function propertyLine(s: Pick<Submission,
  "propertyStreet" | "propertyCity" | "propertyState">): string {
  return [s.propertyStreet, s.propertyCity, s.propertyState]
    .filter(Boolean)
    .join(", ") || "(no property yet)";
}

function shell(bodyHtml: string, preheader: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JV With Niche</title></head>
<body style="margin:0;padding:0;background:#faf5f0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Inter,sans-serif;color:${NICHE_TEXT};">
<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</div>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf5f0;padding:24px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid rgba(27,58,92,0.08);border-radius:12px;overflow:hidden;">
      <tr><td style="padding:20px 24px;border-bottom:1px solid rgba(27,58,92,0.08);">
        <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:${NICHE_ORANGE};text-transform:uppercase;">JV With Niche · Dev alert</div>
      </td></tr>
      <tr><td style="padding:24px;">${bodyHtml}</td></tr>
      <tr><td style="padding:16px 24px;border-top:1px solid rgba(27,58,92,0.08);background:#faf5f0;font-size:11px;color:${NICHE_MUTED};">
        Automated alert from jvwithniche.com · configure recipients via DEV_ALERT_TO in Vercel
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function row(label: string, value: string): string {
  const safe = escapeHtml(value || "-");
  return `<tr><td style="padding:6px 0;vertical-align:top;width:140px;color:${NICHE_MUTED};font-size:13px;">${escapeHtml(label)}</td>
<td style="padding:6px 0;color:${NICHE_TEXT};font-size:13px;">${safe}</td></tr>`;
}

export function stalledDraftEmail(s: Submission): {
  subject: string;
  html: string;
  text: string;
} {
  const setter = [
    "A submitter signed-in but hasn't finished signing the JV agreement yet.",
    "They've been idle for more than two hours since submitting the form.",
  ].join(" ");

  const subject = `[JV] Stalled at signature · ${propertyLine(s)}`;
  const adminLink = `${siteUrl()}/admin/submissions/${s.id}`;

  const html = shell(
    `<h1 style="margin:0 0 8px;color:${NICHE_NAVY};font-size:20px;font-weight:600;">Draft stalled at signature</h1>
<p style="margin:0 0 16px;color:${NICHE_MUTED};font-size:14px;line-height:1.5;">${escapeHtml(setter)}</p>
<table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
${row("Submitted", new Date(s.createdAt).toLocaleString())}
${row("Setter email", s.submitterEmail ?? "")}
${row("Setter phone", s.submitterPhoneE164 ?? "")}
${row("Property", propertyLine(s))}
${row("Deal type", s.dealType ?? "")}
${row("Submission id", s.id)}
</table>
<div style="margin-top:20px;">
  <a href="${escapeHtml(adminLink)}" style="display:inline-block;padding:10px 18px;background:${NICHE_NAVY};color:#ffffff;text-decoration:none;border-radius:999px;font-size:13px;font-weight:600;">
    Open in admin view
  </a>
</div>`,
    `Draft stalled: ${propertyLine(s)} - ${s.submitterEmail ?? "no email"}`,
  );

  const text = [
    "Draft stalled at signature",
    "",
    `Submitted: ${new Date(s.createdAt).toISOString()}`,
    `Setter email: ${s.submitterEmail ?? "-"}`,
    `Setter phone: ${s.submitterPhoneE164 ?? "-"}`,
    `Property: ${propertyLine(s)}`,
    `Deal type: ${s.dealType ?? "-"}`,
    `Submission id: ${s.id}`,
    "",
    `Admin: ${adminLink}`,
  ].join("\n");

  return { subject, html, text };
}

export function whatsappGroupFailedEmail(
  s: Submission,
  err: { kind: string; message?: string; status?: number; body?: string },
): { subject: string; html: string; text: string } {
  const subject = `[JV] WhatsApp group creation FAILED · ${propertyLine(s)}`;
  const adminLink = `${siteUrl()}/admin/submissions/${s.id}`;
  const errorLine =
    err.kind === "WhapiApiError"
      ? `Whapi ${err.status ?? "?"}: ${(err.body ?? "").slice(0, 240)}`
      : `${err.kind}${err.message ? `: ${err.message}` : ""}`;

  const html = shell(
    `<h1 style="margin:0 0 8px;color:${NICHE_NAVY};font-size:20px;font-weight:600;">WhatsApp group could not be created</h1>
<p style="margin:0 0 16px;color:${NICHE_MUTED};font-size:14px;line-height:1.5;">
The submission below was signed and archived successfully, but WhatsApp group auto-creation failed. Most common cause: the JV partner's phone number is not on WhatsApp. Reach out via SMS, email, or phone instead.
</p>
<table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
${row("Setter name", extractFullName(s))}
${row("Setter email", s.submitterEmail ?? "")}
${row("Setter phone", s.submitterPhoneE164 ?? "")}
${row("Property", propertyLine(s))}
${row("Deal type", s.dealType ?? "")}
${row("Submission id", s.id)}
${row("Error", errorLine)}
</table>
<div style="margin-top:20px;">
  <a href="${escapeHtml(adminLink)}" style="display:inline-block;padding:10px 18px;background:${NICHE_NAVY};color:#ffffff;text-decoration:none;border-radius:999px;font-size:13px;font-weight:600;">
    Open in admin view
  </a>
</div>`,
    `WhatsApp group failed for ${propertyLine(s)} - please reach out manually.`,
  );

  const text = [
    "WhatsApp group could not be created",
    "",
    "The submission below was signed and archived, but WhatsApp group auto-creation failed.",
    "Reach out via SMS, email, or phone instead.",
    "",
    `Setter name: ${extractFullName(s)}`,
    `Setter email: ${s.submitterEmail ?? "-"}`,
    `Setter phone: ${s.submitterPhoneE164 ?? "-"}`,
    `Property: ${propertyLine(s)}`,
    `Deal type: ${s.dealType ?? "-"}`,
    `Submission id: ${s.id}`,
    `Error: ${errorLine}`,
    "",
    `Admin: ${adminLink}`,
  ].join("\n");

  return { subject, html, text };
}

export function whatsappNotifyFailedEmail(
  s: Submission,
  err: { kind: string; message?: string; status?: number; body?: string },
): { subject: string; html: string; text: string } {
  const subject = `[JV] WhatsApp signing notification FAILED · ${propertyLine(s)}`;
  const adminLink = `${siteUrl()}/admin/submissions/${s.id}`;
  const errorLine =
    err.kind === "WhapiApiError"
      ? `Whapi ${err.status ?? "?"}: ${(err.body ?? "").slice(0, 240)}`
      : `${err.kind}${err.message ? `: ${err.message}` : ""}`;

  const html = shell(
    `<h1 style="margin:0 0 8px;color:${NICHE_NAVY};font-size:20px;font-weight:600;">WhatsApp signing notification could not be sent</h1>
<p style="margin:0 0 16px;color:${NICHE_MUTED};font-size:14px;line-height:1.5;">
The submission below was signed and archived successfully, but the WhatsApp ops-notification message failed to send. Open the admin view to resend it manually, or fall back to SMS / phone outreach.
</p>
<table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
${row("Setter name", extractFullName(s))}
${row("Setter email", s.submitterEmail ?? "")}
${row("Setter phone", s.submitterPhoneE164 ?? "")}
${row("Property", propertyLine(s))}
${row("Deal type", s.dealType ?? "")}
${row("Submission id", s.id)}
${row("Error", errorLine)}
</table>
<div style="margin-top:20px;">
  <a href="${escapeHtml(adminLink)}" style="display:inline-block;padding:10px 18px;background:${NICHE_NAVY};color:#ffffff;text-decoration:none;border-radius:999px;font-size:13px;font-weight:600;">
    Open in admin view
  </a>
</div>`,
    `WhatsApp notify failed for ${propertyLine(s)} - check admin view.`,
  );

  const text = [
    "WhatsApp signing notification could not be sent",
    "",
    "The submission below was signed and archived, but the WhatsApp ops-notification failed.",
    "Open the admin view to resend manually.",
    "",
    `Setter name: ${extractFullName(s)}`,
    `Setter email: ${s.submitterEmail ?? "-"}`,
    `Setter phone: ${s.submitterPhoneE164 ?? "-"}`,
    `Property: ${propertyLine(s)}`,
    `Deal type: ${s.dealType ?? "-"}`,
    `Submission id: ${s.id}`,
    `Error: ${errorLine}`,
    "",
    `Admin: ${adminLink}`,
  ].join("\n");

  return { subject, html, text };
}

function extractFullName(s: Submission): string {
  const fd = s.formData as { firstName?: unknown; lastName?: unknown } | null;
  const first = typeof fd?.firstName === "string" ? fd.firstName : "";
  const last = typeof fd?.lastName === "string" ? fd.lastName : "";
  return [first, last].filter(Boolean).join(" ") || "-";
}

export function crmPushFailedEmail(
  s: Submission,
  err: {
    kind: string;
    message?: string;
    status?: number;
    body?: string;
    attempt: number;
    permanent?: boolean;
  },
): { subject: string; html: string; text: string } {
  const subject = err.permanent
    ? `[JV] CRM push FAILED permanently · ${propertyLine(s)}`
    : `[JV] CRM push failed (will retry) · ${propertyLine(s)}`;
  const adminLink = `${siteUrl()}/admin/submissions/${s.id}`;
  const errorLine =
    err.kind === "CrmApiError"
      ? `Salesforce ${err.status ?? "?"}: ${(err.body ?? "").slice(0, 280)}`
      : `${err.kind}${err.message ? `: ${err.message}` : ""}`;
  const retryLine = err.permanent
    ? "Max retries reached - the submission is still at crm_sync_pending. Please push it manually from the admin view once the CRM issue is resolved."
    : `Attempt ${err.attempt} failed; the retry cron (every 5 min) will try again.`;

  const html = shell(
    `<h1 style="margin:0 0 8px;color:${NICHE_NAVY};font-size:20px;font-weight:600;">CRM push ${err.permanent ? "permanently failed" : "failed"}</h1>
<p style="margin:0 0 16px;color:${NICHE_MUTED};font-size:14px;line-height:1.5;">${escapeHtml(retryLine)}</p>
<table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
${row("Setter email", s.submitterEmail ?? "")}
${row("Setter phone", s.submitterPhoneE164 ?? "")}
${row("Property", propertyLine(s))}
${row("Deal type", s.dealType ?? "")}
${row("Submission id", s.id)}
${row("Attempt", String(err.attempt))}
${row("Error", errorLine)}
</table>
<div style="margin-top:20px;">
  <a href="${escapeHtml(adminLink)}" style="display:inline-block;padding:10px 18px;background:${NICHE_NAVY};color:#ffffff;text-decoration:none;border-radius:999px;font-size:13px;font-weight:600;">
    Open in admin view
  </a>
</div>`,
    err.permanent
      ? `CRM push permanently failed for ${propertyLine(s)} after ${err.attempt} attempts.`
      : `CRM push failed for ${propertyLine(s)} - retrying automatically.`,
  );

  const text = [
    `CRM push ${err.permanent ? "permanently failed" : "failed"}`,
    "",
    retryLine,
    "",
    `Setter email: ${s.submitterEmail ?? "-"}`,
    `Setter phone: ${s.submitterPhoneE164 ?? "-"}`,
    `Property: ${propertyLine(s)}`,
    `Deal type: ${s.dealType ?? "-"}`,
    `Submission id: ${s.id}`,
    `Attempt: ${err.attempt}`,
    `Error: ${errorLine}`,
    "",
    `Admin: ${adminLink}`,
  ].join("\n");

  return { subject, html, text };
}

export function autoDeletedDigestEmail(rows: Submission[]): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `[JV] ${rows.length} draft${rows.length === 1 ? "" : "s"} auto-deleted after 7 days`;

  const tableRows = rows
    .map(
      (r) => `<tr>
<td style="padding:8px 10px;border-top:1px solid rgba(27,58,92,0.08);font-size:12px;color:${NICHE_TEXT};">${escapeHtml(r.submitterEmail ?? "-")}</td>
<td style="padding:8px 10px;border-top:1px solid rgba(27,58,92,0.08);font-size:12px;color:${NICHE_TEXT};">${escapeHtml(propertyLine(r))}</td>
<td style="padding:8px 10px;border-top:1px solid rgba(27,58,92,0.08);font-size:12px;color:${NICHE_MUTED};">${escapeHtml(r.status)}</td>
<td style="padding:8px 10px;border-top:1px solid rgba(27,58,92,0.08);font-size:12px;color:${NICHE_MUTED};">${escapeHtml(new Date(r.createdAt).toISOString().slice(0, 10))}</td>
</tr>`,
    )
    .join("");

  const html = shell(
    `<h1 style="margin:0 0 8px;color:${NICHE_NAVY};font-size:20px;font-weight:600;">Auto-deleted draft digest</h1>
<p style="margin:0 0 16px;color:${NICHE_MUTED};font-size:14px;line-height:1.5;">
These drafts were inactive for more than seven days and have been removed from the portal per the retention policy.
</p>
<table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;border-top:1px solid rgba(27,58,92,0.08);">
<thead>
<tr>
<th align="left" style="padding:8px 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${NICHE_MUTED};">Setter</th>
<th align="left" style="padding:8px 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${NICHE_MUTED};">Property</th>
<th align="left" style="padding:8px 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${NICHE_MUTED};">Status</th>
<th align="left" style="padding:8px 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${NICHE_MUTED};">Created</th>
</tr>
</thead>
<tbody>${tableRows}</tbody>
</table>`,
    `${rows.length} drafts auto-deleted.`,
  );

  const text = [
    `${rows.length} drafts auto-deleted after 7 days:`,
    "",
    ...rows.map(
      (r) =>
        `  ${r.submitterEmail ?? "-"} · ${propertyLine(r)} · ${r.status} · created ${new Date(r.createdAt).toISOString().slice(0, 10)}`,
    ),
  ].join("\n");

  return { subject, html, text };
}

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://jvwithniche.com")
  );
}

/* ─────────────────────────────────────────────────────────────
   Customer-facing emails (different shell - no "dev alert")
   ───────────────────────────────────────────────────────────── */

function customerShell(bodyHtml: string, preheader: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JV With Niche</title></head>
<body style="margin:0;padding:0;background:#faf5f0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Inter,sans-serif;color:${NICHE_TEXT};">
<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</div>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf5f0;padding:24px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid rgba(27,58,92,0.08);border-radius:12px;overflow:hidden;">
      <tr><td style="padding:20px 24px;border-bottom:1px solid rgba(27,58,92,0.08);">
        <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:${NICHE_ORANGE};text-transform:uppercase;">JV With Niche</div>
      </td></tr>
      <tr><td style="padding:24px;">${bodyHtml}</td></tr>
      <tr><td style="padding:16px 24px;border-top:1px solid rgba(27,58,92,0.08);background:#faf5f0;font-size:11px;color:${NICHE_MUTED};">
        Niche Acquisitions · Kansas City · jvwithniche.com
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function ctaButton(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 22px;background:${NICHE_NAVY};color:#ffffff;text-decoration:none;border-radius:999px;font-size:14px;font-weight:600;">${escapeHtml(label)}</a>`;
}

function firstName(s: Submission): string {
  const fd = s.formData as { firstName?: unknown } | null;
  if (typeof fd?.firstName === "string" && fd.firstName.trim()) {
    return fd.firstName.trim();
  }
  return "there";
}

/**
 * Ops alert sent to OPS_NOTIFY_EMAIL the moment a submission flips to
 * `awaiting_signature` - i.e. the form is in, the PandaDoc contract has
 * been generated and emailed to the JV partner, and we're waiting on
 * their signature.
 */
export function opsContractReadyEmail(s: Submission): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `[JV] Contract sent for signature · ${propertyLine(s)}`;
  const adminLink = `${siteUrl()}/admin/submissions/${s.id}`;

  const html = shell(
    `<h1 style="margin:0 0 8px;color:${NICHE_NAVY};font-size:20px;font-weight:600;">JV partner submitted — awaiting signature</h1>
<p style="margin:0 0 16px;color:${NICHE_MUTED};font-size:14px;line-height:1.5;">
A new JV submission landed and the contract has been generated and sent for signature.
</p>
<table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
${row("Setter", extractFullName(s))}
${row("Setter email", s.submitterEmail ?? "")}
${row("Setter phone", s.submitterPhoneE164 ?? "")}
${row("Property", propertyLine(s))}
${row("Deal type", s.dealType ?? "")}
${row("Submission id", s.id)}
</table>
<div style="margin-top:20px;">
  <a href="${escapeHtml(adminLink)}" style="display:inline-block;padding:10px 18px;background:${NICHE_NAVY};color:#ffffff;text-decoration:none;border-radius:999px;font-size:13px;font-weight:600;">
    Open in admin view
  </a>
</div>`,
    `${propertyLine(s)} - awaiting signature`,
  );

  const text = [
    "JV partner submitted — awaiting signature",
    "",
    `Setter: ${extractFullName(s)}`,
    `Setter email: ${s.submitterEmail ?? "-"}`,
    `Setter phone: ${s.submitterPhoneE164 ?? "-"}`,
    `Property: ${propertyLine(s)}`,
    `Deal type: ${s.dealType ?? "-"}`,
    `Submission id: ${s.id}`,
    "",
    `Admin: ${adminLink}`,
  ].join("\n");

  return { subject, html, text };
}

/**
 * Customer-facing email sent to the submitter when their draft has been
 * sitting in `awaiting_signature` for too long. Nudges them to finish
 * signing the PandaDoc agreement, mentions Calendly comes after.
 */
export function submitterPleaseSignEmail(s: Submission): {
  subject: string;
  html: string;
  text: string;
} {
  const fn = firstName(s);
  const propertyLineText = propertyLine(s);
  const signLink = `${siteUrl()}/sign/${s.id}`;
  const subject = `Action needed: sign your JV agreement for ${propertyLineText}`;

  const html = customerShell(
    `<h1 style="margin:0 0 12px;color:${NICHE_NAVY};font-size:22px;font-weight:600;">Hi ${escapeHtml(fn)} — your JV agreement is waiting</h1>
<p style="margin:0 0 14px;color:${NICHE_TEXT};font-size:15px;line-height:1.55;">
We received your submission for <strong>${escapeHtml(propertyLineText)}</strong>. Thanks for sending it over!
</p>
<p style="margin:0 0 14px;color:${NICHE_TEXT};font-size:15px;line-height:1.55;">
We can't start working with you until the JV agreement is signed. It's already in your inbox via PandaDoc — clicking the button below opens the same document on our portal so you can finish signing in 2-3 clicks.
</p>
<div style="margin:22px 0;">${ctaButton(signLink, "Sign the JV agreement")}</div>
<p style="margin:0 0 14px;color:${NICHE_MUTED};font-size:14px;line-height:1.55;">
Once you sign, you'll unlock a <strong>Calendly link to book a kickoff call</strong> with our closer — your name, email, and property are pre-filled so it's just a 30-second pick-a-time.
</p>
<p style="margin:18px 0 0;color:${NICHE_MUTED};font-size:13px;">
If the button doesn't work, copy and paste this into your browser:<br/>
<span style="color:${NICHE_NAVY};word-break:break-all;">${escapeHtml(signLink)}</span>
</p>`,
    `Sign your JV agreement for ${propertyLineText}`,
  );

  const text = [
    `Hi ${fn} — your JV agreement is waiting`,
    "",
    `We received your submission for ${propertyLineText}.`,
    "We can't start working with you until the JV agreement is signed.",
    "Sign here:",
    signLink,
    "",
    "Once you sign you'll unlock a Calendly link to book a kickoff call with our closer.",
  ].join("\n");

  return { subject, html, text };
}

/**
 * Customer-facing thank-you email sent the moment the JV partner finishes
 * signing. Surfaces their private portal link and the prefilled Calendly
 * URL.
 */
export function submitterSignedEmail(s: Submission): {
  subject: string;
  html: string;
  text: string;
} | null {
  if (!s.submitterEmail) return null;

  const fn = firstName(s);
  const propertyLineText = propertyLine(s);
  const viewLink = `${siteUrl()}/view/${s.returnLinkToken}`;
  const calendlyUrl = buildCalendlyUrl(s);
  const subject = `Signed — your next step for ${propertyLineText}`;

  const calendlyBlock = calendlyUrl
    ? `<p style="margin:0 0 14px;color:${NICHE_TEXT};font-size:15px;line-height:1.55;">
Pick a 30-minute slot with our closer to walk through the deal. Your name, email, and property are pre-filled — just choose a time that works.
</p>
<div style="margin:18px 0;">${ctaButton(calendlyUrl, "Book your kickoff call")}</div>`
    : "";

  const html = customerShell(
    `<h1 style="margin:0 0 12px;color:${NICHE_NAVY};font-size:22px;font-weight:600;">Hi ${escapeHtml(fn)} — agreement signed ✓</h1>
<p style="margin:0 0 14px;color:${NICHE_TEXT};font-size:15px;line-height:1.55;">
Thanks for signing the JV agreement for <strong>${escapeHtml(propertyLineText)}</strong>. Michael Franke at Niche Acquisitions will counter-sign within 1-2 business days; you'll get the executed PDF by email the moment he does.
</p>
<h2 style="margin:22px 0 8px;color:${NICHE_NAVY};font-size:16px;font-weight:600;">Two things for you</h2>
<p style="margin:0 0 6px;color:${NICHE_TEXT};font-size:15px;font-weight:600;">1. Book your kickoff call</p>
${calendlyBlock || `<p style="margin:0 0 14px;color:${NICHE_MUTED};font-size:14px;line-height:1.55;">We'll follow up with a calendar link shortly.</p>`}
<p style="margin:14px 0 6px;color:${NICHE_TEXT};font-size:15px;font-weight:600;">2. Your private JV portal</p>
<p style="margin:0 0 14px;color:${NICHE_TEXT};font-size:15px;line-height:1.55;">
Bookmark the link below — it's your dashboard for this deal. You can download the signed agreement, leave notes, or upload supporting documents at any time.
</p>
<div style="margin:18px 0;">${ctaButton(viewLink, "Open your JV portal")}</div>
<p style="margin:18px 0 0;color:${NICHE_MUTED};font-size:13px;">
Portal link if the button doesn't work:<br/>
<span style="color:${NICHE_NAVY};word-break:break-all;">${escapeHtml(viewLink)}</span>
</p>`,
    `Signed - book your call and open your JV portal`,
  );

  const text = [
    `Hi ${fn} — your JV agreement is signed.`,
    "",
    `Thanks for signing for ${propertyLineText}. Michael will counter-sign within 1-2 business days.`,
    "",
    "Two things for you:",
    "",
    "1. Book your kickoff call:",
    calendlyUrl ?? "(calendar link coming shortly)",
    "",
    "2. Your private JV portal:",
    viewLink,
  ].join("\n");

  return { subject, html, text };
}
