import type { FullFormData } from "@/lib/form-schema";
import type { Recipient, TokenValue } from "./client";

export const SETTER_ROLE = "Setter" as const;
export const NICHE_ROLE = "Niche Acquisitions" as const;

/**
 * Map a completed submission's form data to the PandaDoc merge-field tokens.
 * Token keys here MUST match the {{TokenName}} tokens defined in the PandaDoc
 * template. If the user names tokens differently on their template, update
 * this file — it's the single source of truth for the field mapping.
 *
 * Convention: camelCase token names, grouped by logical section. PandaDoc
 * accepts any string; camelCase is just our convention to keep it tidy.
 */
export function buildMergeTokens(data: FullFormData): TokenValue[] {
  const setterFullName = join([data.firstName, data.lastName]);
  const prospectFullName = join([data.prospectFirstName, data.prospectLastName]);
  const setterAddressLine = join(
    [data.address, data.city, data.state, data.zip].filter(Boolean),
    ", ",
  );
  const propertyAddressLine = join(
    [
      data.propertyStreet,
      data.propertyCity,
      data.propertyState,
      data.propertyZip,
    ].filter(Boolean),
    ", ",
  );

  const today = new Date();
  const submissionDate = today.toISOString().slice(0, 10); // YYYY-MM-DD

  const tokens: Record<string, string> = {
    // Setter
    SetterFirstName: data.firstName ?? "",
    SetterLastName: data.lastName ?? "",
    SetterFullName: setterFullName,
    SetterEmail: data.email ?? "",
    SetterPhone: data.phoneE164 ?? "",
    SetterAddress: setterAddressLine,
    SetterCity: data.city ?? "",
    SetterState: data.state ?? "",
    SetterZip: data.zip ?? "",
    SetterCountry: data.country ?? "",
    SetterNicheMember: data.isNicheCommunityMember ? "Yes" : "No",
    SetterCommunityEmail: data.communityEmail ?? "",

    // Prospect & property
    ProspectFirstName: data.prospectFirstName ?? "",
    ProspectLastName: data.prospectLastName ?? "",
    ProspectFullName: prospectFullName,
    ProspectEmail: data.prospectEmail ?? "",
    ProspectPhone: data.prospectPhoneE164 ?? "",
    PropertyStreet: data.propertyStreet ?? "",
    PropertyCity: data.propertyCity ?? "",
    PropertyState: data.propertyState ?? "",
    PropertyZip: data.propertyZip ?? "",
    PropertyAddress: propertyAddressLine,
    PropertyOccupancy: data.occupancy ?? "",
    Lender: data.lender ?? "",
    ForeclosingTrustee: data.foreclosingTrustee ?? "",

    // Deal
    DealType: data.dealType ?? "",
    SubmissionDate: submissionDate,

    // Narrative summary (short forms; full narrative is in the CRM payload)
    Challenge: truncate(data.challenge ?? "", 500),
    SituationSummary: truncate(data.situationSummary ?? "", 500),
    EquityEstimate: truncate(data.equityEstimateReasoning ?? "", 500),
    AssistanceRequested: (data.assistanceRequested ?? []).join(", "),
    PotentialReasoning: truncate(data.potentialReasoning ?? "", 500),
    AdditionalInfo: truncate(data.additionalInfo ?? "", 500),
  };

  return Object.entries(tokens).map(([name, value]) => ({ name, value }));
}

/**
 * Build the recipient list for a PandaDoc document. The setter signs first,
 * followed by the Niche side. Both emails must be real for the signing flow
 * to work; the submitter signs via the embedded iframe (we send silent=true
 * on sendDocument so PandaDoc doesn't email them the link), the Niche side
 * receives an email-based request.
 */
export function buildRecipients(data: FullFormData): Recipient[] {
  const nicheName = process.env.NICHE_SIGNER_NAME ?? "Niche Acquisitions";
  const nicheEmail =
    process.env.NICHE_SIGNER_EMAIL ?? "michael@nichesolutions.ai";

  const [nicheFirst, ...nicheRest] = nicheName.trim().split(/\s+/);

  return [
    {
      email: data.email ?? "",
      first_name: data.firstName ?? "",
      last_name: data.lastName ?? "",
      role: SETTER_ROLE,
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
 * Produce a short, human-readable document name so it's easy to find the
 * right one in the PandaDoc admin UI later.
 */
export function buildDocumentName(data: FullFormData): string {
  const prop = data.propertyStreet?.trim() || "property TBD";
  const setter =
    data.firstName && data.lastName
      ? `${data.firstName} ${data.lastName}`
      : "setter TBD";
  return `JV With Niche · ${setter} · ${prop}`;
}

function join(parts: (string | undefined | null)[], sep = " "): string {
  return parts
    .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    .join(sep);
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…";
}
