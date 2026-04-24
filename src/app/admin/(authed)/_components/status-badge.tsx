import type { SubmissionStatus } from "@/lib/admin/constants";

const LABELS: Record<SubmissionStatus, string> = {
  draft: "Draft",
  awaiting_signature: "Awaiting signature",
  crm_sync_pending: "CRM sync pending",
  crm_synced: "Synced",
  failed: "Failed",
};

const COLORS: Record<SubmissionStatus, string> = {
  draft: "bg-slate-100 text-slate-800 border-slate-200",
  awaiting_signature: "bg-amber-50 text-amber-800 border-amber-200",
  crm_sync_pending: "bg-blue-50 text-blue-800 border-blue-200",
  crm_synced: "bg-emerald-50 text-emerald-800 border-emerald-200",
  failed: "bg-rose-50 text-rose-800 border-rose-200",
};

export function StatusBadge({ status }: { status: SubmissionStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${COLORS[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
