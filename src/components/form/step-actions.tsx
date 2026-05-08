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
 * Final-step CTA. Full-screen overlay with backdrop-blur, big centered
 * button, and a small "Back to review" affordance. The setter has to
 * either press Generate or back out of the overlay to keep editing —
 * the button is impossible to scroll past or miss.
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
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-white/55 px-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Generate JV agreement"
    >
      <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-2xl border border-brand-navy/10 bg-white/95 p-6 text-center shadow-[0_24px_60px_rgba(27,58,92,0.18)] sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-orange">
          One last step
        </p>
        <h2 className="text-xl font-semibold tracking-tight text-brand-navy sm:text-2xl">
          Generate your JV agreement
        </h2>
        <p className="text-[13px] leading-relaxed text-brand-text-muted">
          Pressing this creates your JV agreement and emails it to you to sign. Until you do, your submission isn’t finalized.
        </p>
        <Button
          type="button"
          onClick={onNext}
          disabled={isSubmitting}
          variant="accent"
          size="lg"
          className="h-14 w-full text-base font-semibold shadow-[0_12px_40px_rgba(232,100,10,0.35)] sm:h-16 sm:text-lg"
        >
          {label}
        </Button>
        <div className="flex w-full items-center justify-between pt-2 text-[12px] text-brand-text-muted">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            disabled={isSubmitting}
            className="text-brand-text-muted hover:text-brand-navy"
          >
            <ArrowLeft className="h-4 w-4" />
            Edit my answers
          </Button>
          <AutosaveIndicator status={autosaveStatus} />
        </div>
      </div>
    </div>
  );
}
