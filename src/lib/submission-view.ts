import type { Submission } from "@/db/schema";

export interface SummaryRow {
  label: string;
  value: string;
  multiline?: boolean;
}

export interface SummarySection {
  title: string;
  rows: SummaryRow[];
}

type FD = Record<string, unknown>;

function str(fd: FD, key: string): string {
  const v = fd[key];
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) {
    return v
      .map((x) => (typeof x === "string" ? x.trim() : String(x)))
      .filter(Boolean)
      .join(", ");
  }
  return "";
}

function joinWith(
  sep: string,
  ...parts: Array<string | null | undefined>
): string {
  return parts
    .map((p) => (p ?? "").toString().trim())
    .filter(Boolean)
    .join(sep);
}

function pushIf(
  rows: SummaryRow[],
  label: string,
  value: string,
  multiline = false,
) {
  if (value.trim().length > 0) rows.push({ label, value, multiline });
}

/**
 * Build a grouped, filled-only summary of a submission suitable for both
 * the public view page and the WhatsApp welcome message.
 */
export function renderSubmissionSections(s: Submission): SummarySection[] {
  const fd = (s.formData as FD) ?? {};
  const sections: SummarySection[] = [];

  // ── Setter ──────────────────────────────────────────────
  const setter: SummaryRow[] = [];
  pushIf(
    setter,
    "Name",
    joinWith(" ", str(fd, "firstName"), str(fd, "lastName")),
  );
  pushIf(setter, "Email", str(fd, "email") || s.submitterEmail || "");
  pushIf(
    setter,
    "Phone",
    str(fd, "phoneE164") || s.submitterPhoneE164 || "",
  );
  pushIf(
    setter,
    "Address",
    joinWith(
      ", ",
      str(fd, "address"),
      str(fd, "city"),
      str(fd, "state"),
      str(fd, "zip"),
    ),
  );
  if (fd.isNicheCommunityMember === true) {
    pushIf(
      setter,
      "Niche Community",
      `Yes${str(fd, "communityEmail") ? ` · ${str(fd, "communityEmail")}` : ""}`,
    );
  }
  if (setter.length > 0) sections.push({ title: "Setter", rows: setter });

  // ── Prospect & property ─────────────────────────────────
  const prospect: SummaryRow[] = [];
  pushIf(
    prospect,
    "Prospect",
    joinWith(" ", str(fd, "prospectFirstName"), str(fd, "prospectLastName")),
  );
  pushIf(
    prospect,
    "Property",
    joinWith(
      ", ",
      str(fd, "propertyStreet") || s.propertyStreet || "",
      str(fd, "propertyCity") || s.propertyCity || "",
      str(fd, "propertyState") || s.propertyState || "",
      str(fd, "propertyZip"),
    ),
  );
  pushIf(prospect, "Prospect email", str(fd, "prospectEmail"));
  pushIf(prospect, "Prospect phone", str(fd, "prospectPhoneE164"));
  pushIf(prospect, "Occupancy", str(fd, "occupancy"));
  pushIf(prospect, "Lender", str(fd, "lender"));
  pushIf(prospect, "Foreclosing trustee", str(fd, "foreclosingTrustee"));
  if (prospect.length > 0)
    sections.push({ title: "Prospect & property", rows: prospect });

  // ── Deal ────────────────────────────────────────────────
  const deal: SummaryRow[] = [];
  pushIf(deal, "Deal type", str(fd, "dealType") || s.dealType || "");
  const urgency = str(fd, "urgencyScale");
  if (urgency) pushIf(deal, "Urgency (1-10)", urgency);
  pushIf(deal, "Assistance requested", str(fd, "assistanceRequested"));
  pushIf(deal, "Assistance (other)", str(fd, "assistanceOther"));
  if (deal.length > 0) sections.push({ title: "Deal", rows: deal });

  // ── Narrative ───────────────────────────────────────────
  const narrative: SummaryRow[] = [];
  const narrativeFields: Array<[string, string]> = [
    ["Challenge", "challenge"],
    ["Situation summary", "situationSummary"],
    ["Equity estimate", "equityEstimateReasoning"],
    ["Why it has potential", "potentialReasoning"],
    ["Additional info", "additionalInfo"],
  ];
  for (const [label, key] of narrativeFields) {
    pushIf(narrative, label, str(fd, key), true);
  }
  if (narrative.length > 0)
    sections.push({ title: "Narrative", rows: narrative });

  // ── Discovery (variant-specific) ────────────────────────
  const variant: SummaryRow[] = [];
  const dealType = str(fd, "dealType") || s.dealType || "";
  if (dealType === "Foreclosure") {
    const fields: Array<[string, string, boolean?]> = [
      ["Auction date", "foreclosure_auctionDate"],
      ["Auction time", "foreclosure_auctionTime"],
      ["Only owner on title", "foreclosure_onlyOwnerOnTitle"],
      ["Other owners", "foreclosure_otherOwners"],
      ["Recent mortgage statement", "foreclosure_recentMortgageStatement"],
      ["Multiple mortgages / HAF", "foreclosure_multipleMortgagesOrHaf"],
      ["Lender backend promise", "foreclosure_lenderBackendPromise"],
      ["Payments missed", "foreclosure_paymentsMissed"],
      ["Hardship reason", "foreclosure_hardshipReason", true],
      ["Magic wand outcome", "foreclosure_magicWand", true],
    ];
    for (const [label, key, ml] of fields)
      pushIf(variant, label, str(fd, key), ml);
  } else if (dealType === "Probate") {
    const fields: Array<[string, string, boolean?]> = [
      ["Deceased", "probate_deceasedFullName"],
      ["Date of death", "probate_dateOfDeath"],
      ["Probate opened", "probate_isProbateOpened"],
      ["Executor", "probate_executorName"],
      ["Executor contact", "probate_executorContact"],
      ["Probate court", "probate_probateCourt"],
      ["Will exists", "probate_willExists"],
      ["Multiple heirs", "probate_multipleHeirs"],
      ["Heirs detail", "probate_heirsDetail", true],
      ["Outstanding liens", "probate_outstandingLiens", true],
    ];
    for (const [label, key, ml] of fields)
      pushIf(variant, label, str(fd, key), ml);
  } else if (dealType === "Pre-Probate") {
    const fields: Array<[string, string, boolean?]> = [
      ["Deceased", "preprobate_deceasedFullName"],
      ["Date of death", "preprobate_dateOfDeath"],
      ["Relationship", "preprobate_relationshipToDeceased"],
      ["Likely heir", "preprobate_likelyHeir"],
      ["Probate initiated", "preprobate_probateInitiated"],
      ["Property occupancy", "preprobate_propertyOccupancy"],
      ["Outstanding liens", "preprobate_outstandingLiens", true],
    ];
    for (const [label, key, ml] of fields)
      pushIf(variant, label, str(fd, key), ml);
  } else if (dealType === "Surplus Funds") {
    const fields: Array<[string, string, boolean?]> = [
      ["Auction date", "sf_auctionDate"],
      ["Estimated surplus", "sf_estimatedSurplusAmount"],
      ["Former owner notified", "sf_formerOwnerNotified"],
      ["Others approached former owner", "sf_otherApproachedFormerOwner"],
      ["County / jurisdiction", "sf_countyJurisdiction"],
      ["Claim timeline", "sf_claimTimeline", true],
    ];
    for (const [label, key, ml] of fields)
      pushIf(variant, label, str(fd, key), ml);
  } else if (dealType === "Divorce") {
    const fields: Array<[string, string, boolean?]> = [
      ["Both spouses on title", "divorce_bothSpousesOnTitle"],
      ["Divorce finalized", "divorce_divorceFinalized"],
      ["Both agree to sell", "divorce_bothPartiesAgreeToSell"],
      ["Court order exists", "divorce_courtOrderExists"],
      ["Court order description", "divorce_courtOrderDescription", true],
      ["Primary contact spouse", "divorce_primaryContactSpouse"],
    ];
    for (const [label, key, ml] of fields)
      pushIf(variant, label, str(fd, key), ml);
  }
  if (variant.length > 0)
    sections.push({ title: `Discovery · ${dealType}`, rows: variant });

  return sections;
}

/**
 * Format a submission as a plain-text summary - used for the WhatsApp
 * welcome message. Empty fields are omitted.
 */
export function formatSubmissionForWhatsapp(s: Submission): string {
  const sections = renderSubmissionSections(s);
  const lines: string[] = [];
  for (const section of sections) {
    if (section.rows.length === 0) continue;
    lines.push(`*${section.title}*`);
    for (const { label, value } of section.rows) {
      // Keep each row on its own line; collapse newlines inside values to
      // preserve WhatsApp formatting.
      const v = value.replace(/\s+/g, " ").trim();
      lines.push(`  • ${label}: ${v}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}
