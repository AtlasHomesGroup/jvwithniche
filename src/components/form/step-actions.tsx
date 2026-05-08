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
  if (isLast) {
    return (
      <GenerateOverlay
        onBack={onBack}
        onNext={onNext}
        isSubmitting={isSubmitting}
        autosaveStatus={autosaveStatus}
        label={nextLabel ?? "Generate my JV agreement"}
      />
    );
  }

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
        variant="default"
        size="lg"
      >
        {nextLabel ?? "Continue"}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

/**
 * Final-step CTA. The big "Generate my JV agreement" button has to be
 * impossible to miss — too many setters reach the review screen, scan
 * the summary, then close the tab without pressing the button. This
 * fixes a centered, oversized button on a backdrop-blur overlay so the
 * action is forced.
 */
function GenerateOverlay({
  onBack,
  onNext,
  isSubmitting,
  autosaveStatus,
  label,
}: {
  onBack: () => void;
  onNext: () => void;
  isSubmitting: boolean;
  autosaveStatus: AutosaveStatus;
  label: string;
}) {
  return (
    <>
      {/* Spacer so the page content doesn't sit under the fixed bar. */}
      <div aria-hidden className="h-56" />
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-navy/10 bg-white/65 px-4 py-6 backdrop-blur-md"
        role="region"
        aria-label="Generate JV agreement"
      >
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4">
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.18em] text-brand-orange">
            One last step
          </p>
          <Button
            type="button"
            onClick={onNext}
            disabled={isSubmitting}
            variant="accent"
            size="lg"
            className="h-14 w-full max-w-md text-base font-semibold shadow-[0_12px_40px_rgba(232,100,10,0.35)] sm:h-16 sm:text-lg"
          >
            {label}
          </Button>
          <p className="text-center text-[12px] text-brand-text-muted">
            Pressing this generates your JV agreement and emails it to you to sign.
          </p>
          <div className="flex w-full max-w-md items-center justify-between text-[12px] text-brand-text-muted">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onBack}
              disabled={isSubmitting}
              className="text-brand-text-muted hover:text-brand-navy"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to review
            </Button>
            <AutosaveIndicator status={autosaveStatus} />
          </div>
        </div>
      </div>
    </>
  );
}
