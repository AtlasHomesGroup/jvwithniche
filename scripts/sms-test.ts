/**
 * One-off: render and (optionally) send the two SMS templates against
 * a real submission.
 *
 * Usage:
 *   npm run sms:test -- <submission-uuid>            # dry-run, prints both
 *   SMS_TEST_TO=+18165551234 npm run sms:test -- <submission-uuid>  # actually send
 *
 * If SMS_TEST_TO is set, both templates are sent to that number (so a
 * fictional submitter's phone in the DB doesn't get pinged). Without
 * SMS_TEST_TO, the script is a pure dry-run.
 */

import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { submissions } from "@/db/schema";
import { isConfigured, sendSms } from "@/lib/sms/client";
import {
  submitterPleaseSignSms,
  submitterSignedSms,
} from "@/lib/sms/templates";

async function main() {
  const id = process.argv[2];
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    console.error("Usage: npm run sms:test -- <submission-uuid>");
    process.exit(1);
  }
  const [s] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, id))
    .limit(1);
  if (!s) {
    console.error(`No submission with id ${id}`);
    process.exit(1);
  }

  const pleaseSign = submitterPleaseSignSms(s);
  const signed = submitterSignedSms(s);

  console.log("\n--- 1. submitterPleaseSignSms ---");
  console.log(`length: ${pleaseSign.length} chars`);
  console.log(pleaseSign);

  console.log("\n--- 2. submitterSignedSms ---");
  console.log(`length: ${signed.length} chars`);
  console.log(signed);

  const overrideTo = process.env.SMS_TEST_TO?.trim();
  if (!overrideTo) {
    console.log(
      "\n(dry-run — set SMS_TEST_TO=+1XXXXXXXXXX to actually send to that number)",
    );
    return;
  }
  if (!isConfigured()) {
    console.error("\nTwilio is not configured — cannot send. Aborting.");
    process.exit(1);
  }
  console.log(`\nSending both messages to ${overrideTo}...`);
  const r1 = await sendSms({ to: overrideTo, body: pleaseSign });
  console.log("  please-sign:", r1);
  const r2 = await sendSms({ to: overrideTo, body: signed });
  console.log("  signed:     ", r2);
}

void main().then(() => process.exit(0));
