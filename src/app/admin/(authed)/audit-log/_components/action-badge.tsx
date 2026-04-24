const LABELS: Record<string, string> = {
  retry_crm: "Retry CRM",
  resend_signing_email: "Resend signing",
  delete_submission: "Delete",
};

const COLORS: Record<string, string> = {
  retry_crm: "bg-blue-50 text-blue-800 border-blue-200",
  resend_signing_email: "bg-amber-50 text-amber-800 border-amber-200",
  delete_submission: "bg-rose-50 text-rose-800 border-rose-200",
};

export function ActionBadge({ actionType }: { actionType: string }) {
  const label = LABELS[actionType] ?? actionType;
  const color =
    COLORS[actionType] ?? "bg-slate-100 text-slate-800 border-slate-200";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${color}`}
    >
      {label}
    </span>
  );
}
