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
import { YES_NO_INPROGRESS, type FullFormData } from "@/lib/form-schema";

export function DivorceDiscovery() {
  const form = useFormContext<FullFormData>();
  const courtOrder = form.watch("divorce_courtOrderExists");

  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="divorce_bothSpousesOnTitle"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>Are both spouses on title?</FormLabel>
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
        name="divorce_divorceFinalized"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>Is the divorce finalized?</FormLabel>
            <FormControl>
              <YesNoField
                value={field.value}
                onValueChange={field.onChange}
                options={[...YES_NO_INPROGRESS]}
                invalid={!!fieldState.error}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="divorce_bothPartiesAgreeToSell"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>Are both parties in agreement about selling?</FormLabel>
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
        name="divorce_courtOrderExists"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>Is there a court order related to the property?</FormLabel>
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

      {courtOrder === "Yes" && (
        <FormField
          control={form.control}
          name="divorce_courtOrderDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Briefly describe the court order</FormLabel>
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
        name="divorce_primaryContactSpouse"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Who is the primary contact — which spouse?</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
