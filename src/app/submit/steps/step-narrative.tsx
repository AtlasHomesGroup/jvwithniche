"use client";

import { useFormContext } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  assistanceOptionsForDealType,
  type FullFormData,
} from "@/lib/form-schema";
import { OptionalTag, RequiredLegend, StepHeading } from "./step-setter";

export function StepNarrative() {
  const form = useFormContext<FullFormData>();
  const assistance = form.watch("assistanceRequested") ?? [];
  const dealType = form.watch("dealType");
  const hasOther = assistance.includes("Other");
  const visibleOptions = assistanceOptionsForDealType(dealType);

  return (
    <div className="space-y-6">
      <StepHeading
        eyebrow="Step 4 · Deal narrative"
        title="Tell us the story."
        description="The more context, the better - but only one thing here is required. Everything else is optional."
      />
      <RequiredLegend />

      <FormField
        control={form.control}
        name="challenge"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Explain the specific challenge with this prospect <OptionalTag /></FormLabel>
            <FormControl>
              <Textarea rows={4} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="situationSummary"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Summary of the prospect&apos;s situation after speaking with them{" "}
              <OptionalTag />
            </FormLabel>
            <FormControl>
              <Textarea rows={4} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="equityEstimateReasoning"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Equity estimate - with specific reasoning <OptionalTag /></FormLabel>
            <FormControl>
              <Textarea
                rows={4}
                placeholder="Example: Mortgage balance ~$150K, Zillow value avg $450K, one mortgage, clean title. Estimated equity ~$300K."
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="assistanceRequested"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel required>What assistance are you seeking in the JV?</FormLabel>
            <FormControl>
              <div
                className="grid gap-3 sm:grid-cols-1 md:grid-cols-2"
                aria-invalid={!!fieldState.error}
              >
                {visibleOptions.map((option) => {
                  const selected = (field.value ?? []).includes(option);
                  const id = `assistance-${option.replace(/\s/g, "-")}`;
                  return (
                    <label
                      key={option}
                      htmlFor={id}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-white p-3 transition-colors hover:border-brand-navy/40 hover:bg-brand-navy/5"
                    >
                      <Checkbox
                        id={id}
                        checked={selected}
                        onCheckedChange={(v) => {
                          const current = new Set(field.value ?? []);
                          if (v === true) current.add(option);
                          else current.delete(option);
                          field.onChange(Array.from(current));
                        }}
                      />
                      <span className="text-sm text-brand-text-dark">
                        {option}
                      </span>
                    </label>
                  );
                })}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {hasOther && (
        <FormField
          control={form.control}
          name="assistanceOther"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Other assistance - describe</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="potentialReasoning"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Why do you believe this deal has potential? <OptionalTag /></FormLabel>
            <FormControl>
              <Textarea rows={4} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="additionalInfo"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Anything else we should know? <OptionalTag /></FormLabel>
            <FormControl>
              <Textarea rows={3} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
