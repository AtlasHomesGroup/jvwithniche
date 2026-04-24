"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ResendSigningButton({
  submissionId,
}: {
  submissionId: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onClick() {
    if (submitting) return;
    if (
      !confirm(
        "Resend the signing email? PandaDoc will re-mail every recipient on the document.",
      )
    ) {
      return;
    }
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/admin/submissions/${submissionId}/resend-signing`,
        { method: "POST" },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.message || body.error || `Failed (${res.status})`);
      }
      setMsg("Signing email resent ✓");
      router.refresh();
      setTimeout(() => setMsg(null), 4000);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Resend failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={onClick} disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
            Resending
          </>
        ) : (
          <>
            <Mail className="mr-1.5 h-3 w-3" />
            Resend signing email
          </>
        )}
      </Button>
      {msg && (
        <span className="text-[11px] text-brand-text-muted">{msg}</span>
      )}
    </div>
  );
}
