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
    dealType: "Foreclosure",
    urgencyScale: 7,
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

async function fetchDocumentDetails(docId: string, apiKey: string) {
  const res = await fetch(`${PANDADOC_API_BASE}/documents/${docId}/details`, {
    headers: {
      Authorization: `API-Key ${apiKey}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Document details failed: ${res.status} ${body}`);
  }
  return res.json() as Promise<{
    id: string;
    tokens: Array<{ name: string; value?: string }>;
    fields: Array<{
      uuid: string;
      name: string;
      value: unknown;
      assigned_to?: { role?: string; first_name?: string; last_name?: string };
    }>;
  }>;
}

async function main() {
  const apiKey = process.env.PANDADOC_API_KEY;
  const templateId = process.env.PANDADOC_TEMPLATE_ID;
  if (!apiKey) throw new Error("PANDADOC_API_KEY not set");
  if (!templateId) throw new Error("PANDADOC_TEMPLATE_ID not set");

  // Template details endpoint is permission-gated on sandbox tier; we
  // instead inspect the DOCUMENT we create, which always works.

  const data = sample();
  const sentTokens = buildMergeTokens(data);
  console.log(`▶ Sending ${sentTokens.length} candidate tokens to PandaDoc`);

  console.log("\n▶ Creating document from template", templateId);
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

  console.log("\n▶ Inspecting what PandaDoc actually applied");
  const details = await fetchDocumentDetails(doc.id, apiKey);

  const sentNames = new Set(sentTokens.map((t) => t.name));
  const appliedTokens = details.tokens ?? [];

  console.log(`  Template exposed ${appliedTokens.length} tokens on the doc:`);
  for (const t of appliedTokens) {
    const matched = sentNames.has(t.name);
    const mark = matched ? "✓" : "✗";
    const valPreview = (t.value ?? "")
      .toString()
      .slice(0, 60)
      .replace(/\s+/g, " ");
    console.log(`    ${mark} ${t.name} = "${valPreview}"`);
  }

  const appliedNames = new Set(appliedTokens.map((t) => t.name));
  const sentButUnused = sentTokens
    .map((t) => t.name)
    .filter((n) => !appliedNames.has(n));
  if (sentButUnused.length) {
    console.log(
      `\n  ℹ️  Sent but not on template (harmless): ${sentButUnused
        .slice(0, 20)
        .join(", ")}${sentButUnused.length > 20 ? ", …" : ""}`,
    );
  }

  console.log(`\n  Fields (${details.fields.length}):`);
  for (const f of details.fields) {
    const role = f.assigned_to?.role ?? "?";
    const who = [f.assigned_to?.first_name, f.assigned_to?.last_name]
      .filter(Boolean)
      .join(" ") || "unassigned";
    console.log(`    • ${f.name}  (role: "${role}", signer: ${who})`);
  }

  // Try the full send + embed flow if requested (set RUN_SEND=1). This
  // is what happens on a real user submission and exercises the paid-tier
  // external-email restriction on production keys.
  if (process.env.RUN_SEND === "1") {
    console.log("\n▶ Sending (silent=false) — emails Signer 1 by signing_order");
    try {
      const sent = await sendDocument(doc.id, { silent: false });
      console.log(`  Sent. Status: ${sent.status}`);
    } catch (err) {
      console.log(`  Send failed:`, (err as Error).message);
    }

    console.log("\n▶ Opening embed session");
    try {
      const session = await createEmbedSession(
        doc.id,
        String(sample().email ?? ""),
        600,
      );
      console.log(`  Session URL: https://app.pandadoc.com/s/${session.id}`);
    } catch (err) {
      console.log(`  Session failed:`, (err as Error).message);
    }
  }

  // Clean up the test doc so the user's workspace stays tidy.
  console.log("\n▶ Cleanup: deleting test document");
  const del = await fetch(`${PANDADOC_API_BASE}/documents/${doc.id}`, {
    method: "DELETE",
    headers: { Authorization: `API-Key ${apiKey}` },
  });
  console.log(`  Delete: HTTP ${del.status}`);
  console.log("\n✓ Test complete.");
}

main().catch((err) => {
  console.error("\n✗ TEST FAILED:", err);
  process.exit(1);
});
