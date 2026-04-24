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

export function SurplusFundsDiscovery() {
  const form = useFormContext<FullFormData>();

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <FormField
          control={form.control}
          name="sf_auctionDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Auction / foreclosure sale date <OptionalTag /></FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="sf_estimatedSurplusAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estimated surplus funds amount <OptionalTag /></FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-brand-text-muted">
                    $
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    className="pl-7"
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      field.onChange(v === "" ? undefined : Number(v));
                    }}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="sf_formerOwnerNotified"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>
              Has the former owner been notified of their right to claim?
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
        name="sf_otherApproachedFormerOwner"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>
              Has anyone else already approached the former owner about the
              surplus?
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
        name="sf_countyJurisdiction"
        render={({ field }) => (
          <FormItem>
            <FormLabel>County / jurisdiction of the foreclosure <OptionalTag /></FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="sf_claimTimeline"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Estimated claim processing timeline <OptionalTag /></FormLabel>
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
