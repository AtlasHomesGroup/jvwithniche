/**
 * End-to-end smoke test against a PandaDoc template.
 *
 * Steps:
 *   1. Fetch the template's roles + tokens from PandaDoc.
 *   2. Report which of our expected merge tokens are present / missing.
 *   3. Create a document from the template with sample data.
 *   4. Poll until the doc leaves "document.uploaded" state.
 *   5. Send the doc silently so it becomes embeddable.
 *   6. Open a signing session for the JV Partner recipient.
 *
 * Run with:
 *   PANDADOC_TEMPLATE_ID=<uuid> npm run pandadoc:test
 */

import {
  createDocument,
  createEmbedSession,
  getDocument,
  getDocumentStatus,
  sendDocument,
} from "@/lib/pandadoc/client";
import {
  buildMergeTokens,
  buildRecipients,
  buildDocumentName,
} from "@/lib/pandadoc/merge-fields";
import type { FullFormData } from "@/lib/form-schema";

const PANDADOC_API_BASE = "https://api.pandadoc.com/public/v1";

async function fetchTemplateDetails(templateId: string, apiKey: string) {
  const res = await fetch(`${PANDADOC_API_BASE}/templates/${templateId}/details`, {
    headers: {
      Authorization: `API-Key ${apiKey}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Template details failed: ${res.status} ${body}`);
  }
  return res.json() as Promise<{
    id: string;
    name: string;
    roles: Array<{ id: string; name: string; preassigned_person?: unknown }>;
    tokens: Array<{ name: string; value?: string }>;
    fields: Array<{ uuid: string; name: string; assigned_to: { role: string } }>;
  }>;
}

function sample(): FullFormData {
  return {
    firstName: "Jane",
    lastName: "Smoke",
    address: "999 Test Ave",
    city: "Kansas City",
    state: "MO",
    zip: "64106",
    country: "US",
    email: "jane.smoke.test@mailinator.com",
    phoneE164: "+18165551234",
    whatsappConsent: true,
    isNicheCommunityMember: true,
    communityEmail: "jane.smoke.test@mailinator.com",
    prospectFirstName: "Sarah",
    prospectLastName: "Distressed",
    propertyStreet: "1234 Foreclosure Ln",
    propertyCity: "Independence",
    propertyState: "MO",
    propertyZip: "64057",
    propertyCountry: "US",
    prospectEmail: "",
    prospectPhoneE164: "",
    occupancy: "Owner-occupied",
    lender: "Chase Bank",
    foreclosingTrustee: "Trustee LLC",
    dealType: "Pre-foreclosure",
    challenge: "Seller is 4 months behind, auction in 3 weeks, needs to sell fast.",
    situationSummary: "Sarah lost her job, fell behind, wants to walk away clean.",
    equityEstimateReasoning: "Balance ~$180K, Zillow avg $320K, clean title. Est ~$140K equity.",
    assistanceRequested: ["Bring financing", "Close the deal"],
    assistanceOther: "",
    potentialReasoning: "Strong equity, motivated seller, auction forcing action — fast close likely.",
    additionalInfo: "",
    foreclosure_auctionDate: "2026-05-14",
    foreclosure_auctionTime: "10:00",
    foreclosure_onlyOwnerOnTitle: "Yes",
    foreclosure_otherOwners: "",
    foreclosure_recentMortgageStatement: "Yes",
    foreclosure_multipleMortgagesOrHaf: "Single mortgage, never touched HAF.",
    foreclosure_lenderBackendPromise: "No",
    foreclosure_urgencyScale: 8,
    foreclosure_paymentsMissed: 4,
    foreclosure_hardshipReason: "Lost job at manufacturing plant, hasn't been able to find comparable work yet.",
    foreclosure_magicWand: "Walk away, clear the debt, keep a small cash cushion to move with.",
    probate_deceasedFullName: "",
    probate_dateOfDeath: "",
    probate_executorName: "",
    probate_executorContact: "",
    probate_probateCourt: "",
    probate_heirsDetail: "",
    probate_outstandingLiens: "",
    preprobate_deceasedFullName: "",
    preprobate_dateOfDeath: "",
    preprobate_relationshipToDeceased: "",
    preprobate_likelyHeir: "",
    preprobate_outstandingLiens: "",
    sf_auctionDate: "",
    sf_countyJurisdiction: "",
    sf_claimTimeline: "",
    divorce_courtOrderDescription: "",
    divorce_primaryContactSpouse: "",
  } as unknown as FullFormData;
}

async function waitUntilReady(docId: string, attempts = 10): Promise<string> {
  for (let i = 0; i < attempts; i++) {
    const { status } = await getDocumentStatus(docId);
    if (status !== "document.uploaded") return status;
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("Document did not leave uploaded state in time");
}

async function main() {
  const apiKey = process.env.PANDADOC_API_KEY;
  const templateId = process.env.PANDADOC_TEMPLATE_ID;
  if (!apiKey) throw new Error("PANDADOC_API_KEY not set");
  if (!templateId) throw new Error("PANDADOC_TEMPLATE_ID not set");

  console.log("▶ Inspecting template", templateId);
  const details = await fetchTemplateDetails(templateId, apiKey);
  console.log(`  Name: ${details.name}`);
  console.log(`  Roles: ${details.roles.map((r) => r.name).join(", ") || "(none)"}`);
  console.log(`  Tokens: ${details.tokens.length} detected`);
  for (const t of details.tokens) console.log(`    • ${t.name}`);
  console.log(`  Fields: ${details.fields.length}`);
  for (const f of details.fields) {
    console.log(`    • ${f.name}  (assigned to "${f.assigned_to?.role ?? "?"}")`);
  }

  const data = sample();
  const expected = buildMergeTokens(data).map((t) => t.name);
  const templateTokens = new Set(details.tokens.map((t) => t.name));
  const ourUnused = expected.filter((n) => !templateTokens.has(n));
  const templateMissing = [...templateTokens].filter((n) => !expected.includes(n));

  console.log("\n▶ Token mapping check");
  if (ourUnused.length) {
    console.log(`  Sent by code but not on template (harmless): ${ourUnused.join(", ")}`);
  }
  if (templateMissing.length) {
    console.log(
      `  ⚠️  Template has tokens our code doesn't send: ${templateMissing.join(", ")}`,
    );
  } else {
    console.log("  ✓ Every token on the template will be populated.");
  }

  console.log("\n▶ Creating document");
  const doc = await createDocument({
    name: buildDocumentName(data),
    template_uuid: templateId,
    recipients: buildRecipients(data),
    tokens: buildMergeTokens(data),
    metadata: { test_run: "true" },
  });
  console.log(`  Created: ${doc.id}`);

  const ready = await waitUntilReady(doc.id);
  console.log(`  Ready. Status: ${ready}`);

  const jvPartnerEmail =
    buildRecipients(data).find((r) => r.role === "JV Partner")?.email ?? "";

  console.log("\n▶ Sending document (silent)");
  const sent = await sendDocument(doc.id, { silent: true });
  console.log(`  Sent. Status: ${sent.status}`);

  console.log("\n▶ Opening embed session for JV Partner");
  const session = await createEmbedSession(doc.id, jvPartnerEmail, 600);
  const signUrl = `https://app.pandadoc.com/s/${session.id}`;
  console.log(`  Session: ${session.id}`);
  console.log(`  Expires: ${session.expires_at}`);
  console.log(`  Sign URL: ${signUrl}`);

  const fullDoc = await getDocument(doc.id);
  console.log("\n▶ Final document state");
  console.log(`  id: ${fullDoc.id}`);
  console.log(`  name: ${fullDoc.name}`);
  console.log(`  status: ${fullDoc.status}`);
  console.log("\n✓ All API calls succeeded. Open the sign URL above in a browser to visually verify merge values.");
}

main().catch((err) => {
  console.error("\n✗ TEST FAILED:", err);
  process.exit(1);
});
