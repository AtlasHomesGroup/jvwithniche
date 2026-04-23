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

export function ProbateDiscovery() {
  const form = useFormContext<FullFormData>();
  const probateOpen = form.watch("probate_isProbateOpened");
  const multipleHeirs = form.watch("probate_multipleHeirs");

  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="probate_deceasedFullName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Deceased full name</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="probate_dateOfDeath"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Date of death (if known)</FormLabel>
            <FormControl>
              <Input type="date" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="probate_isProbateOpened"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>Is probate opened?</FormLabel>
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

      {probateOpen === "Yes" && (
        <div className="space-y-5 rounded-lg border border-brand-navy/10 bg-brand-navy-light/40 p-4">
          <FormField
            control={form.control}
            name="probate_executorName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Executor / personal representative name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="probate_executorContact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Executor contact info</FormLabel>
                <FormControl>
                  <Input placeholder="Phone or email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="probate_probateCourt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Probate court / county</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}

      <FormField
        control={form.control}
        name="probate_willExists"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>Does a will exist?</FormLabel>
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
        name="probate_multipleHeirs"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>Are there multiple heirs?</FormLabel>
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

      {multipleHeirs === "Yes" && (
        <FormField
          control={form.control}
          name="probate_heirsDetail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>How many heirs, and are they in agreement about selling?</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="probate_outstandingLiens"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Any outstanding liens / mortgages on the property?</FormLabel>
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
