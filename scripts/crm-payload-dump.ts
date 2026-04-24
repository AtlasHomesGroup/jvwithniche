import { eq } from "drizzle-orm";
import { writeFileSync } from "fs";

import { db } from "@/db/client";
import { submissions } from "@/db/schema";
import { buildCrmPayload } from "@/lib/crm/payload";

async function main() {
  const id = process.env.SUBMISSION_ID;
  if (!id) {
    console.error("Set SUBMISSION_ID and retry.");
    process.exit(1);
  }
  const [s] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, id))
    .limit(1);
  if (!s) {
    console.error(`No submission for ${id}`);
    process.exit(1);
  }

  const payload = await buildCrmPayload(s);
  const fullPath = `/tmp/crm-payload-${id}.json`;
  writeFileSync(fullPath, JSON.stringify(payload, null, 2));

  const display = JSON.parse(JSON.stringify(payload));
  for (const f of display.files ?? []) {
    const b64 = String(f.base64 ?? "");
    f.base64 = `${b64.slice(0, 60)}...[${b64.length.toLocaleString()} chars total]...${b64.slice(-40)}`;
  }
  console.log(JSON.stringify(display, null, 2));
  console.log(
    `\n\n↑ base64 truncated for display. Full payload written to: ${fullPath}`,
  );
}

void main();
