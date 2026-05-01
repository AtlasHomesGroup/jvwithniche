import {
  createGroup,
  getGroupInviteLink,
  isConfigured,
  normalizePhone,
  sendDocument,
  sendTextMessage,
  setGroupIcon,
} from "./client";
import type { Submission } from "@/db/schema";
import { formatSubmissionForWhatsapp } from "@/lib/submission-view";

/**
 * Resolve the WhatsApp number that ops-notification messages should land
 * on. Defaults to the bound channel number, so messages appear in the
 * bot's own "Message yourself" chat on the paired device. Override with
 * WHAPI_NOTIFY_PHONE_E164 to send to a different number.
 */
function notifyTargetPhone(): string {
  const explicit = process.env.WHAPI_NOTIFY_PHONE_E164?.trim();
  if (explicit) return explicit;
  const bound = process.env.WHAPI_BOUND_PHONE_E164?.trim();
  if (bound) return bound;
  throw new Error(
    "No notify target — set WHAPI_NOTIFY_PHONE_E164 or WHAPI_BOUND_PHONE_E164",
  );
}

const DEFAULT_GROUP_ICON_URL =
  "https://ik.imagekit.io/ldqszfymv/Niche%20Mastermind/niche-icon.png";

function groupIconUrl(): string {
  return process.env.WHAPI_GROUP_ICON_URL?.trim() || DEFAULT_GROUP_ICON_URL;
}

const TEAM_ENV_KEYS = [
  "NICHE_WHATSAPP_TEAM_1",
  "NICHE_WHATSAPP_TEAM_2",
  "NICHE_WHATSAPP_TEAM_3",
  "NICHE_WHATSAPP_TEAM_4",
] as const;

export interface SubmissionGroupResult {
  groupId: string;
  inviteLink: string | null;
  participants: string[];
}

/** Phone numbers, in E.164 format, of every team member configured via env. */
export function nicheTeamNumbers(): string[] {
  return TEAM_ENV_KEYS.map((k) => process.env[k]?.trim())
    .filter((v): v is string => !!v && v.length > 0);
}

export function buildGroupName(
  s: Pick<Submission, "propertyStreet" | "propertyCity" | "propertyState">,
): string {
  const parts = [
    s.propertyStreet?.trim() || "Property TBD",
    s.propertyCity?.trim(),
    s.propertyState?.trim(),
  ].filter(Boolean);
  return `JV with NICHE: ${parts.join(", ")}`;
}

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://jvwithniche.com")
  );
}

export function buildViewLink(submission: Submission): string {
  return `${siteUrl().replace(/\/$/, "")}/view/${submission.returnLinkToken}`;
}

export function buildWelcomeMessage(submission: Submission): string {
  const fd = (submission.formData as { firstName?: unknown } | null) ?? {};
  const firstName =
    typeof fd.firstName === "string" && fd.firstName.trim()
      ? fd.firstName.trim()
      : "there";
  const propertyLine = [
    submission.propertyStreet,
    submission.propertyCity,
    submission.propertyState,
  ]
    .map((v) => (v ?? "").trim())
    .filter(Boolean)
    .join(", ") || "your submission";

  const summary = formatSubmissionForWhatsapp(submission);

  return [
    `Hi ${firstName}! Thanks for submitting *${propertyLine}* for JV with Niche. Michael and our acquisitions team are reviewing your submission and will jump in here shortly to discuss next steps.`,
    "",
    "_Here's what we have on file so far:_",
    "",
    summary,
  ].join("\n");
}

/** Standalone WhatsApp message containing just the view link - sent as
 *  its own message so WhatsApp renders it as a clickable URL card. */
export function buildViewLinkMessage(submission: Submission): string {
  const link = buildViewLink(submission);
  return [
    `🔗 Your JV submission portal:`,
    link,
    "",
    `Use this link to download the signed agreement, add notes, or upload supporting documents at any time. Bookmark it - it's private to you.`,
  ].join("\n");
}

/**
 * Orchestrate the WhatsApp group creation for one submission. Throws on
 * any failure - caller decides whether to swallow + alert (the webhook
 * handler does this) or surface to the user.
 */
