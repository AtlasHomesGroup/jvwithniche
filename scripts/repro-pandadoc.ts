/**
 * Reproduce a failing production PandaDoc createDocument call using the
 * exact form_data from a submission in the DB. Helps surface the full API
 * error that Vercel runtime logs truncate.
 *
 * Usage: npm run pandadoc:repro -- <submission_id>
 */

import { Client } from "pg";

import {
  createDocument,
  PandaDocApiError,
  sendDocument,
} from "@/lib/pandadoc/client";
import {
  buildDocumentName,
  buildMergeTokens,
  buildRecipients,
} from "@/lib/pandadoc/merge-fields";
import type { FullFormData } from "@/lib/form-schema";

async function main() {
  const submissionId = process.argv[2];
  if (!submissionId) {
    console.error("Usage: npm run pandadoc:repro -- <submission_id>");
    process.exit(1);
  }

  const connStr =
    process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connStr) throw new Error("DATABASE_URL not set");

  const pg = new Client({ connectionString: connStr });
  await pg.connect();
  const res = await pg.query(
    "select form_data from submissions where id = $1",
    [submissionId],
  );
  await pg.end();

  if (!res.rows[0]) {
    console.error("Submission not found");
    process.exit(1);
  }

  const formData = res.rows[0].form_data as FullFormData;
  console.log("▶ Submission form data loaded for", submissionId);
  console.log(
    "  setter:",
    formData.firstName,
    formData.lastName,
    "<" + formData.email + ">",
  );
  console.log("  dealType:", formData.dealType);

  const tokens = buildMergeTokens(formData);
  const recipients = buildRecipients(formData);
  const name = buildDocumentName(formData);

  console.log("\n▶ Recipients:");
  for (const r of recipients) {
    console.log(`  role=${r.role}  ${r.first_name} ${r.last_name} <${r.email}>`);
  }

  console.log("\n▶ Calling createDocument against production");
  try {
    const doc = await createDocument({
      name,
      template_uuid: process.env.PANDADOC_TEMPLATE_ID!,
      recipients,
      tokens,
      metadata: { submission_id: submissionId },
    });
    console.log("  ✓ Created:", doc.id, "status:", doc.status);

    // Wait until leaves "uploaded" then attempt send (the actual failure point)
    await new Promise((r) => setTimeout(r, 1500));
    console.log("\n▶ Calling sendDocument (silent)");
    const sent = await sendDocument(doc.id, { silent: true });
    console.log("  ✓ Sent:", sent.status);

    // cleanup
    await fetch(
      `https://api.pandadoc.com/public/v1/documents/${doc.id}`,
      {
        method: "DELETE",
        headers: { Authorization: `API-Key ${process.env.PANDADOC_API_KEY}` },
      },
    );
    console.log("  ✓ Cleaned up test doc");
  } catch (err) {
    if (err instanceof PandaDocApiError) {
      console.error("\n✗ PandaDoc API Error:");
      console.error("  status:", err.status);
      console.error("  body:  ", err.body);
    } else {
      console.error("\n✗ Unexpected:", err);
    }
    process.exit(1);
  }
}

void main();
