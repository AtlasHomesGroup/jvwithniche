/**
 * Quick sanity check for the PandaDoc API key + token.
 * Lists templates available in the workspace so you can copy the UUID
 * you need for PANDADOC_TEMPLATE_ID.
 *
 * Usage (from repo root):
 *   npm run pandadoc:ping
 */

import { listTemplates } from "@/lib/pandadoc/client";

async function main() {
  if (!process.env.PANDADOC_API_KEY) {
    console.error(
      "PANDADOC_API_KEY is not set. Put it in .env.local or export it.",
    );
    process.exit(1);
  }
  try {
    const res = await listTemplates();
    if (!res.results?.length) {
      console.log(
        "✓ Authenticated — no templates in this workspace yet. Create one in PandaDoc, then re-run.",
      );
      return;
    }
    console.log(`✓ Authenticated — ${res.results.length} template(s):\n`);
    for (const tpl of res.results) {
      console.log(`  ${tpl.id}`);
      console.log(`    ${tpl.name}  ·  modified ${tpl.date_modified}\n`);
    }
    console.log(
      "Copy a template id above and set it as PANDADOC_TEMPLATE_ID in Vercel + .env.local.",
    );
  } catch (err) {
    console.error("✗ PandaDoc ping failed:", err);
    process.exit(1);
  }
}

void main();
