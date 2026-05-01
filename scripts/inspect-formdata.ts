import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { submissions } from "@/db/schema";

async function main() {
  const id = process.argv[2];
  const [s] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, id))
    .limit(1);
  if (!s) {
    console.error("not found");
    process.exit(1);
  }
  const fd = (s.formData as Record<string, unknown>) ?? {};
  const keys = Object.keys(fd).sort();
  for (const k of keys) {
    const v = fd[k];
    const display = typeof v === "string" ? `"${v}"` : JSON.stringify(v);
    console.log(`${k.padEnd(36)} ${display}`);
  }
  console.log("---");
  console.log(`top-level: propertyStreet=${s.propertyStreet}  city=${s.propertyCity}  state=${s.propertyState}  email=${s.submitterEmail}  phone=${s.submitterPhoneE164}`);
}
void main().then(() => process.exit(0));
