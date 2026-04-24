import { get } from "@vercel/blob";

import type { Submission } from "@/db/schema";
import type {
  CrmFile,
  CrmLeadFields,
  CrmNote,
  CrmPushPayload,
} from "./client";
import { renderSubmissionSections } from "@/lib/submission-view";

type FD = Record<string, unknown>;

function str(fd: FD, key: string): string {
  const v = fd[key];
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return "";
}

function joinAddress(parts: Array<string | null | undefined>): string {
  return parts
    .map((p) => (p ?? "").toString().trim())
    .filter(Boolean)
    .join(", ");
}

/**
 * Map our submission fields to the CRM Lead__c sobject shape.
 *
 * Only the handful of fields the CRM team asked us to send — everything
 * else (Google address validation, skiptrace, Zillow enrichment, property
 * details, ratings) is computed by pipelines inside Salesforce after the
 * record is created.
 */
export function buildLeadFields(submission: Submission): CrmLeadFields {
  const fd = (submission.formData as FD) ?? {};

  const firstName = str(fd, "prospectFirstName");
  const lastName = str(fd, "prospectLastName");
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  const email = str(fd, "prospectEmail");
  const phone = str(fd, "prospectPhoneE164");

  const address = joinAddress([
    str(fd, "propertyStreet") || submission.propertyStreet,
    str(fd, "propertyCity") || submission.propertyCity,
    str(fd, "propertyState") || submission.propertyState,
    str(fd, "propertyZip"),
  ]);

  const dealType = str(fd, "dealType") || submission.dealType || "";
  const auctionDate = str(fd, "foreclosure_auctionDate");

  const lead: CrmLeadFields = {
    attributes: { type: "Lead__c" },
    First_Name__c: firstName,
    Full_Name__c: fullName || firstName || "(no name provided)",
    Address__c: address,
    Type__c: dealType,
    Entity_Type__c: dealType,
    Source__c: "Referral",
    Status__c: "New",
    Is_Website_Data__c: true,
  };
  if (email) lead.Email__c = email;
  if (phone) lead.Phone__c = phone;
  if (auctionDate && dealType === "Foreclosure") {
    lead.Auction_Date__c = auctionDate;
  }
  return lead;
}

/**
 * Build the CRM-facing notes array. Prospect-side data is already on the
 * Lead, so we skip that section — only Setter, Deal, Narrative, Discovery.
 */
export function buildNotes(submission: Submission): CrmNote[] {
  const sections = renderSubmissionSections(submission);
  const notes: CrmNote[] = [];

  // Always include the submission reference up front so the CRM team can
  // trace back to our portal if they need to (signed PDF link, view link).
  const referenceLines: string[] = [
    `Submission ID: ${submission.id}`,
    `Return-link token: ${submission.returnLinkToken}`,
  ];
  if (submission.signedPdfUrl) {
    referenceLines.push(
      `Archived signed PDF: ${submission.signedPdfUrl}`,
      `Public view link: ${viewLink(submission)}`,
    );
  }
  if (submission.whatsappGroupId) {
    referenceLines.push(`WhatsApp group ID: ${submission.whatsappGroupId}`);
  }
  notes.push({
    title: "Niche JV portal reference",
    body: referenceLines.join("\n"),
  });

  for (const section of sections) {
    // Skip Prospect & property — its fields are already on the Lead.
    if (section.title === "Prospect & property") continue;
    if (section.rows.length === 0) continue;
    const lines = section.rows.map(({ label, value }) => {
      const v = value.replace(/\s+/g, " ").trim();
      return `${label}: ${v}`;
    });
    notes.push({ title: section.title, body: lines.join("\n") });
  }
  return notes;
}

/**
 * Build a short top-level description — shown alongside the lead in views
 * that don't expand notes. Keep it to one paragraph.
 */
export function buildDescription(submission: Submission): string {
  const fd = (submission.formData as FD) ?? {};
  const dealType = str(fd, "dealType") || submission.dealType || "JV";
  const setter = [str(fd, "firstName"), str(fd, "lastName")]
    .filter(Boolean)
    .join(" ");
  const setterClause = setter
    ? ` Submitted by ${setter} via the JV With Niche portal.`
    : " Submitted via the JV With Niche portal.";
  const urgency = str(fd, "urgencyScale");
  const urgencyClause = urgency ? ` Urgency ${urgency}/10.` : "";
  const assistance = str(fd, "assistanceRequested");
  const assistanceClause = assistance ? ` Assistance: ${assistance}.` : "";
  return `${dealType} lead.${setterClause}${urgencyClause}${assistanceClause}`.trim();
}

/**
 * Fetch the signed PDF from Vercel Blob and base64-encode it for the CRM
 * files array. Returns an empty array when there's no PDF to attach.
 */
export async function buildFiles(submission: Submission): Promise<CrmFile[]> {
  if (!submission.signedPdfUrl) return [];
  const blob = await get(submission.signedPdfUrl, { access: "private" });
  if (!blob || blob.statusCode !== 200) return [];

  const chunks: Uint8Array[] = [];
  const reader = blob.stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  let total = 0;
  for (const c of chunks) total += c.length;
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }
  const base64 = Buffer.from(merged).toString("base64");
  const filename = pdfFilename(submission);
  return [
    {
      filename,
      contentType: blob.blob.contentType || "application/pdf",
      base64,
    },
  ];
}

function pdfFilename(s: Submission): string {
  const slug = [s.propertyStreet, s.propertyCity, s.propertyState]
    .map((v) => (v ?? "").trim())
    .filter(Boolean)
    .join("-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(0, 80);
  return slug ? `JV-Agreement-${slug}.pdf` : `JV-Agreement-${s.id}.pdf`;
}

function viewLink(s: Submission): string {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://jvwithniche.com");
  return `${site.replace(/\/$/, "")}/view/${s.returnLinkToken}`;
}

/** Compose the full CRM payload, fetching the PDF as needed. */
export async function buildCrmPayload(
  submission: Submission,
): Promise<CrmPushPayload> {
  const [files] = await Promise.all([buildFiles(submission)]);
  return {
    requestObject: buildLeadFields(submission),
    description: buildDescription(submission),
    notes: buildNotes(submission),
    files,
  };
}