export async function createSubmissionGroup(
  submission: Submission,
): Promise<SubmissionGroupResult> {
  if (!isConfigured()) {
    throw new Error("WHAPI_API_KEY is not configured");
  }

  const submitterPhone = submission.submitterPhoneE164;
  if (!submitterPhone) {
    throw new Error(
      `Submission ${submission.id} has no submitter_phone_e164 - cannot create WhatsApp group`,
    );
  }

  const teamNumbers = nicheTeamNumbers();
  if (teamNumbers.length === 0) {
    throw new Error(
      "No NICHE_WHATSAPP_TEAM_* env vars are set - cannot populate the group",
    );
  }

  // Spec: 5-person group = 4 fixed Niche team + 1 submitter. Whapi
  // automatically adds the bound number (the Niche Ops account) as the
  // group creator/admin, so we don't include WHAPI_BOUND_PHONE_E164 in
  // the participants list (would be a duplicate).
  const participants = [...teamNumbers, submitterPhone].map(normalizePhone);

  const subject = buildGroupName(submission);

  // Step 1 - create the group with all members
  const created = await createGroup({ subject, participants });
  const groupId = created.id;

  // Step 2 - set the Niche logo as the group picture (best-effort).
  try {
    await setGroupIcon(groupId, groupIconUrl());
  } catch (err) {
    console.warn(
      "[whatsapp] group icon set failed (non-fatal)",
      JSON.stringify({
        groupId,
        message: err instanceof Error ? err.message : String(err),
      }),
    );
  }

  // Step 3 - post the welcome message (full form summary, no URL).
  const welcome = buildWelcomeMessage(submission);
  try {
    await sendTextMessage({ to: groupId, body: welcome });
  } catch (err) {
    console.warn(
      "[whatsapp] welcome message send failed (group still created)",
      JSON.stringify({
        groupId,
        message: err instanceof Error ? err.message : String(err),
      }),
    );
  }

  // Step 4 - send the view link as its own message so WhatsApp renders it
  // as a clickable URL card.
  try {
    await sendTextMessage({
      to: groupId,
      body: buildViewLinkMessage(submission),
    });
  } catch (err) {
    console.warn(
      "[whatsapp] view-link message send failed (non-fatal)",
      JSON.stringify({
        groupId,
        message: err instanceof Error ? err.message : String(err),
      }),
    );
  }

  // Step 5 - attach the signed JV agreement PDF (best-effort). The Whapi
  // server fetches the file from our /api/pdf/[token] proxy, which in turn
  // reads from the private Vercel Blob.
  if (submission.signedPdfUrl) {
    const pdfUrl = `${siteUrl().replace(/\/$/, "")}/api/pdf/${submission.returnLinkToken}`;
    const filename = buildPdfFilename(submission);
    try {
      await sendDocument({
        to: groupId,
        mediaUrl: pdfUrl,
        filename,
        caption: "Signed JV agreement",
      });
    } catch (err) {
      console.warn(
        "[whatsapp] PDF attachment send failed (non-fatal)",
        JSON.stringify({
          groupId,
          submissionId: submission.id,
          message: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }

  // Step 6 - try to fetch the invite link (best-effort)
  let inviteLink: string | null = null;
  try {
    const inv = await getGroupInviteLink(groupId);
    inviteLink = inv.invite_link ?? inv.link ?? null;
    if (!inviteLink && inv.invite_code) {
      inviteLink = `https://chat.whatsapp.com/${inv.invite_code}`;
    }
  } catch (err) {
    console.warn(
      "[whatsapp] invite link fetch failed (non-fatal)",
      JSON.stringify({
        groupId,
        message: err instanceof Error ? err.message : String(err),
      }),
    );
  }

  return { groupId, inviteLink, participants };
}

function buildOperatorPreamble(s: Submission): string {
  const team = nicheTeamNumbers();
  const submitter = s.submitterPhoneE164;
  const members = [...team, ...(submitter ? [submitter] : [])];

  const fd =
    (s.formData as { firstName?: unknown; lastName?: unknown } | null) ?? {};
  const fn = typeof fd.firstName === "string" ? fd.firstName.trim() : "";
  const ln = typeof fd.lastName === "string" ? fd.lastName.trim() : "";
  const partner = [fn, ln].filter(Boolean).join(" ") || "JV partner";

  const property =
    [s.propertyStreet, s.propertyCity, s.propertyState]
      .map((v) => v?.trim())
      .filter(Boolean)
      .join(", ") || "(unknown)";

  return [
    "🟢 *New JV signed — create the group manually on WhatsApp*",
    "",
    `*Property:* ${property}`,
    `*Signed by:* ${partner}`,
    "",
    `*Group name (copy/paste):*`,
    buildGroupName(s),
    "",
    "*Members to add:*",
    ...members.map((n) => `• ${n}`),
    "",
    "_Once the group exists, forward the next two messages and the signed PDF below into it._",
  ].join("\n");
}

/**
 * Operator-notification flow used after a JV agreement is signed. Sends
 * the same content the auto-group-create flow would have posted (welcome
 * + view link + signed PDF) to a single WhatsApp chat, plus a preamble
 * with the suggested group name and member list. The operator then
 * creates the group manually on their phone and forwards the messages in.
 *
 * Throws on the first send failure - caller decides whether to swallow +
 * dev-alert (the webhook handler does this).
 */
export async function notifyOperatorOfSignedSubmission(
  s: Submission,
): Promise<void> {
  if (!isConfigured()) {
    throw new Error("WHAPI_API_KEY is not configured");
  }
  const to = normalizePhone(notifyTargetPhone());

  await sendTextMessage({ to, body: buildOperatorPreamble(s) });
  await sendTextMessage({ to, body: buildWelcomeMessage(s) });
  await sendTextMessage({ to, body: buildViewLinkMessage(s) });

  if (s.signedPdfUrl) {
    const pdfUrl = `${siteUrl().replace(/\/$/, "")}/api/pdf/${s.returnLinkToken}`;
    await sendDocument({
      to,
      mediaUrl: pdfUrl,
      filename: buildPdfFilename(s),
      caption: "Signed JV agreement",
    });
  }
}

function buildPdfFilename(s: Submission): string {
  const slug = [s.propertyStreet, s.propertyCity, s.propertyState]
    .map((v) => (v ?? "").trim())
    .filter(Boolean)
    .join("-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(0, 80);
  return slug ? `JV-Agreement-${slug}.pdf` : `JV-Agreement-${s.id}.pdf`;
}
