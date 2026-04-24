"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bookmark, BookmarkPlus, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AdminSavedFilter } from "@/db/schema";

interface Props {
  initial: Array<Pick<AdminSavedFilter, "id" | "name" | "url">>;
  currentUrl: string;
  currentHasFilters: boolean;
}

export function SavedFilters({
  initial,
  currentUrl,
  currentHasFilters,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function saveCurrent() {
    if (!currentHasFilters || saving) return;
    const name = prompt("Name this filter preset (e.g. 'CRM pending, last 30d'):");
    if (!name || !name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/saved-filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), url: currentUrl }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || `Failed (${res.status})`);
      setItems([{ id: body.row.id, name: body.row.name, url: body.row.url }, ...items]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this saved filter?")) return;
    try {
      const res = await fetch(
        `/api/admin/saved-filters?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      setItems(items.filter((i) => i.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (items.length === 0 && !currentHasFilters) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-navy/10 bg-brand-cream/40 p-3 text-[12px]">
      <div className="flex items-center gap-1.5 font-semibold text-brand-navy">
        <Bookmark className="h-3.5 w-3.5 text-brand-orange" aria-hidden />
        Saved filters
      </div>
      {items.length === 0 && (
        <span className="text-brand-text-muted">
          None yet — apply some filters and hit &quot;Save current&quot;.
        </span>
      )}
      {items.map((item) => (
        <span
          key={item.id}
          className="inline-flex items-center gap-1 rounded-full border border-brand-navy/15 bg-white px-2 py-0.5"
        >
          <button
            type="button"
            onClick={() => router.push(item.url)}
            className="hover:text-brand-orange"
          >
            {item.name}
          </button>
          <button
            type="button"
            onClick={() => remove(item.id)}
            className="text-brand-text-muted hover:text-destructive"
            aria-label={`Remove ${item.name}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {currentHasFilters && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={saveCurrent}
          disabled={saving}
          className="h-7 px-2 text-[12px]"
        >
          {saving ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Saving
            </>
          ) : (
            <>
              <BookmarkPlus className="mr-1 h-3 w-3" />
              Save current
            </>
          )}
        </Button>
      )}
    </div>
  );
}
