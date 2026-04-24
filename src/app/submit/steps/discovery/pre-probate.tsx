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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { YesNoField } from "@/components/form/yes-no-field";
import {
  PREPROBATE_OCCUPANCY_OPTIONS,
  type FullFormData,
} from "@/lib/form-schema";
import { OptionalTag } from "../step-setter";

export function PreProbateDiscovery() {
  const form = useFormContext<FullFormData>();

  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="preprobate_deceasedFullName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Deceased full name <OptionalTag /></FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="preprobate_dateOfDeath"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Date of death (if known) <OptionalTag /></FormLabel>
            <FormControl>
              <Input type="date" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="preprobate_relationshipToDeceased"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Your relationship to the deceased / heir <OptionalTag /></FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="preprobate_likelyHeir"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Who is the likely heir / next of kin? <OptionalTag /></FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="preprobate_probateInitiated"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>Have any family members initiated probate yet? <OptionalTag /></FormLabel>
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
        name="preprobate_propertyOccupancy"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Is the property currently occupied? <OptionalTag /></FormLabel>
            <Select value={field.value ?? ""} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select one" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {PREPROBATE_OCCUPANCY_OPTIONS.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="preprobate_outstandingLiens"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Any outstanding liens / mortgages? <OptionalTag /></FormLabel>
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
