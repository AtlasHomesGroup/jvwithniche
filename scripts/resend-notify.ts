/**
 * One-off: re-fire the post-signing operator notification for a given
 * submission id. Use after a Whapi outage that swallowed the original
 * webhook-time notification.
 *
 * Usage (from repo root):
 *   npm run notify:resend -- <submission-uuid>
 */

import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { submissions } from "@/db/schema";
import { notifyOperatorOfSignedSubmission } from "@/lib/whatsapp/group";

async function main() {
  const id = process.argv[2];
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    console.error("Pass a submission UUID:  npm run notify:resend -- <id>");
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
  if (!s.signedAt || !s.signedPdfUrl) {
    console.error(
      `Submission ${id} is not in a signed state (signedAt=${s.signedAt}, pdf=${!!s.signedPdfUrl})`,
    );
    process.exit(1);
  }

  console.log(
    `Resending operator notification for ${id} (${s.propertyStreet ?? ""}, ${s.propertyCity ?? ""}, ${s.propertyState ?? ""})`,
  );
  await notifyOperatorOfSignedSubmission(s);
  console.log("✓ Done — check your WhatsApp.");
}

void main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
