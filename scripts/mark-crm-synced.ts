/**
 * One-off: stamp a submission as already CRM-synced so the auto/manual
 * push paths skip it. Use after a manual push (e.g. via crm:test) where
 * the bookkeeping wasn't done by pushSubmissionToCrm.
 *
 * Usage:
 *   npm run crm:mark -- <submission-uuid> <salesforce-lead-id>
 */

import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { submissions } from "@/db/schema";

async function main() {
  const id = process.argv[2];
  const leadId = process.argv[3];
  if (!id || !leadId) {
    console.error("Usage: npm run crm:mark -- <submission-uuid> <lead-id>");
    process.exit(1);
  }
  const now = new Date();
  const [updated] = await db
    .update(submissions)
    .set({
      crmOpportunityId: leadId,
      crmSyncedAt: now,
      status: "crm_synced",
      updatedAt: now,
    })
    .where(eq(submissions.id, id))
    .returning();
  if (!updated) {
    console.error("submission not found");
    process.exit(1);
  }
  console.log(`✓ Marked ${id} synced -> Salesforce Lead ${leadId}`);
}
void main().then(() => process.exit(0));
