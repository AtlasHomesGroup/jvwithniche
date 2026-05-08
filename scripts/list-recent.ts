import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { submissions } from "@/db/schema";

async function main() {
  const rows = await db
    .select({
      id: submissions.id,
      status: submissions.status,
      signedAt: submissions.signedAt,
      crmSyncedAt: submissions.crmSyncedAt,
      crmOpportunityId: submissions.crmOpportunityId,
      propertyStreet: submissions.propertyStreet,
      propertyCity: submissions.propertyCity,
      createdAt: submissions.createdAt,
    })
    .from(submissions)
    .orderBy(desc(submissions.createdAt))
    .limit(15);
  for (const r of rows) {
    const sync = r.crmSyncedAt ? `synced→${r.crmOpportunityId}` : "(unsynced)";
    const signed = r.signedAt ? r.signedAt.toISOString().slice(0, 10) : "-";
    console.log(
      `${r.createdAt.toISOString().slice(0, 16)}  ${r.status.padEnd(20)}  signed=${signed}  ${sync}  ${r.id}  ${r.propertyStreet ?? "-"}, ${r.propertyCity ?? "-"}`,
    );
  }
}
void main().then(() => process.exit(0));
