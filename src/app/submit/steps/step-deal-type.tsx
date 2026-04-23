"use client";

import { useFormContext } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEAL_TYPES, type FullFormData } from "@/lib/form-schema";
import { StepHeading } from "./step-setter";

const DEAL_TYPE_DESCRIPTIONS: Record<(typeof DEAL_TYPES)[number], string> = {
  "Pre-foreclosure":
    "Homeowner behind on payments; auction / foreclosure sale approaching.",
  NOD: "Notice of Default filed; formal foreclosure process has started.",
  "Surplus Funds":
    "Property sold at auction and surplus funds from the sale are claimable.",
  Divorce:
    "Separation or divorce forcing a property sale; parties may or may not agree.",
  Probate:
    "Owner is deceased; probate has been or needs to be opened.",
  "Pre-probate":
    "Owner is deceased; probate not yet opened. Heir(s) considering options.",
};

export function StepDealType() {
  const form = useFormContext<FullFormData>();

  return (
    <div className="space-y-6">
      <StepHeading
        eyebrow="Step 3 · Deal type"
        title="What kind of situation is this?"
        description="Your selection tailors the discovery questions in the next step."
      />

      <FormField
        control={form.control}
        name="dealType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Deal type</FormLabel>
            <Select value={field.value ?? ""} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a deal type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {DEAL_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {form.watch("dealType") && (
        <div className="rounded-lg border border-brand-navy/10 bg-brand-cream p-4 text-sm text-brand-text-muted">
          <p className="font-medium text-brand-navy">
            {form.watch("dealType")}
          </p>
          <p className="mt-1">
            {DEAL_TYPE_DESCRIPTIONS[form.watch("dealType")!]}
          </p>
        </div>
      )}
    </div>
  );
}
