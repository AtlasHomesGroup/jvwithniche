import {
  createGroup,
  getGroupInviteLink,
  isConfigured,
  normalizePhone,
  sendDocument,
  sendTextMessage,
} from "./client";
import type { Submission } from "@/db/schema";
import { formatSubmissionForWhatsapp } from "@/lib/submission-view";

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
  const street = s.propertyStreet?.trim() || "Property TBD";
  const city = s.propertyCity?.trim();
  const state = s.propertyState?.trim();
  const tail = [city, state].filter(Boolean).join(" ");
  return tail
    ? `Niche JV — ${street}, ${tail}`
    : `Niche JV — ${street}`;
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
  const link = buildViewLink(submission);

  return [
    `Hi ${firstName}! Thanks for submitting *${propertyLine}* for JV with Niche. Michael and our acquisitions team are reviewing your submission and will jump in here shortly to discuss next steps.`,
    "",
    "_Here's what we have on file so far:_",
    "",
    summary,
    "",
    `📎 Signed JV agreement: ${link}`,
    `🔖 Bookmark this link — it's your private record of the submission and the signed contract.`,
  ].join("\n");
}

/**
 * Orchestrate the WhatsApp group creation for one submission. Throws on
 * any failure — caller decides whether to swallow + alert (the webhook
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
      `Submission ${submission.id} has no submitter_phone_e164 — cannot create WhatsApp group`,
    );
  }

  const teamNumbers = nicheTeamNumbers();
  if (teamNumbers.length === 0) {
    throw new Error(
      "No NICHE_WHATSAPP_TEAM_* env vars are set — cannot populate the group",
    );
  }

  // Spec: 5-person group = 4 fixed Niche team + 1 submitter. Whapi
  // automatically adds the bound number (the Niche Ops account) as the
  // group creator/admin, so we don't include WHAPI_BOUND_PHONE_E164 in
  // the participants list (would be a duplicate).
  const participants = [...teamNumbers, submitterPhone].map(normalizePhone);

  const subject = buildGroupName(submission);

  // Step 1 — create the group with all members
  const created = await createGroup({ subject, participants });
  const groupId = created.id;

  // Step 2 — post the welcome message (full form summary + view link)
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

  // Step 3 — attach the signed JV agreement PDF (best-effort). The Whapi
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

  // Step 4 — try to fetch the invite link (best-effort)
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

function buildPdfFilename(s: Submission): string {
  const slug = [s.propertyStreet, s.propertyCity, s.propertyState]
    .map((v) => (v ?? "").trim())
    .filter(Boolean)
    .join("-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(0, 80);
  return slug ? `JV-Agreement-${slug}.pdf` : `JV-Agreement-${s.id}.pdf`;
}
