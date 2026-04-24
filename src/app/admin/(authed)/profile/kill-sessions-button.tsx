"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export function KillSessionsButton() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (submitting) return;
    if (
      !confirm(
        "Sign out of every browser (including this one)? You'll need to sign in again.",
      )
    ) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/profile/kill-sessions", {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Failed (${res.status})`);
      }
      router.push("/admin/login");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onClick}
        disabled={submitting}
        className="border-rose-200 text-rose-700 hover:bg-rose-50"
      >
        {submitting ? (
          <>
            <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
            Signing out everywhere
          </>
        ) : (
          <>
            <ShieldAlert className="mr-1.5 h-3 w-3" />
            Sign out everywhere
          </>
        )}
      </Button>
      {error && (
        <span className="text-[11px] font-medium text-rose-700">{error}</span>
      )}
    </div>
  );
}
