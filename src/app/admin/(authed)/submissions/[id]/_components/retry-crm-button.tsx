"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export function RetryCrmButton({
  submissionId,
  alreadySynced,
}: {
  submissionId: string;
  alreadySynced: boolean;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function onClick() {
    if (alreadySynced) {
      const ok = window.confirm(
        "This submission is already synced. Force-push will create a NEW Salesforce Lead (and replace the stored Lead Id). Use this only if the existing Lead was deleted in Salesforce. Continue?",
      );
      if (!ok) return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch(
        `/api/admin/submissions/${submissionId}/retry-crm`,
        { method: "POST" },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.message || body.error || `Failed (${res.status})`);
      }
      const kind = body.outcome?.kind ?? "unknown";
      setResult(kind);
      router.refresh();
      setTimeout(() => setResult(null), 4000);
    } catch (err) {
      setResult(err instanceof Error ? err.message : "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={onClick}
        disabled={submitting}
      >
        {submitting ? (
          <>
            <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
            Pushing
          </>
        ) : (
          <>
            <RefreshCw className="mr-1.5 h-3 w-3" />
            {alreadySynced ? "Force resync" : "Retry sync"}
          </>
        )}
      </Button>
      {result && (
        <span className="text-[11px] text-brand-text-muted">{result}</span>
      )}
    </div>
  );
}
