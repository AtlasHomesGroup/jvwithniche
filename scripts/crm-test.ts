/**
 * Manual CRM push test. Looks up a submission by id, assembles the payload
 * exactly as production would, and posts it to the Niche CRM endpoint.
 *
 * Requires these env vars (pulled from .env.local by the npm script):
 *   - DATABASE_URL          (to read the submission)
 *   - BLOB_READ_WRITE_TOKEN (to read the signed PDF)
 *   - CRM_ENDPOINT_URL      (where to POST - typically the Apex site URL)
 *   - CRM_DRY_RUN=1         (optional - skip the actual POST, just print)
 *
 * Usage:
 *   SUBMISSION_ID=<uuid> npm run crm:test
 *   SUBMISSION_ID=<uuid> CRM_DRY_RUN=1 npm run crm:test
 */

import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { submissions } from "@/db/schema";
import { buildCrmPayload } from "@/lib/crm/payload";
import { pushToCrm } from "@/lib/crm/client";

async function main() {
  const id = process.env.SUBMISSION_ID;
  if (!id) {
    console.error("Set SUBMISSION_ID=<uuid> and retry.");
    process.exit(1);
  }

  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, id))
    .limit(1);
  if (!submission) {
    console.error(`No submission found for id ${id}`);
    process.exit(1);
  }

  console.log(`▶ Submission: ${submission.id}`);
  console.log(`  property:    ${submission.propertyStreet ?? "-"}`);
  console.log(`  status:      ${submission.status}`);
  console.log(`  signed_at:   ${submission.signedAt?.toISOString() ?? "-"}`);
  console.log(`  pdf_url:     ${submission.signedPdfUrl ?? "-"}`);
  console.log(`  crm_synced:  ${submission.crmSyncedAt?.toISOString() ?? "-"}`);

  console.log("\n▶ Building CRM payload…");
  const payload = await buildCrmPayload(submission);
  const fileBytes = payload.files[0]?.base64.length ?? 0;
  console.log(
    `  lead fields: ${Object.keys(payload.requestObject).length - 1}`,
  );
  console.log(`  notes:       ${payload.notes.length}`);
  console.log(
    `  files:       ${payload.files.length} (base64 ${fileBytes.toLocaleString()} chars)`,
  );
  console.log(`  description: ${payload.description}`);
  console.log("\n▶ requestObject:");
  console.log(JSON.stringify(payload.requestObject, null, 2));
  console.log("\n▶ notes:");
  for (const n of payload.notes) {
    console.log(`- ${n.title} -`);
    console.log(n.body);
    console.log();
  }

  if (process.env.CRM_DRY_RUN === "1") {
    console.log("\n✓ CRM_DRY_RUN=1 - skipping POST");
    return;
  }

  if (!process.env.CRM_ENDPOINT_URL) {
    console.log(
      "\n⚠️  CRM_ENDPOINT_URL not set - payload built but no POST attempted. Set CRM_ENDPOINT_URL or CRM_DRY_RUN=1.",
    );
    process.exit(1);
  }

  console.log(`\n▶ POSTing to ${process.env.CRM_ENDPOINT_URL}`);
  try {
    const { recordId, rawBody } = await pushToCrm(payload);
    console.log(`\n✓ Success - Lead Id: ${recordId}`);
    console.log(`  response body: ${rawBody.slice(0, 400)}`);
  } catch (err) {
    console.error("\n✗ CRM push failed:", err);
    process.exit(1);
  }
}

void main();
