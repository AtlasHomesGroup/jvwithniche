"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AutosaveIndicator } from "@/components/form/autosave-indicator";
import type { AutosaveStatus } from "@/hooks/use-draft-autosave";

export function StepActions({
  isFirst,
  isLast,
  onBack,
  onNext,
  isSubmitting,
  nextLabel,
  autosaveStatus,
}: {
  isFirst: boolean;
  isLast: boolean;
  onBack: () => void;
  onNext: () => void;
  isSubmitting: boolean;
  nextLabel?: string;
  autosaveStatus: AutosaveStatus;
}) {
  return (
    <div className="mt-10 flex flex-col-reverse items-stretch gap-3 sm:flex-col-reverse sm:items-stretch md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        {!isFirst && (
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isSubmitting}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        )}
        <AutosaveIndicator status={autosaveStatus} />
      </div>
      <Button
        type="button"
        onClick={onNext}
        disabled={isSubmitting}
        variant={isLast ? "accent" : "default"}
        size="lg"
      >
        {nextLabel ?? (isLast ? "Submit and sign" : "Continue")}
        {!isLast && <ArrowRight className="h-4 w-4" />}
      </Button>
    </div>
  );
}
