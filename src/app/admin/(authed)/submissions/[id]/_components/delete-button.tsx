"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function DeleteButton({
  submissionId,
  label,
}: {
  submissionId: string;
  label: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (submitting) return;
    const confirmation = prompt(
      `This will permanently delete the submission "${label}" plus every note, attachment, and signed PDF attached to it.\n\nType DELETE to confirm:`,
    );
    if (confirmation?.trim() !== "DELETE") return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/submissions/${submissionId}/delete`,
        { method: "POST" },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.message || body.error || `Failed (${res.status})`);
      }
      router.push("/admin/submissions");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
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
        className="border-rose-200 text-rose-700 hover:bg-rose-50"
      >
        {submitting ? (
          <>
            <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
            Deleting
          </>
        ) : (
          <>
            <Trash2 className="mr-1.5 h-3 w-3" />
            Delete submission
          </>
        )}
      </Button>
      {error && (
        <span className="text-[11px] font-medium text-rose-700">{error}</span>
      )}
    </div>
  );
}
