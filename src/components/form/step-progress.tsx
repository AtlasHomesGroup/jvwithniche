"use client";

import { Fragment } from "react";
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
    <div className="mb-10">
      {/* Mobile: compact "Step X of Y" with progress bar */}
      <div className="md:hidden">
        <div className="mb-3 flex items-center justify-between text-[12px] text-brand-text-muted">
          <span className="font-semibold uppercase tracking-wider">
            Step {currentIndex + 1} of {FORM_STEPS.length}
          </span>
          <span className="font-medium text-brand-navy">
            {FORM_STEPS[currentIndex]?.label}
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full bg-brand-orange transition-all duration-500"
            style={{
              width: `${((currentIndex + 1) / FORM_STEPS.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Desktop: evenly-spaced circles with labels centered beneath */}
      <ol className="hidden items-start md:flex">
        {FORM_STEPS.map((step, i) => {
          const isCurrent = step.id === currentStep;
          const isComplete = completedSteps.has(step.id) || i < currentIndex;
          const connectorComplete = i < currentIndex;

          return (
            <Fragment key={step.id}>
              <li className="flex w-24 flex-shrink-0 flex-col items-center gap-2">
                <span
                  className={cn(
                    "relative z-10 flex h-7 w-7 items-center justify-center rounded-full border bg-white text-[12px] font-semibold transition-colors",
                    isCurrent &&
                      "border-brand-navy bg-brand-navy text-white",
                    !isCurrent &&
                      isComplete &&
                      "border-brand-orange bg-brand-orange text-white",
                    !isCurrent &&
                      !isComplete &&
                      "border-border text-brand-text-muted",
                  )}
                >
                  {isComplete && !isCurrent ? (
                    <CheckCircle2
                      className="h-4 w-4"
                      strokeWidth={2.5}
                      aria-hidden="true"
                    />
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={cn(
                    "text-center text-[11px] font-semibold uppercase leading-tight tracking-wider",
                    isCurrent
                      ? "text-brand-navy"
                      : "text-brand-text-muted",
                  )}
                >
                  {step.label}
                </span>
              </li>
              {i < FORM_STEPS.length - 1 && (
                <div
                  className={cn(
                    "mt-[13px] h-px min-w-[16px] flex-1 transition-colors",
                    connectorComplete ? "bg-brand-orange" : "bg-border",
                  )}
                  aria-hidden="true"
                />
              )}
            </Fragment>
          );
        })}
      </ol>
    </div>
  );
}
