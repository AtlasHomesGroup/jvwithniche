import Link from "next/link";
import { Download, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DEAL_TYPES } from "@/lib/form-schema";
import {
  ALL_STATUSES,
  listSavedFiltersFor,
  listSubmissions,
  type SubmissionStatus,
} from "@/lib/admin/queries";
import { requireAdminSession } from "@/lib/admin/session";
import { StatusBadge } from "../_components/status-badge";
import { FilterBar } from "./_components/filter-bar";
import { SavedFilters } from "./_components/saved-filters";

export const metadata = {
  title: "Submissions · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface Search {
  status?: string;
  dealType?: string;
  q?: string;
  page?: string;
}

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const admin = await requireAdminSession();
  const sp = await searchParams;
  const status = ALL_STATUSES.includes(sp.status as SubmissionStatus)
    ? (sp.status as SubmissionStatus)
    : undefined;
  const dealType = DEAL_TYPES.includes(sp.dealType as (typeof DEAL_TYPES)[number])
    ? sp.dealType
    : undefined;
  const search = typeof sp.q === "string" ? sp.q : "";
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const pageSize = 25;

  const [{ rows, total }, savedFilters] = await Promise.all([
    listSubmissions({
      status,
      dealType,
      search,
      page,
      pageSize,
    }),
    listSavedFiltersFor(admin.id),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const currentUrl = buildCurrentUrl(sp);
  const csvUrl = buildCsvUrl(sp);
  const hasFiltersApplied = hasFilters(sp);

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-3 sm:flex-col sm:items-start">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
            Submissions
          </h1>
          <p className="mt-1 text-sm text-brand-text-muted">
            {total.toLocaleString()} {total === 1 ? "submission" : "submissions"}{" "}
            {hasFiltersApplied ? "match your filters" : "in the portal"}.
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <a href={csvUrl} download>
            <Download className="mr-2 h-4 w-4" aria-hidden />
            Export CSV
          </a>
        </Button>
      </header>

      <FilterBar
        initialStatus={status ?? ""}
        initialDealType={dealType ?? ""}
        initialSearch={search}
      />

      <SavedFilters
        initial={savedFilters.map((f) => ({
          id: f.id,
          name: f.name,
          url: f.url,
        }))}
        currentUrl={currentUrl}
        currentHasFilters={hasFiltersApplied}
      />

      <div className="overflow-hidden rounded-xl border border-brand-navy/10 bg-white">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-brand-cream/60 text-[11px] uppercase tracking-[0.12em] text-brand-text-muted">
            <tr>
              <Th>Created</Th>
              <Th>Setter</Th>
              <Th>Property</Th>
              <Th>Deal</Th>
              <Th>Status</Th>
              <Th>Integrations</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-t border-brand-navy/5 hover:bg-brand-cream/30"
              >
                <Td>
                  <div>{formatDate(row.createdAt)}</div>
                  <div className="text-[11px] text-brand-text-muted">
                    {relTime(row.createdAt)}
                  </div>
                </Td>
                <Td>
                  <div className="truncate">{row.submitterEmail ?? "—"}</div>
                  <div className="text-[11px] text-brand-text-muted">
                    {row.submitterPhoneE164 ?? ""}
                  </div>
                </Td>
                <Td className="max-w-[260px]">
                  <div className="truncate">{propertyLine(row)}</div>
                </Td>
                <Td>{row.dealType ?? "—"}</Td>
                <Td>
                  <StatusBadge status={row.status} />
                </Td>
                <Td>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <IntegrationDot
                      ok={!!row.crmOpportunityId}
                      label="CRM"
                      title={row.crmOpportunityId ?? "Not synced"}
                    />
                    <IntegrationDot
                      ok={!!row.whatsappGroupId}
                      label="WA"
                      title={row.whatsappGroupId ?? "No group"}
                    />
                    <IntegrationDot
                      ok={!!row.signedPdfUrl}
                      label="PDF"
                      title={row.signedPdfUrl ?? "Not signed"}
                    />
                  </div>
                </Td>
                <Td>
                  <Link
                    href={`/admin/submissions/${row.id}`}
                    className="inline-flex items-center gap-1 text-brand-navy hover:text-brand-orange"
                  >
                    Open
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </Link>
                </Td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-[13px] text-brand-text-muted"
                >
                  No submissions match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} searchParams={sp} />
      )}
    </div>
  );
}

function hasFilters(sp: Search): boolean {
  return Boolean(sp.status || sp.dealType || (sp.q && sp.q.trim()));
}

function buildCurrentUrl(sp: Search): string {
  const qs = new URLSearchParams();
  if (sp.status) qs.set("status", sp.status);
  if (sp.dealType) qs.set("dealType", sp.dealType);
  if (sp.q) qs.set("q", sp.q);
  if (sp.page && sp.page !== "1") qs.set("page", sp.page);
  const s = qs.toString();
  return s ? `/admin/submissions?${s}` : "/admin/submissions";
}

function buildCsvUrl(sp: Search): string {
  const qs = new URLSearchParams();
  if (sp.status) qs.set("status", sp.status);
  if (sp.dealType) qs.set("dealType", sp.dealType);
  if (sp.q) qs.set("q", sp.q);
  const s = qs.toString();
  return s
    ? `/api/admin/submissions/export.csv?${s}`
    : "/api/admin/submissions/export.csv";
}

function IntegrationDot({
  ok,
  label,
  title,
}: {
  ok: boolean;
  label: string;
  title: string;
}) {
  return (
    <span
      title={title}
      className={`rounded px-1.5 py-0.5 font-semibold ${
        ok
          ? "bg-emerald-100 text-emerald-800"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      {label}
    </span>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-4 py-2.5 font-semibold">{children}</th>;
}

function Td({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-4 py-2.5 align-top text-brand-text-dark ${className ?? ""}`}>
      {children}
    </td>
  );
}

function propertyLine(s: {
  propertyStreet: string | null;
  propertyCity: string | null;
  propertyState: string | null;
}): string {
  return (
    [s.propertyStreet, s.propertyCity, s.propertyState]
      .filter(Boolean)
      .join(", ") || "(no property)"
  );
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function relTime(d: Date): string {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function Pagination({
  page,
  totalPages,
  searchParams,
}: {
  page: number;
  totalPages: number;
  searchParams: Search;
}) {
  const base = new URLSearchParams();
  if (searchParams.status) base.set("status", searchParams.status);
  if (searchParams.dealType) base.set("dealType", searchParams.dealType);
  if (searchParams.q) base.set("q", searchParams.q);
  const link = (p: number) => {
    const next = new URLSearchParams(base);
    if (p > 1) next.set("page", String(p));
    const qs = next.toString();
    return qs ? `/admin/submissions?${qs}` : "/admin/submissions";
  };
  return (
    <nav className="flex items-center justify-center gap-2 text-[13px]">
      <Link
        href={link(Math.max(1, page - 1))}
        className={`rounded px-3 py-1 ${
          page <= 1
            ? "pointer-events-none text-brand-text-muted opacity-50"
            : "text-brand-navy hover:bg-brand-cream"
        }`}
      >
        ← Prev
      </Link>
      <span className="text-brand-text-muted">
        Page {page} of {totalPages}
      </span>
      <Link
        href={link(Math.min(totalPages, page + 1))}
        className={`rounded px-3 py-1 ${
          page >= totalPages
            ? "pointer-events-none text-brand-text-muted opacity-50"
            : "text-brand-navy hover:bg-brand-cream"
        }`}
      >
        Next →
      </Link>
    </nav>
  );
}

