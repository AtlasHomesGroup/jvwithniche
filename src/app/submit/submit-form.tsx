"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Form } from "@/components/ui/form";
import { StepProgress } from "@/components/form/step-progress";
import { StepActions } from "@/components/form/step-actions";
import { HoneypotField } from "@/components/form/honeypot-field";
import { useDraftAutosave } from "@/hooks/use-draft-autosave";
import { useRecaptcha } from "@/hooks/use-recaptcha";
import {
  DEFAULT_FORM_VALUES,
  FORM_STEPS,
  STEP_FIELDS,
  dealTypeSchema,
  fullFormSchema,
  narrativeSchema,
  prospectSchema,
  setterSchema,
  urgencySchema,
  type FormStepId,
  type FullFormData,
  type FullFormOutput,
} from "@/lib/form-schema";
import type { ZodType } from "zod";
import { StepSetter } from "./steps/step-setter";
import { StepProspect } from "./steps/step-prospect";
import { StepDealType } from "./steps/step-deal-type";
import { StepNarrative } from "./steps/step-narrative";
import { StepDiscovery } from "./steps/step-discovery";
import { StepReview } from "./steps/step-review";
import { GeneratingOverlay } from "./_components/generating-overlay";

export function SubmitForm({
  initialData,
}: {
  initialData: Partial<FullFormData>;
}) {
  const router = useRouter();

  const form = useForm<FullFormData, unknown, FullFormOutput>({
    resolver: zodResolver(fullFormSchema),
    mode: "onBlur",
    defaultValues: { ...DEFAULT_FORM_VALUES, ...initialData },
  });

  const autosaveStatus = useDraftAutosave(form);
  const { execute: executeRecaptcha } = useRecaptcha();
  const honeypotRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState<FormStepId>("setter");
  const [completedSteps, setCompletedSteps] = useState<Set<FormStepId>>(
    new Set(),
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentIndex = FORM_STEPS.findIndex((s) => s.id === currentStep);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === FORM_STEPS.length - 1;

  const fieldsForCurrentStep = useMemo<
    ReadonlyArray<keyof FullFormData>
  >(() => STEP_FIELDS[currentStep], [currentStep]);

  /** Per-step STRICT schema that actually enforces required fields -
   *  distinct from the permissive fullFormSchema used for draft autosave.
   *  Null = no strict validation on this step. */
  const stepStrictSchemas = useMemo<
    Record<FormStepId, ZodType | null>
  >(
    () => ({
      setter: setterSchema,
      prospect: prospectSchema,
      dealType: dealTypeSchema,
      narrative: narrativeSchema,
      discovery: urgencySchema,
      review: null,
    }),
    [],
  );

  const validateStep = useCallback(
    (step: FormStepId): boolean => {
      const schema = stepStrictSchemas[step];
      if (!schema) return true;
      const values = form.getValues();
      const result = schema.safeParse(values);
      if (result.success) return true;
      // Surface each issue on the form.
      for (const issue of result.error.issues) {
        const path = issue.path.join(".") as keyof FullFormData;
        form.setError(path, {
          type: "server",
          message: issue.message,
        });
      }
      const firstPath = result.error.issues[0]?.path.join(
        ".",
      ) as keyof FullFormData | undefined;
      if (firstPath) form.setFocus(firstPath);
      return false;
    },
    [form, stepStrictSchemas],
  );

  const goToStep = useCallback((step: FormStepId) => {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const submitForSigning = useCallback(async () => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const recaptchaToken = await executeRecaptcha("submit_jv").catch(() => "");
      const honeypot = honeypotRef.current?.value ?? "";

      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ recaptchaToken, honeypot }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (body?.error === "validation_failed" && body.fieldErrors) {
          // Map server errors onto the form so the user can see them.
          for (const [path, messages] of Object.entries(
            body.fieldErrors as Record<string, string[]>,
          )) {
            form.setError(path as keyof FullFormData, {
              type: "server",
              message: messages.join("; "),
            });
          }
          setSubmitError(
            "Some answers are incomplete. Click Edit on the section above to fix them.",
          );
          return;
        }
        if (body?.error === "captcha_failed") {
          setSubmitError(
            "We couldn't verify you're human - please try again.",
          );
          return;
        }
        setSubmitError(body?.message ?? "Submission failed. Please retry.");
        return;
      }

      if (body?.next) {
        router.push(body.next);
      } else {
        // Silent bot-rejection path: show a friendly "thanks" anyway.
        router.push("/");
      }
    } catch (err) {
      console.error("[submit] exception", err);
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [executeRecaptcha, form, router]);

  const onNext = useCallback(async () => {
    // Flat-schema trigger first (surfaces format issues like invalid email).
    const triggeredOk = fieldsForCurrentStep.length === 0
      ? true
      : await form.trigger(fieldsForCurrentStep as (keyof FullFormData)[], {
          shouldFocus: true,
        });
    if (!triggeredOk) return;
    // Strict per-step validation - catches missing required fields that
    // the permissive fullFormSchema lets through.
    if (!validateStep(currentStep)) return;

    setCompletedSteps((prev) => new Set(prev).add(currentStep));

    if (isLast) {
      await submitForSigning();
      return;
    }

    const next = FORM_STEPS[currentIndex + 1]?.id;
    if (next) goToStep(next);
  }, [
    currentIndex,
    currentStep,
    fieldsForCurrentStep,
    form,
    goToStep,
    isLast,
    submitForSigning,
    validateStep,
  ]);

  const onBack = useCallback(() => {
    if (isFirst) return;
    const prev = FORM_STEPS[currentIndex - 1]?.id;
    if (prev) goToStep(prev);
  }, [currentIndex, goToStep, isFirst]);

  /** Handle clicks on the step markers.
   *  - Backward jumps are always allowed.
   *  - Forward jumps validate the current step (and every step in between)
   *    and only proceed if all required fields are filled. */
  const onStepClick = useCallback(
    async (target: FormStepId) => {
      const targetIndex = FORM_STEPS.findIndex((s) => s.id === target);
      if (targetIndex === -1) return;

      // Backward - unconditional.
      if (targetIndex <= currentIndex) {
        goToStep(target);
        return;
      }

      // Forward - run both the RHF trigger AND the strict schema on each
      // step between current (inclusive) and target (exclusive). Bail at
      // the first incomplete step so the user lands there to fix it.
      for (let i = currentIndex; i < targetIndex; i++) {
        const stepId = FORM_STEPS[i]!.id;
        const fields = STEP_FIELDS[stepId];
        if (fields.length > 0) {
          const triggered = await form.trigger(
            fields as (keyof FullFormData)[],
            { shouldFocus: i === currentIndex },
          );
          if (!triggered) {
            goToStep(stepId);
            return;
          }
        }
        if (!validateStep(stepId)) {
          goToStep(stepId);
          return;
        }
        setCompletedSteps((prev) => new Set(prev).add(stepId));
      }
      goToStep(target);
    },
    [currentIndex, form, goToStep, validateStep],
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 sm:px-4 sm:py-8">
      <StepProgress
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={(step) => void onStepClick(step)}
      />

      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onNext();
          }}
          className="rounded-2xl border border-brand-navy/10 bg-white p-6 shadow-[0_8px_30px_rgba(27,58,92,0.04)] sm:p-5"
        >
          {currentStep === "setter" && <StepSetter />}
          {currentStep === "prospect" && <StepProspect />}
          {currentStep === "dealType" && <StepDealType />}
          {currentStep === "narrative" && <StepNarrative />}
          {currentStep === "discovery" && <StepDiscovery />}
          {currentStep === "review" && <StepReview onEditStep={goToStep} />}

          <HoneypotField ref={honeypotRef} />

          {submitError && (
            <div
              role="alert"
              className="mt-6 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {submitError}
            </div>
          )}

          <StepActions
            isFirst={isFirst}
            isLast={isLast}
            onBack={onBack}
            onNext={() => void onNext()}
            isSubmitting={isSubmitting}
            nextLabel={isLast ? "Generate my JV agreement" : undefined}
            autosaveStatus={autosaveStatus}
          />

          <p className="mt-6 text-center text-[11px] text-brand-text-muted">
            This site is protected by reCAPTCHA and the Google{" "}
            <a
              className="underline hover:text-brand-orange"
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </a>{" "}
            and{" "}
            <a
              className="underline hover:text-brand-orange"
              href="https://policies.google.com/terms"
              target="_blank"
              rel="noopener noreferrer"
            >
              Terms
            </a>{" "}
            apply.
          </p>
        </form>
      </Form>
      {isSubmitting && isLast && <GeneratingOverlay />}
    </div>
  );
}
