import { and, desc, eq, ilike, or } from "drizzle-orm";

import { unauthorized } from "@/lib/api";
import { db } from "@/db/client";
import { submissions } from "@/db/schema";
import { getAdminSession } from "@/lib/admin/session";
import {
  ALL_STATUSES,
  type SubmissionStatus,
} from "@/lib/admin/constants";
import { DEAL_TYPES } from "@/lib/form-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ROWS = 5000;

/**
 * CSV export of the same submissions list the admin sees on /admin/submissions,
 * honouring the same filters via query params. Capped at 5k rows per
 * export - the portal is intake-only, we should never need more in one
 * shot, and larger exports belong in Salesforce anyway.
 */
export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return unauthorized("not authenticated");

  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status");
  const dealTypeParam = url.searchParams.get("dealType");
  const q = url.searchParams.get("q");

  const status = ALL_STATUSES.includes(statusParam as SubmissionStatus)
    ? (statusParam as SubmissionStatus)
    : undefined;
  const dealType = DEAL_TYPES.includes(
    dealTypeParam as (typeof DEAL_TYPES)[number],
  )
    ? dealTypeParam!
    : undefined;

  const conditions = [];
  if (status) conditions.push(eq(submissions.status, status));
  if (dealType) conditions.push(eq(submissions.dealType, dealType));
  if (q && q.trim()) {
    const like = `%${q.trim()}%`;
    conditions.push(
      or(
        ilike(submissions.submitterEmail, like),
        ilike(submissions.submitterPhoneE164, like),
        ilike(submissions.propertyStreet, like),
        ilike(submissions.propertyCity, like),
      )!,
    );
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(submissions)
    .where(whereClause)
    .orderBy(desc(submissions.createdAt))
    .limit(MAX_ROWS);

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://jvwithniche.com");
  const siteBase = siteUrl.replace(/\/$/, "");

  const headers = [
    "id",
    "created_at",
    "status",
    "submitter_email",
    "submitter_phone",
    "property_street",
    "property_city",
    "property_state",
    "deal_type",
    "signed_at",
    "crm_opportunity_id",
    "crm_synced_at",
    "whatsapp_group_id",
    "whatsapp_group_invite_link",
    "view_link",
    "admin_link",
  ];

  const csvLines = [headers.map(csvEscape).join(",")];
  for (const r of rows) {
    const cells = [
      r.id,
      r.createdAt.toISOString(),
      r.status,
      r.submitterEmail ?? "",
      r.submitterPhoneE164 ?? "",
      r.propertyStreet ?? "",
      r.propertyCity ?? "",
      r.propertyState ?? "",
      r.dealType ?? "",
      r.signedAt ? r.signedAt.toISOString() : "",
      r.crmOpportunityId ?? "",
      r.crmSyncedAt ? r.crmSyncedAt.toISOString() : "",
      r.whatsappGroupId ?? "",
      r.whatsappGroupInviteLink ?? "",
      `${siteBase}/view/${r.returnLinkToken}`,
      `${siteBase}/admin/submissions/${r.id}`,
    ];
    csvLines.push(cells.map(csvEscape).join(","));
  }
  const body = csvLines.join("\r\n");

  const filename = `jv-submissions-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  // Quote if the cell contains a comma, quote, CR, or LF. Double any
  // embedded quotes per RFC 4180.
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
