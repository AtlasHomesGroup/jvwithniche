import {
  createGroup,
  getGroupInviteLink,
  isConfigured,
  normalizePhone,
  sendTextMessage,
} from "./client";
import type { Submission } from "@/db/schema";

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

export function buildWelcomeMessage(s: {
  setterFirstName: string;
  propertyFullAddress: string;
}): string {
  const name = s.setterFirstName.trim() || "there";
  const addr = s.propertyFullAddress.trim() || "your submission";
  return `Hi ${name}! Thanks for submitting ${addr} for JV with Niche. Michael and our acquisitions team are reviewing your submission and will jump in here shortly to discuss next steps.`;
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
  // ZIP isn't a denormalized column — pull from form_data jsonb.
  const fd = submission.formData as
    | { propertyZip?: unknown }
    | null;
  const zip = typeof fd?.propertyZip === "string" ? fd.propertyZip : "";
  const propertyFullAddress = [
    submission.propertyStreet,
    submission.propertyCity,
    submission.propertyState,
    zip,
  ]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(", ");

  // Step 1 — create the group with all members
  const created = await createGroup({ subject, participants });
  const groupId = created.id;

  // Step 2 — post the welcome message
  const welcome = buildWelcomeMessage({
    setterFirstName: extractFirstName(submission),
    propertyFullAddress,
  });
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

  // Step 3 — try to fetch the invite link (best-effort)
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

function extractFirstName(submission: Submission): string {
  // The denormalized columns don't include firstName, but it's in form_data.
  const fd = submission.formData as
    | { firstName?: unknown }
    | null;
  const v = fd?.firstName;
  return typeof v === "string" ? v : "";
}
