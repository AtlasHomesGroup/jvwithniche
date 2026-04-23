"use client";

import { useFormContext } from "react-hook-form";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ASSISTANCE_OPTIONS, type FullFormData } from "@/lib/form-schema";
import { StepHeading } from "./step-setter";

export function StepNarrative() {
  const form = useFormContext<FullFormData>();
  const assistance = form.watch("assistanceRequested") ?? [];
  const hasOther = assistance.includes("Other");

  return (
    <div className="space-y-6">
      <StepHeading
        eyebrow="Step 4 · Deal narrative"
        title="Tell us the story."
        description="What's going on with this prospect, what you've learned so far, and what you need from Niche."
      />

      <FormField
        control={form.control}
        name="challenge"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Explain the specific challenge with this prospect
            </FormLabel>
            <FormControl>
              <Textarea rows={4} {...field} />
            </FormControl>
            <FormDescription>Minimum 40 characters.</FormDescription>
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
              Summary of the prospect&apos;s situation after speaking with them
            </FormLabel>
            <FormControl>
              <Textarea rows={4} {...field} />
            </FormControl>
            <FormDescription>Minimum 40 characters.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="equityEstimateReasoning"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Equity estimate — with specific reasoning</FormLabel>
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
            <FormLabel>What assistance are you seeking in the JV?</FormLabel>
            <FormControl>
              <div
                className="grid gap-3 sm:grid-cols-1 md:grid-cols-2"
                aria-invalid={!!fieldState.error}
              >
                {ASSISTANCE_OPTIONS.map((option) => {
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
              <FormLabel>Other assistance — describe</FormLabel>
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
            <FormLabel>Why do you believe this deal has potential?</FormLabel>
            <FormControl>
              <Textarea rows={4} {...field} />
            </FormControl>
            <FormDescription>Minimum 40 characters.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="additionalInfo"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Anything else we should know? (optional)</FormLabel>
            <FormControl>
              <Textarea rows={3} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Keep the label reference so the visualizer hint is silent */}
      <Label className="sr-only">spacer</Label>
    </div>
  );
}
