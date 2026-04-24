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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhoneField } from "@/components/form/phone-field";
import {
  PlacesAutocomplete,
  type PlaceSelection,
} from "@/components/form/places-autocomplete";
import { OCCUPANCY_OPTIONS, type FullFormData } from "@/lib/form-schema";
import { OptionalTag, RequiredLegend, StepHeading } from "./step-setter";

export function StepProspect() {
  const form = useFormContext<FullFormData>();
  const dealType = form.watch("dealType");
  const isForeclosure = dealType === "Foreclosure";

  function applyPlace(place: PlaceSelection) {
    form.setValue("propertyStreet", place.street, { shouldDirty: true });
    form.setValue("propertyCity", place.city, { shouldDirty: true });
    form.setValue("propertyState", place.state, { shouldDirty: true });
    form.setValue("propertyZip", place.zip, { shouldDirty: true });
  }

  return (
    <div className="space-y-6">
      <StepHeading
        eyebrow="Step 2 · Prospect & property"
        title="Who&apos;s the seller, and what&apos;s the property?"
        description="The homeowner you've been speaking with and the property you're bringing to the JV."
      />
      <RequiredLegend />

      <div className="grid gap-5 md:grid-cols-2">
        <FormField
          control={form.control}
          name="prospectFirstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Prospect first name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="prospectLastName"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Prospect last name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="propertyStreet"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel required>Property address</FormLabel>
            <FormControl>
              <PlacesAutocomplete
                value={field.value}
                onChange={field.onChange}
                onPlaceSelected={applyPlace}
                invalid={!!fieldState.error}
                placeholder="Start typing the property address..."
              />
            </FormControl>
            <FormDescription>
              We&apos;ll auto-fill city, state, and ZIP from the selection.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-5 md:grid-cols-3">
        <FormField
          control={form.control}
          name="propertyCity"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>City</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="propertyState"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>State</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="propertyZip"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>ZIP</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <FormField
          control={form.control}
          name="prospectEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prospect email <OptionalTag /></FormLabel>
              <FormControl>
                <Input type="email" placeholder="Leave blank if unknown" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="prospectPhoneE164"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Prospect best phone <OptionalTag /></FormLabel>
              <FormControl>
                <PhoneField
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  invalid={!!fieldState.error}
                  placeholder="Leave blank if unknown"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="occupancy"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Property occupancy <OptionalTag /></FormLabel>
            <Select
              value={field.value ?? ""}
              onValueChange={field.onChange}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select one" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {OCCUPANCY_OPTIONS.map((o) => (
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

      {isForeclosure && (
        <div className="grid gap-5 rounded-lg border border-brand-orange/30 bg-brand-orange-light/40 p-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="lender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mortgage company / lender foreclosing <OptionalTag /></FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="foreclosingTrustee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Foreclosing trustee <OptionalTag /></FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  );
}
