import Link from "next/link";

import { listAdminActions } from "@/lib/admin/queries";
import { ActionBadge } from "./_components/action-badge";

export const metadata = {
  title: "Audit log · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface Search {
  actionType?: string;
  admin?: string;
  page?: string;
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const pageSize = 50;

  const { rows, total } = await listAdminActions({
    actionType: sp.actionType,
    adminEmail: sp.admin,
    page,
    pageSize,
  });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
          Audit log
        </h1>
        <p className="mt-1 text-sm text-brand-text-muted">
          Every administrator action taken through this portal. {total.toLocaleString()}{" "}
          total {total === 1 ? "entry" : "entries"}.
        </p>
      </header>

      <FilterChips current={sp} />

      <div className="overflow-hidden rounded-xl border border-brand-navy/10 bg-white">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-brand-cream/60 text-[11px] uppercase tracking-[0.12em] text-brand-text-muted">
            <tr>
              <Th>When</Th>
              <Th>Admin</Th>
              <Th>Action</Th>
              <Th>Submission</Th>
              <Th>Details</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const details = (row.details ?? {}) as Record<string, unknown>;
              return (
                <tr
                  key={row.id}
                  className="border-t border-brand-navy/5 hover:bg-brand-cream/30"
                >
                  <Td>{formatDateTime(row.createdAt)}</Td>
                  <Td className="max-w-[220px] truncate">{row.adminEmail}</Td>
                  <Td>
                    <ActionBadge actionType={row.actionType} />
                  </Td>
                  <Td>
                    {row.submissionId ? (
                      <Link
                        href={`/admin/submissions/${row.submissionId}`}
                        className="font-mono text-[12px] text-brand-navy hover:text-brand-orange"
                      >
                        {row.submissionId.slice(0, 8)}…
                      </Link>
                    ) : (
                      <span className="font-mono text-[12px] text-brand-text-muted">
                        {typeof details.deletedSubmissionId === "string"
                          ? `${(details.deletedSubmissionId as string).slice(0, 8)}… (deleted)`
                          : "—"}
                      </span>
                    )}
                  </Td>
                  <Td className="max-w-[360px]">
                    <DetailSummary
                      actionType={row.actionType}
                      details={details}
                    />
                  </Td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-[13px] text-brand-text-muted"
                >
                  No audit entries match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-2 text-[13px]">
          <Link
            href={linkTo(sp, Math.max(1, page - 1))}
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
            href={linkTo(sp, Math.min(totalPages, page + 1))}
            className={`rounded px-3 py-1 ${
              page >= totalPages
                ? "pointer-events-none text-brand-text-muted opacity-50"
                : "text-brand-navy hover:bg-brand-cream"
            }`}
          >
            Next →
          </Link>
        </nav>
      )}
    </div>
  );
}

function FilterChips({ current }: { current: Search }) {
  const types = [
    { key: "", label: "All" },
    { key: "retry_crm", label: "Retry CRM" },
    { key: "resend_signing_email", label: "Resend signing" },
    { key: "delete_submission", label: "Delete" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 text-[12px]">
      <span className="text-brand-text-muted">Filter:</span>
      {types.map((t) => {
        const active = (current.actionType ?? "") === t.key;
        const sp = new URLSearchParams();
        if (t.key) sp.set("actionType", t.key);
        if (current.admin) sp.set("admin", current.admin);
        const href = `/admin/audit-log${sp.toString() ? `?${sp}` : ""}`;
        return (
          <Link
            key={t.key || "all"}
            href={href}
            className={`rounded-full border px-3 py-1 ${
              active
                ? "border-brand-navy bg-brand-navy text-white"
                : "border-brand-navy/20 text-brand-text-dark hover:bg-brand-cream"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

function DetailSummary({
  actionType,
  details,
}: {
  actionType: string;
  details: Record<string, unknown>;
}) {
  if (actionType === "retry_crm") {
    const outcome = String(details.outcome ?? "");
    const leadId =
      typeof details.crmOpportunityId === "string"
        ? details.crmOpportunityId
        : null;
    return (
      <span className="text-[12px] text-brand-text-dark">
        {outcome}
        {leadId && ` → ${leadId}`}
        {details.reason ? ` · ${String(details.reason).slice(0, 80)}` : ""}
      </span>
    );
  }
  if (actionType === "resend_signing_email") {
    if (details.outcome === "failed") {
      return (
        <span className="text-[12px] text-rose-700">
          failed · {String(details.body ?? "").slice(0, 80)}
        </span>
      );
    }
    return <span className="text-[12px] text-emerald-700">sent</span>;
  }
  if (actionType === "delete_submission") {
    const property = [
      details.propertyStreet,
      details.propertyCity,
      details.propertyState,
    ]
      .filter((v) => typeof v === "string" && v)
      .join(", ");
    const blobs =
      typeof details.deletedBlobCount === "number"
        ? `${details.deletedBlobCount} blob${details.deletedBlobCount === 1 ? "" : "s"}`
        : "blobs?";
    return (
      <span className="text-[12px] text-brand-text-dark">
        {property || "(no property)"} · {blobs} removed
      </span>
    );
  }
  return (
    <span className="text-[12px] text-brand-text-muted">
      {JSON.stringify(details).slice(0, 200)}
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

function formatDateTime(d: Date): string {
  return new Date(d).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function linkTo(sp: Search, page: number): string {
  const next = new URLSearchParams();
  if (sp.actionType) next.set("actionType", sp.actionType);
  if (sp.admin) next.set("admin", sp.admin);
  if (page > 1) next.set("page", String(page));
  const qs = next.toString();
  return qs ? `/admin/audit-log?${qs}` : "/admin/audit-log";
}
