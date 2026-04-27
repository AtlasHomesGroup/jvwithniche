"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";

export function RetryWhatsappButton({
  submissionId,
  alreadyCreated,
}: {
  submissionId: string;
  alreadyCreated: boolean;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function onClick() {
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch(
        `/api/admin/submissions/${submissionId}/retry-whatsapp`,
        { method: "POST" },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.message || body.error || `Failed (${res.status})`);
      }
      setResult(body.outcome?.kind ?? "ok");
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
            Creating
          </>
        ) : (
          <>
            <MessageSquare className="mr-1.5 h-3 w-3" />
            {alreadyCreated ? "Recreate group" : "Create group"}
          </>
        )}
      </Button>
      {result && (
        <span className="text-[11px] text-brand-text-muted">{result}</span>
      )}
    </div>
  );
}
