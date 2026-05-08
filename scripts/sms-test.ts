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
  opsFormStartedSms,
  opsSignedSms,
  opsStalledSms,
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

  const templates: Array<[string, string]> = [
    ["opsFormStartedSms (Rashad+Michael, on form start)", opsFormStartedSms(s)],
    ["submitterPleaseSignSms (setter, stalled)", submitterPleaseSignSms(s)],
    ["opsStalledSms (Rashad+Michael, stalled)", opsStalledSms(s)],
    ["submitterSignedSms (setter, on sign)", submitterSignedSms(s)],
    ["opsSignedSms (Rashad+Michael, on sign)", opsSignedSms(s)],
  ];

  for (const [label, body] of templates) {
    console.log(`\n--- ${label} (${body.length} chars) ---`);
    console.log(body);
  }

  const overrideTo = process.env.SMS_TEST_TO?.trim();
  if (!overrideTo) {
    console.log(
      "\n(dry-run — set SMS_TEST_TO=+1XXXXXXXXXX to actually send all 6 to that number)",
    );
    return;
  }
  if (!isConfigured()) {
    console.error("\nTwilio is not configured — cannot send. Aborting.");
    process.exit(1);
  }
  console.log(`\nSending all 6 messages to ${overrideTo}...`);
  for (const [label, body] of templates) {
    const r = await sendSms({ to: overrideTo, body });
    console.log(`  ${label}:`, r);
  }
}

void main().then(() => process.exit(0));
