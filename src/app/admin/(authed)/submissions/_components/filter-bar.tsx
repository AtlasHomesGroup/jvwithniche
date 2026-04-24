"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DEAL_TYPES } from "@/lib/form-schema";
import { ALL_STATUSES } from "@/lib/admin/constants";

const STATUS_LABELS: Record<(typeof ALL_STATUSES)[number], string> = {
  draft: "Draft",
  awaiting_signature: "Awaiting signature",
  crm_sync_pending: "CRM sync pending",
  crm_synced: "Synced",
  failed: "Failed",
};

export function FilterBar({
  initialStatus,
  initialDealType,
  initialSearch,
}: {
  initialStatus: string;
  initialDealType: string;
  initialSearch: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [status, setStatus] = useState(initialStatus);
  const [dealType, setDealType] = useState(initialDealType);
  const [q, setQ] = useState(initialSearch);

  function apply() {
    const next = new URLSearchParams();
    if (status) next.set("status", status);
    if (dealType) next.set("dealType", dealType);
    if (q.trim()) next.set("q", q.trim());
    router.push(`/admin/submissions${next.toString() ? `?${next}` : ""}`);
  }

  function clear() {
    setStatus("");
    setDealType("");
    setQ("");
    router.push("/admin/submissions");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    apply();
  }

  const hasFilters = Boolean(status || dealType || q.trim() || sp.get("attention"));

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-brand-navy/10 bg-white p-3"
    >
      <div className="flex flex-1 items-center gap-2 rounded-lg border border-input bg-white px-3">
        <Search className="h-4 w-4 text-brand-text-muted" aria-hidden />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search email, phone, property…"
          className="h-10 flex-1 bg-transparent text-sm outline-none"
        />
      </div>
      <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-text-muted">
        Status
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 rounded-lg border border-input bg-white px-3 text-sm font-normal normal-case tracking-normal text-brand-text-dark"
        >
          <option value="">All</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-text-muted">
        Deal type
        <select
          value={dealType}
          onChange={(e) => setDealType(e.target.value)}
          className="h-10 rounded-lg border border-input bg-white px-3 text-sm font-normal normal-case tracking-normal text-brand-text-dark"
        >
          <option value="">All</option>
          {DEAL_TYPES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" size="sm">
        Apply
      </Button>
      {hasFilters && (
        <Button type="button" size="sm" variant="ghost" onClick={clear}>
          Clear
        </Button>
      )}
    </form>
  );
}

