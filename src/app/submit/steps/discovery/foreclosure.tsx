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
import { YesNoField } from "@/components/form/yes-no-field";
import type { FullFormData } from "@/lib/form-schema";
import { OptionalTag } from "../step-setter";

export function ForeclosureDiscovery() {
  const form = useFormContext<FullFormData>();

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <FormField
          control={form.control}
          name="foreclosure_auctionDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Auction date (if known) <OptionalTag /></FormLabel>
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
              <FormLabel>Auction time (if known) <OptionalTag /></FormLabel>
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
        render={({ field }) => (
          <FormItem>
            <FormLabel>Is the prospect the only owner on title? <OptionalTag /></FormLabel>
            <FormControl>
              <YesNoField
                value={field.value}
                onValueChange={field.onChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {form.watch("foreclosure_onlyOwnerOnTitle") === "No" && (
        <FormField
          control={form.control}
          name="foreclosure_otherOwners"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Who else is on title? <OptionalTag /></FormLabel>
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
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Does the prospect have a recent mortgage statement? <OptionalTag />
            </FormLabel>
            <FormControl>
              <YesNoField
                value={field.value}
                onValueChange={field.onChange}
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
              More than one mortgage? Or COVID assistance / HAF? <OptionalTag />
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
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Did the lender ever tell them money would be put on the back end?{" "}
              <OptionalTag />
            </FormLabel>
            <FormControl>
              <YesNoField
                value={field.value}
                onValueChange={field.onChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="foreclosure_paymentsMissed"
        render={({ field }) => (
          <FormItem>
            <FormLabel>How many payments missed? <OptionalTag /></FormLabel>
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

      <FormField
        control={form.control}
        name="foreclosure_hardshipReason"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Hardship reason - what caused them to fall behind? <OptionalTag /></FormLabel>
            <FormControl>
              <Textarea rows={4} {...field} />
            </FormControl>
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
              Magic wand - reasonable outcome from their perspective?{" "}
              <OptionalTag />
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
