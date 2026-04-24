import type { FullFormData } from "@/lib/form-schema";
import type { Recipient, TokenValue } from "./client";

/**
 * Role names MUST match the role names defined in the PandaDoc template.
 * The current "NICHE JV CONTRACT" template uses these two roles.
 */
export const JV_PARTNER_ROLE = "JV Partner" as const;
export const NICHE_ROLE = "Niche Acquisitions" as const;

/**
 * Map a completed submission's form data to PandaDoc merge-field tokens.
 *
 * Token names MUST match the variable names configured in the PandaDoc
 * template (case- and whitespace-sensitive). The current NICHE JV CONTRACT
 * template uses a mix of "Title Case With Spaces" and "Group.DotNotation"
 * variable names, which is what the first block below targets.
 *
 * We additionally send snake_case aliases so the code stays resilient to
 * legal updating the template: if the template switches to snake_case
 * later, submissions keep working without a code change. PandaDoc silently
 * ignores unreferenced tokens.
 */
export function buildMergeTokens(data: FullFormData): TokenValue[] {
  const firstName = (data.firstName ?? "").trim();
  const lastName = (data.lastName ?? "").trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  const prospectFirst = (data.prospectFirstName ?? "").trim();
  const prospectLast = (data.prospectLastName ?? "").trim();
  const prospectFull = [prospectFirst, prospectLast].filter(Boolean).join(" ");

  const jvMailingAddress = [data.address, data.city, data.state, data.zip]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(", ");

  const propertyFullAddress = [
    data.propertyStreet,
    data.propertyCity,
    data.propertyState,
    data.propertyZip,
  ]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(", ");

  const auctionDate =
    data.dealType === "Foreclosure"
      ? formatIsoDate(data.foreclosure_auctionDate)
      : data.dealType === "Surplus Funds"
        ? formatIsoDate(data.sf_auctionDate)
        : "";

  const today = humanDate(new Date());
  const dealType = data.dealType ?? "";

  const tokens: Record<string, string> = {
    // ── Match the current template's variable names exactly ─────────────
    "JV Partner.FirstName": firstName,
    "JV Partner.LastName": lastName,
    "JV Partner.Email": data.email ?? "",
    "JV Partner.Phone": data.phoneE164 ?? "",
    "Property Address": propertyFullAddress,
    "Homeowner First Name": prospectFirst,
    "Homeowner Last Name": prospectLast,
    "Deal Type": dealType,
    "Auction Date": auctionDate,
    // Candidates for the effective-date variable at the top of page 1 —
    // not sure which one is configured, so we send all three. Unmatched
    // ones are dropped by PandaDoc.
    "Effective Date": today,
    "Agreement Date": today,
    "Effective_Date": today,

    // ── Backwards-compatible snake_case aliases (harmless if unused) ────
    agreement_date: today,
    jv_partner_full_name: fullName,
    jv_partner_first_name: firstName,
    jv_partner_last_name: lastName,
    jv_partner_email: data.email ?? "",
    jv_partner_phone: data.phoneE164 ?? "",
    jv_partner_address: jvMailingAddress,
    property_address: propertyFullAddress,
    homeowner_full_name: prospectFull,
    homeowner_first_name: prospectFirst,
    homeowner_last_name: prospectLast,
    deal_type: dealType,
    auction_date: auctionDate,

    // ── Supplementary context the template doesn't reference today ──────
    occupancy: data.occupancy ?? "",
    lender: data.lender ?? "",
    foreclosing_trustee: data.foreclosingTrustee ?? "",
    jv_partner_niche_member: data.isNicheCommunityMember ? "Yes" : "No",
    jv_partner_community_email: data.communityEmail ?? "",
  };

  return Object.entries(tokens).map(([name, value]) => ({ name, value }));
}

export function buildRecipients(data: FullFormData): Recipient[] {
  const nicheName = process.env.NICHE_SIGNER_NAME ?? "Michael Franke";
  const nicheEmail =
    process.env.NICHE_SIGNER_EMAIL ?? "michael@nichesolutions.ai";

  const [nicheFirst, ...nicheRest] = nicheName.trim().split(/\s+/);

  return [
    {
      email: data.email ?? "",
      first_name: data.firstName ?? "",
      last_name: data.lastName ?? "",
      role: JV_PARTNER_ROLE,
      signing_order: 1,
    },
    {
      email: nicheEmail,
      first_name: nicheFirst ?? "Michael",
      last_name: nicheRest.join(" ") || "Franke",
      role: NICHE_ROLE,
      signing_order: 2,
    },
  ];
}

export function buildDocumentName(data: FullFormData): string {
  const prop = data.propertyStreet?.trim() || "property TBD";
  const setter =
    data.firstName && data.lastName
      ? `${data.firstName} ${data.lastName}`
      : "partner TBD";
  return `JV With Niche · ${setter} · ${prop}`;
}

function formatIsoDate(iso: string | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  const date = new Date(Date.UTC(y, m - 1, d));
  if (isNaN(date.getTime())) return "";
  return humanDate(date);
}

function humanDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
