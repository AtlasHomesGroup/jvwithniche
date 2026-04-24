/**
 * Run the exact DB query the PandaDoc webhook handler runs, against the
 * same Neon pool. If the row isn't found here, we have a real data-level
 * mismatch (column value, collation, whitespace…). Usage:
 *   npm run webhook:debug -- <docId>
 */

import { Client } from "pg";

async function main() {
  const docId = process.argv[2];
  if (!docId) {
    console.error("Usage: npm run webhook:debug -- <docId>");
    process.exit(1);
  }

  const connStr =
    process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connStr) throw new Error("DATABASE_URL not set");

  const pg = new Client({ connectionString: connStr });
  await pg.connect();

  console.log("▶ Exact-match query:");
  const exact = await pg.query(
    "select id, status, esign_document_id, signed_at from submissions where esign_document_id = $1",
    [docId],
  );
  console.log(`  Found: ${exact.rowCount} row(s)`);
  if (exact.rowCount) console.log(JSON.stringify(exact.rows[0], null, 2));

  console.log("\n▶ LIKE match (helps if there's whitespace):");
  const like = await pg.query(
    "select id, esign_document_id, length(esign_document_id) as len from submissions where esign_document_id like $1",
    [`%${docId}%`],
  );
  console.log(`  Found: ${like.rowCount} row(s)`);
  for (const row of like.rows) console.log(`  id=${row.id}  len=${row.len}  val="${row.esign_document_id}"`);

  console.log("\n▶ Recent submissions with non-null esign_document_id:");
  const recent = await pg.query(
    "select id, esign_document_id, length(esign_document_id) as len, created_at from submissions where esign_document_id is not null order by created_at desc limit 5",
  );
  for (const row of recent.rows) {
    const match = row.esign_document_id === docId;
    console.log(
      `  ${match ? "★" : " "} id=${row.id}  len=${row.len}  val="${row.esign_document_id}"`,
    );
  }

  await pg.end();
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
