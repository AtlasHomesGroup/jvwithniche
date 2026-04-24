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
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { PhoneField } from "@/components/form/phone-field";
import {
  PlacesAutocomplete,
  type PlaceSelection,
} from "@/components/form/places-autocomplete";
import type { FullFormData } from "@/lib/form-schema";

export function StepSetter() {
  const form = useFormContext<FullFormData>();
  const isMember = form.watch("isNicheCommunityMember");

  function applySetterPlace(place: PlaceSelection) {
    form.setValue("address", place.street, { shouldDirty: true });
    form.setValue("city", place.city, { shouldDirty: true });
    form.setValue("state", place.state, { shouldDirty: true });
    form.setValue("zip", place.zip, { shouldDirty: true });
  }

  return (
    <div className="space-y-6">
      <StepHeading
        eyebrow="Step 1 · About you"
        title="Tell us who&apos;s bringing the deal."
        description="Your contact details so we can reach you and add you to the WhatsApp group with Michael and the acquisitions team."
      />
      <RequiredLegend />

      <div className="grid gap-5 md:grid-cols-2">
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>First name</FormLabel>
              <FormControl>
                <Input autoComplete="given-name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Last name</FormLabel>
              <FormControl>
                <Input autoComplete="family-name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="address"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel required>Street address</FormLabel>
            <FormControl>
              <PlacesAutocomplete
                value={field.value}
                onChange={field.onChange}
                onPlaceSelected={applySetterPlace}
                invalid={!!fieldState.error}
                placeholder="Start typing your address..."
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-5 md:grid-cols-3">
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>City</FormLabel>
              <FormControl>
                <Input autoComplete="address-level2" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="state"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>State</FormLabel>
              <FormControl>
                <Input autoComplete="address-level1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="zip"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>ZIP</FormLabel>
              <FormControl>
                <Input autoComplete="postal-code" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phoneE164"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel required>Cell phone</FormLabel>
              <FormControl>
                <PhoneField
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  invalid={!!fieldState.error}
                />
              </FormControl>
              <FormDescription>
                Used for the WhatsApp group with the Niche team.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="whatsappConsent"
        render={({ field, fieldState }) => (
          <FormItem className="rounded-lg border border-border bg-brand-cream/50 p-4">
            <div className="flex items-start gap-3">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                  aria-invalid={!!fieldState.error}
                />
              </FormControl>
              <div className="space-y-1">
                <FormLabel required className="text-[13px] font-medium leading-snug">
                  I confirm this phone number has WhatsApp installed and I agree
                  to join a WhatsApp group with the Niche acquisitions team to
                  discuss this deal.
                </FormLabel>
                <FormMessage />
              </div>
            </div>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="isNicheCommunityMember"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Are you a Niche Community member?</FormLabel>
            <FormControl>
              <RadioGroup
                value={field.value === true ? "yes" : field.value === false ? "no" : ""}
                onValueChange={(v) => field.onChange(v === "yes")}
                className="flex flex-row gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="yes" id="member-yes" />
                  <Label htmlFor="member-yes" className="font-normal">
                    Yes
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="no" id="member-no" />
                  <Label htmlFor="member-no" className="font-normal">
                    No
                  </Label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {isMember && (
        <FormField
          control={form.control}
          name="communityEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Community registration email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="Same as above, or a different one"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                The email you used to register for Niche Community — helps us
                match and prioritize your submission.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
}

export function StepHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="mb-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-orange">
        {eyebrow}
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-brand-navy sm:text-xl md:text-3xl">
        {title}
      </h1>
      {description && (
        <p className="mt-2 max-w-2xl text-sm text-brand-text-muted">
          {description}
        </p>
      )}
    </header>
  );
}

export function RequiredLegend() {
  return (
    <p className="text-[12px] text-brand-text-muted">
      Fields marked with{" "}
      <span className="font-semibold text-brand-orange">*</span> are required.
      Other fields are optional.
    </p>
  );
}

/** Small neutral-grey "(optional)" tag shown next to non-required labels. */
export function OptionalTag() {
  return (
    <span className="ml-1 text-[11px] font-normal text-brand-text-muted">
      (optional)
    </span>
  );
}
