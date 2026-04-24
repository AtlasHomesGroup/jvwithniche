import { FileText, MessageSquare } from "lucide-react";

export interface UpdateRow {
  id: string;
  createdAt: string;
  updateType: "attachment" | "note";
  payload: Record<string, unknown>;
  crmSynced: boolean;
}

export function UpdateHistory({
  token,
  rows,
}: {
  token: string;
  rows: UpdateRow[];
}) {
  return (
    <ol className="space-y-3">
      {rows.map((row) => (
        <HistoryItem key={row.id} token={token} row={row} />
      ))}
    </ol>
  );
}

function HistoryItem({ token, row }: { token: string; row: UpdateRow }) {
  const ts = new Date(row.createdAt).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  if (row.updateType === "note") {
    const text = typeof row.payload.text === "string" ? row.payload.text : "";
    return (
      <li className="rounded-xl border border-brand-navy/10 bg-white p-4">
        <header className="mb-2 flex items-center justify-between gap-3 text-[11px]">
          <div className="flex items-center gap-1.5 font-semibold uppercase tracking-[0.14em] text-brand-navy">
            <MessageSquare className="h-3.5 w-3.5 text-brand-orange" aria-hidden />
            Note
          </div>
          <SyncBadge synced={row.crmSynced} ts={ts} />
        </header>
        <p className="whitespace-pre-wrap text-[13px] text-brand-text-dark">
          {text}
        </p>
      </li>
    );
  }
  const filename =
    typeof row.payload.filename === "string"
      ? row.payload.filename
      : "attachment";
  const caption =
    typeof row.payload.caption === "string" ? row.payload.caption : "";
  const size =
    typeof row.payload.size === "number"
      ? `${Math.round(row.payload.size / 1024)} KB`
      : "";
  const href = `/api/view/${token}/attachments/${row.id}`;
  return (
    <li className="rounded-xl border border-brand-navy/10 bg-white p-4">
      <header className="mb-2 flex items-center justify-between gap-3 text-[11px]">
        <div className="flex items-center gap-1.5 font-semibold uppercase tracking-[0.14em] text-brand-navy">
          <FileText className="h-3.5 w-3.5 text-brand-orange" aria-hidden />
          Attachment
        </div>
        <SyncBadge synced={row.crmSynced} ts={ts} />
      </header>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-[13px] font-medium text-brand-navy underline hover:text-brand-orange"
      >
        {filename}
      </a>
      <p className="mt-0.5 text-[11px] text-brand-text-muted">
        {[size, caption].filter(Boolean).join(" · ")}
      </p>
    </li>
  );
}

function SyncBadge({ synced, ts }: { synced: boolean; ts: string }) {
  return (
    <span className="flex items-center gap-2 text-brand-text-muted">
      <span>{ts}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          synced
            ? "bg-emerald-100 text-emerald-800"
            : "bg-amber-100 text-amber-800"
        }`}
      >
        {synced ? "Synced to CRM" : "Pending sync"}
      </span>
    </span>
  );
}
