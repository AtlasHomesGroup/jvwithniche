import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { submissions } from "@/db/schema";
import { sendOpsSms, opsSmsNumbers } from "@/lib/sms/client";
import { opsSignedSms } from "@/lib/sms/templates";

async function main() {
  console.log("OPS_NOTIFY_SMS recipients:", opsSmsNumbers());

  const id = process.argv[2];
  if (!id) {
    console.error("Usage: tsx scripts/ops-sms-probe.ts <submission-id>");
    process.exit(1);
  }
  const [s] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, id))
    .limit(1);
  if (!s) {
    console.error("submission not found");
    process.exit(1);
  }
  const body = opsSignedSms(s);
  console.log(`\nBody (${body.length} chars):\n---\n${body}\n---`);
  console.log("\nSending fan-out...");
  const results = await sendOpsSms(body);
  for (const r of results) {
    console.log(
      `  ${r.to}: sent=${r.sent} sid=${r.sid ?? "-"} reason=${r.reason ?? "-"}`,
    );
  }
}
void main().then(() => process.exit(0));
