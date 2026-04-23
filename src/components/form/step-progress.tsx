"use client";

import { CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { FORM_STEPS, type FormStepId } from "@/lib/form-schema";

export function StepProgress({
  currentStep,
  completedSteps,
}: {
  currentStep: FormStepId;
  completedSteps: ReadonlySet<FormStepId>;
}) {
  const currentIndex = FORM_STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="mb-8">
      {/* Mobile: compact step X of Y */}
      <div className="mb-3 flex items-center justify-between text-[12px] text-brand-text-muted md:hidden">
        <span className="font-semibold uppercase tracking-wider">
          Step {currentIndex + 1} of {FORM_STEPS.length}
        </span>
        <span className="font-medium text-brand-navy">
          {FORM_STEPS[currentIndex]?.label}
        </span>
      </div>

      {/* Desktop: full stepper */}
      <ol className="hidden items-center md:flex">
        {FORM_STEPS.map((step, i) => {
          const isComplete = completedSteps.has(step.id);
          const isCurrent = step.id === currentStep;
          const isPast = i < currentIndex;
          return (
            <li
              key={step.id}
              className={cn(
                "flex flex-1 items-center",
                i === FORM_STEPS.length - 1 && "flex-none",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold transition-colors",
                    isCurrent &&
                      "border-brand-navy bg-brand-navy text-white",
                    !isCurrent && (isComplete || isPast)
                      ? "border-brand-orange bg-brand-orange text-white"
                      : !isCurrent &&
                        "border-border bg-white text-brand-text-muted",
                  )}
                >
                  {isComplete || isPast ? (
                    <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} />
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={cn(
                    "whitespace-nowrap text-[12px] font-semibold uppercase tracking-wider",
                    isCurrent ? "text-brand-navy" : "text-brand-text-muted",
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < FORM_STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-3 h-px flex-1",
                    isComplete || isPast ? "bg-brand-orange" : "bg-border",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Mobile bar */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-border md:hidden">
        <div
          className="h-full bg-brand-orange transition-all duration-500"
          style={{
            width: `${((currentIndex + 1) / FORM_STEPS.length) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
