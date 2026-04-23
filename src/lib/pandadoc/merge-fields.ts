import type { FullFormData } from "@/lib/form-schema";
import type { Recipient, TokenValue } from "./client";

/**
 * Role names MUST match the role names defined in the PandaDoc template.
 * The current template uses "JV Partner" for the submitter and
 * "Niche Acquisitions" for Michael / the closer side.
 */
export const JV_PARTNER_ROLE = "JV Partner" as const;
export const NICHE_ROLE = "Niche Acquisitions" as const;

/**
 * Map a completed submission's form data to the PandaDoc merge-field tokens.
 *
 * Token names mirror the {{snake_case}} tokens in the JV contract template.
 * We send a superset — if the template doesn't reference a token, PandaDoc
 * silently ignores it, so we can keep extra tokens around for flexibility
 * without breaking anything.
 */
export function buildMergeTokens(data: FullFormData): TokenValue[] {
  const jvFullName = join([data.firstName, data.lastName]);
  const homeownerFullName = join([
    data.prospectFirstName,
    data.prospectLastName,
  ]);

  const jvMailingAddress = join(
    [data.address, data.city, data.state, data.zip].filter(Boolean),
    ", ",
  );
  const propertyFullAddress = join(
    [
      data.propertyStreet,
      data.propertyCity,
      data.propertyState,
      data.propertyZip,
    ].filter(Boolean),
    ", ",
  );

  // Pick the right auction date based on deal type — only pre-foreclosure,
  // NOD, and surplus funds have one. Others stay blank (template says "if
  // applicable").
  const auctionDate =
    data.dealType === "Pre-foreclosure" || data.dealType === "NOD"
      ? formatIsoDate(data.foreclosure_auctionDate)
      : data.dealType === "Surplus Funds"
        ? formatIsoDate(data.sf_auctionDate)
        : "";

  const tokens: Record<string, string> = {
    // ── Contract variables used by the current JV template ──────────────
    agreement_date: humanDate(new Date()),

    // JV Partner (Party B)
    jv_partner_full_name: jvFullName,
    jv_partner_first_name: data.firstName ?? "",
    jv_partner_last_name: data.lastName ?? "",
    jv_partner_email: data.email ?? "",
    jv_partner_phone: data.phoneE164 ?? "",
    jv_partner_address: jvMailingAddress,
    jv_partner_city: data.city ?? "",
    jv_partner_state: data.state ?? "",
    jv_partner_zip: data.zip ?? "",

    // Deal information (section 1 of the contract)
    property_address: propertyFullAddress,
    property_street: data.propertyStreet ?? "",
    property_city: data.propertyCity ?? "",
    property_state: data.propertyState ?? "",
    property_zip: data.propertyZip ?? "",
    homeowner_full_name: homeownerFullName,
    homeowner_first_name: data.prospectFirstName ?? "",
    homeowner_last_name: data.prospectLastName ?? "",
    deal_type: data.dealType ?? "",
    auction_date: auctionDate,

    // Supplementary context (not currently in template — available if added)
    occupancy: data.occupancy ?? "",
    lender: data.lender ?? "",
    foreclosing_trustee: data.foreclosingTrustee ?? "",
    jv_partner_niche_member: data.isNicheCommunityMember ? "Yes" : "No",
    jv_partner_community_email: data.communityEmail ?? "",
  };

  return Object.entries(tokens).map(([name, value]) => ({ name, value }));
}

/**
 * Build the recipient list for a PandaDoc document. The JV Partner signs
 * first via the embedded iframe; the Niche side receives an email link and
 * signs afterward.
 */
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

/**
 * Human-readable document name shown in the PandaDoc admin UI so Michael
 * can scan his inbox without opening each doc.
 */
export function buildDocumentName(data: FullFormData): string {
  const prop = data.propertyStreet?.trim() || "property TBD";
  const setter =
    data.firstName && data.lastName
      ? `${data.firstName} ${data.lastName}`
      : "partner TBD";
  return `JV With Niche · ${setter} · ${prop}`;
}

function join(parts: (string | undefined | null)[], sep = " "): string {
  return parts
    .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    .join(sep);
}

/** Format ISO date string (YYYY-MM-DD) as "April 23, 2026". */
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
