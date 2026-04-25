"use client";

import { useFormContext } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ScaleField } from "@/components/form/scale-field";
import type { FullFormData } from "@/lib/form-schema";
import { RequiredLegend, StepHeading } from "./step-setter";
import { ForeclosureDiscovery } from "./discovery/foreclosure";
import { ProbateDiscovery } from "./discovery/probate";
import { PreProbateDiscovery } from "./discovery/pre-probate";
import { SurplusFundsDiscovery } from "./discovery/surplus-funds";
import { DivorceDiscovery } from "./discovery/divorce";

export function StepDiscovery() {
  const form = useFormContext<FullFormData>();
  const dealType = form.watch("dealType");

  return (
    <div className="space-y-8">
      <StepHeading
        eyebrow={
          dealType
            ? `Step 5 · Discovery · ${dealType}`
            : "Step 5 · Discovery"
        }
        title="How urgent is this for the prospect?"
        description={
          dealType
            ? "Rate their urgency from 1 to 10. Below that, a handful of optional questions specific to this deal type - fill what you know, skip what you don't."
            : "Rate the prospect's urgency from 1 to 10. Back up to step 3 to pick a deal type if you want deal-specific questions too."
        }
      />
      <RequiredLegend />

      <FormField
        control={form.control}
        name="urgencyScale"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel required>
              Prospect&apos;s urgency - 1 to 10
            </FormLabel>
            <FormControl>
              <ScaleField
                value={field.value}
                onValueChange={field.onChange}
                min={1}
                max={10}
                lowLabel="In denial"
                highLabel="Ready to act"
                invalid={!!fieldState.error}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {dealType && (
        <div className="space-y-6 rounded-xl border border-brand-navy/10 bg-brand-cream/40 p-5 sm:p-4">
          <p className="text-[12px] text-brand-text-muted">
            {hasScript(dealType)
              ? "Optional deal-type-specific context. Every field below is optional."
              : "We don't have a scripted discovery flow for this deal type yet. Use the narrative step to describe any details."}
          </p>

          {dealType === "Foreclosure" && <ForeclosureDiscovery />}
          {dealType === "Probate" && <ProbateDiscovery />}
          {dealType === "Pre-Probate" && <PreProbateDiscovery />}
          {dealType === "Surplus Funds" && <SurplusFundsDiscovery />}
          {dealType === "Divorce" && <DivorceDiscovery />}
        </div>
      )}
    </div>
  );
}

function hasScript(dealType: string): boolean {
  return (
    dealType === "Foreclosure" ||
    dealType === "Probate" ||
    dealType === "Pre-Probate" ||
    dealType === "Surplus Funds" ||
    dealType === "Divorce"
  );
}
