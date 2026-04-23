"use client";

import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Form } from "@/components/ui/form";
import { StepProgress } from "@/components/form/step-progress";
import { StepActions } from "@/components/form/step-actions";
import { useDraftAutosave } from "@/hooks/use-draft-autosave";
import {
  DEFAULT_FORM_VALUES,
  DISCOVERY_FIELDS_BY_DEAL_TYPE,
  FORM_STEPS,
  STEP_FIELDS,
  fullFormSchema,
  type FormStepId,
  type FullFormData,
  type FullFormOutput,
} from "@/lib/form-schema";
import { StepSetter } from "./steps/step-setter";
import { StepProspect } from "./steps/step-prospect";
import { StepDealType } from "./steps/step-deal-type";
import { StepPlaceholder } from "./steps/step-placeholder";

export function SubmitForm({
  initialData,
}: {
  initialData: Partial<FullFormData>;
}) {
  const form = useForm<FullFormData, unknown, FullFormOutput>({
    resolver: zodResolver(fullFormSchema),
    mode: "onBlur",
    defaultValues: { ...DEFAULT_FORM_VALUES, ...initialData },
  });

  const autosaveStatus = useDraftAutosave(form);

  const [currentStep, setCurrentStep] = useState<FormStepId>("setter");
  const [completedSteps, setCompletedSteps] = useState<Set<FormStepId>>(
    new Set(),
  );

  const currentIndex = FORM_STEPS.findIndex((s) => s.id === currentStep);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === FORM_STEPS.length - 1;

  const fieldsForCurrentStep = useMemo<
    ReadonlyArray<keyof FullFormData>
  >(() => {
    if (currentStep === "discovery") {
      const dt = form.getValues("dealType");
      return dt ? DISCOVERY_FIELDS_BY_DEAL_TYPE[dt] : [];
    }
    return STEP_FIELDS[currentStep];
  }, [currentStep, form]);

  const onNext = useCallback(async () => {
    const valid = fieldsForCurrentStep.length === 0
      ? true
      : await form.trigger(fieldsForCurrentStep as (keyof FullFormData)[], {
          shouldFocus: true,
        });
    if (!valid) return;

    setCompletedSteps((prev) => new Set(prev).add(currentStep));

    if (isLast) {
      // Submission + sign wiring lands in M2 commit 5.
      console.info("[submit] final submit placeholder", form.getValues());
      return;
    }

    const next = FORM_STEPS[currentIndex + 1]?.id;
    if (next) setCurrentStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentIndex, currentStep, fieldsForCurrentStep, form, isLast]);

  const onBack = useCallback(() => {
    if (isFirst) return;
    const prev = FORM_STEPS[currentIndex - 1]?.id;
    if (prev) setCurrentStep(prev);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentIndex, isFirst]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 sm:px-4 sm:py-8">
      <StepProgress currentStep={currentStep} completedSteps={completedSteps} />

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
          {currentStep === "narrative" && (
            <StepPlaceholder
              stepNumber={4}
              stepTitle="Deal narrative"
              milestone="M2 commit 4"
            />
          )}
          {currentStep === "discovery" && (
            <StepPlaceholder
              stepNumber={5}
              stepTitle="Discovery questions"
              milestone="M2 commit 4"
            />
          )}
          {currentStep === "review" && (
            <StepPlaceholder
              stepNumber={6}
              stepTitle="Review & sign"
              milestone="M2 commit 5"
            />
          )}

          <StepActions
            isFirst={isFirst}
            isLast={isLast}
            onBack={onBack}
            onNext={() => void onNext()}
            isSubmitting={form.formState.isSubmitting}
            autosaveStatus={autosaveStatus}
          />
        </form>
      </Form>
    </div>
  );
}
