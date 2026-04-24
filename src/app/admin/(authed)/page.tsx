import Link from "next/link";
import { AlertTriangle, ExternalLink } from "lucide-react";

import {
  getFlaggedSubmissions,
  getPipelineCounts,
  getRecentSubmissions,
} from "@/lib/admin/queries";
import { StatusBadge } from "./_components/status-badge";

export const metadata = {
  title: "Dashboard · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [counts, recent, flagged] = await Promise.all([
    getPipelineCounts(),
    getRecentSubmissions(8),
    getFlaggedSubmissions(8),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-brand-text-muted">
          Portal pipeline at a glance. Deal stages and rep assignments happen in
          Salesforce — this view shows intake, signing, and sync health.
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-navy">
          Pipeline
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          <Stat label="Total" value={counts.total} href="/admin/submissions" />
          <Stat
            label="Drafts"
            value={counts.draft}
            href="/admin/submissions?status=draft"
          />
          <Stat
            label="Awaiting sig."
            value={counts.awaiting_signature}
            href="/admin/submissions?status=awaiting_signature"
          />
          <Stat
            label="CRM pending"
            value={counts.crm_sync_pending}
            href="/admin/submissions?status=crm_sync_pending"
          />
          <Stat
            label="Synced"
            value={counts.crm_synced}
            href="/admin/submissions?status=crm_synced"
          />
          <Stat
            label="Needs attention"
            value={counts.needsAttention}
            href="/admin/submissions?attention=1"
            emphasis={counts.needsAttention > 0 ? "warn" : "ok"}
          />
        </div>
      </section>

      {flagged.length > 0 && (
        <section className="rounded-xl border border-rose-200 bg-rose-50/40 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-rose-800">
            <AlertTriangle className="h-4 w-4" aria-hidden /> CRM sync failures
          </h2>
          <ol className="space-y-2">
            {flagged.map((row) => (
              <li
                key={row.id}
                className="flex items-start justify-between gap-3 rounded-lg bg-white p-3 text-[13px]"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/submissions/${row.id}`}
                    className="font-medium text-brand-navy hover:text-brand-orange"
                  >
                    {propertyLine(row)}
                  </Link>
                  <p className="mt-0.5 truncate text-[12px] text-brand-text-muted">
                    Attempt {row.queueAttempts} · {row.queueLastError ?? "(no message)"}
                  </p>
                </div>
                <StatusBadge status={row.status} />
              </li>
            ))}
          </ol>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-navy">
            Recent submissions
          </h2>
          <Link
            href="/admin/submissions"
            className="text-[12px] text-brand-text-muted hover:text-brand-orange"
          >
            View all →
          </Link>
        </div>
        <div className="overflow-hidden rounded-xl border border-brand-navy/10 bg-white">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-brand-cream/60 text-[11px] uppercase tracking-[0.12em] text-brand-text-muted">
              <tr>
                <Th>Created</Th>
                <Th>Setter</Th>
                <Th>Property</Th>
                <Th>Deal</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {recent.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-brand-navy/5 hover:bg-brand-cream/30"
                >
                  <Td>{formatDate(row.createdAt)}</Td>
                  <Td>{row.submitterEmail ?? "—"}</Td>
                  <Td className="max-w-[260px] truncate">{propertyLine(row)}</Td>
                  <Td>{row.dealType ?? "—"}</Td>
                  <Td>
                    <StatusBadge status={row.status} />
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
              {recent.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-[13px] text-brand-text-muted"
                  >
                    No submissions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  href,
  emphasis,
}: {
  label: string;
  value: number;
  href: string;
  emphasis?: "warn" | "ok";
}) {
  const tone =
    emphasis === "warn"
      ? "border-rose-200 bg-rose-50"
      : emphasis === "ok"
        ? "border-emerald-200 bg-emerald-50"
        : "border-brand-navy/10 bg-white";
  return (
    <Link
      href={href}
      className={`rounded-xl border p-4 transition-colors hover:border-brand-orange/40 hover:bg-brand-orange-light/30 ${tone}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-text-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-brand-navy">{value}</p>
    </Link>
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
    hour: "2-digit",
    minute: "2-digit",
  });
}
