"use client";

import { useFormContext } from "react-hook-form";

import { StepHeading } from "./step-setter";
import type { FullFormData } from "@/lib/form-schema";

/** Temporary placeholder for steps 4-6 until the next commits wire them. */
export function StepPlaceholder({
  stepNumber,
  stepTitle,
  milestone,
}: {
  stepNumber: number;
  stepTitle: string;
  milestone: string;
}) {
  const form = useFormContext<FullFormData>();
  const dealType = form.watch("dealType");

  return (
    <div className="space-y-6">
      <StepHeading
        eyebrow={`Step ${stepNumber} · ${stepTitle}`}
        title="Coming up in the next build."
        description={`${milestone} will wire this step. Your draft so far is saved - you can come back at any time within 7 days.`}
      />
      <div className="rounded-lg border border-dashed border-border bg-brand-cream/50 p-6 text-sm text-brand-text-muted">
        <p>
          Deal type selected:{" "}
          <span className="font-medium text-brand-navy">
            {dealType ?? "(none yet)"}
          </span>
        </p>
      </div>
    </div>
  );
}
