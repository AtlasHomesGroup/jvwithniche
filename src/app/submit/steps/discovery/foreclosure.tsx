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
import { YesNoField } from "@/components/form/yes-no-field";
import { ScaleField } from "@/components/form/scale-field";
import type { FullFormData } from "@/lib/form-schema";

export function ForeclosureDiscovery() {
  const form = useFormContext<FullFormData>();
  const onlyOwner = form.watch("foreclosure_onlyOwnerOnTitle");

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <FormField
          control={form.control}
          name="foreclosure_auctionDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Auction date (if known)</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="foreclosure_auctionTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Auction time (if known)</FormLabel>
              <FormControl>
                <Input type="time" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="foreclosure_onlyOwnerOnTitle"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>Is the prospect the only owner on title?</FormLabel>
            <FormControl>
              <YesNoField
                value={field.value}
                onValueChange={field.onChange}
                invalid={!!fieldState.error}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {onlyOwner === "No" && (
        <FormField
          control={form.control}
          name="foreclosure_otherOwners"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Who else is on title?</FormLabel>
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
        name="foreclosure_recentMortgageStatement"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>
              Does the prospect have a recent mortgage statement?
            </FormLabel>
            <FormControl>
              <YesNoField
                value={field.value}
                onValueChange={field.onChange}
                invalid={!!fieldState.error}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="foreclosure_multipleMortgagesOrHaf"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              More than one mortgage on the property? Or COVID assistance / HAF?
            </FormLabel>
            <FormControl>
              <Textarea rows={3} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="foreclosure_lenderBackendPromise"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>
              Did the lender ever tell them money would be put on the back end
              of the loan?
            </FormLabel>
            <FormControl>
              <YesNoField
                value={field.value}
                onValueChange={field.onChange}
                invalid={!!fieldState.error}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="foreclosure_urgencyScale"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>Prospect&apos;s urgency — 1 to 10</FormLabel>
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

      <div className="grid gap-5 md:grid-cols-2">
        <FormField
          control={form.control}
          name="foreclosure_paymentsMissed"
          render={({ field }) => (
            <FormItem>
              <FormLabel>How many payments missed?</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    field.onChange(v === "" ? undefined : Number(v));
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="foreclosure_hardshipReason"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Hardship reason — what caused them to fall behind?</FormLabel>
            <FormControl>
              <Textarea rows={4} {...field} />
            </FormControl>
            <FormDescription>
              Ask honestly — hardship programs may be available and may need
              supporting documentation.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="foreclosure_magicWand"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Magic wand — reasonable outcome from the prospect&apos;s perspective?
            </FormLabel>
            <FormControl>
              <Textarea rows={4} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
