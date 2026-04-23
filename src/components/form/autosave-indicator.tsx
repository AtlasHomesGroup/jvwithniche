"use client";

import { CheckCircle2, CircleAlert, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AutosaveStatus } from "@/hooks/use-draft-autosave";

export function AutosaveIndicator({
  status,
  className,
}: {
  status: AutosaveStatus;
  className?: string;
}) {
  if (status === "idle") return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[12px] font-medium",
        status === "saving" && "text-brand-text-muted",
        status === "saved" && "text-brand-success",
        status === "error" && "text-destructive",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {status === "saving" && (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Saving draft…
        </>
      )}
      {status === "saved" && (
        <>
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          Draft saved
        </>
      )}
      {status === "error" && (
        <>
          <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
          Couldn&apos;t save — we&apos;ll retry
        </>
      )}
    </span>
  );
}
