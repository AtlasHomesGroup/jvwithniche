"use client";

import * as React from "react";
import {
  AsYouType,
  parsePhoneNumberFromString,
} from "libphonenumber-js";

import { Input } from "@/components/ui/input";

interface PhoneFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "onBlur"> {
  value: string | undefined;
  defaultCountry?: "US" | "CA" | "GB" | "AU";
  onChange: (value: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
}

/**
 * Phone input that formats as-you-type and normalizes to E.164 on blur.
 * Stores the canonical E.164 string in form state; the visible value is
 * whatever the user typed (formatted via AsYouType for readability).
 */
export const PhoneField = React.forwardRef<HTMLInputElement, PhoneFieldProps>(
  (
    { value, onChange, onBlur, defaultCountry = "US", invalid, ...props },
    ref,
  ) => {
    const stored = value ?? "";
    // Display value is a humanized version of the stored E.164 / user input.
    const [display, setDisplay] = React.useState<string>(() =>
      humanize(stored, defaultCountry),
    );

    // Sync display when the stored value changes from outside (draft hydrate).
    React.useEffect(() => {
      const incoming = humanize(stored, defaultCountry);
      setDisplay((prev) =>
        stripNonDigits(prev) === stripNonDigits(incoming) ? prev : incoming,
      );
    }, [stored, defaultCountry]);

    return (
      <Input
        ref={ref}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={display}
        onChange={(e) => {
          const raw = e.target.value;
          const typer = new AsYouType(defaultCountry);
          const formatted = typer.input(raw);
          setDisplay(formatted);
          // Propagate best-effort canonical value. Zod refine validates on submit.
          const parsed = parsePhoneNumberFromString(raw, defaultCountry);
          if (parsed?.isValid()) onChange(parsed.number);
          else onChange(raw.trim());
        }}
        onBlur={() => {
          const parsed = parsePhoneNumberFromString(display, defaultCountry);
          if (parsed?.isValid()) {
            onChange(parsed.number);
            setDisplay(parsed.formatNational());
          }
          onBlur?.();
        }}
        aria-invalid={invalid || undefined}
        placeholder="(202) 555-1234"
        {...props}
      />
    );
  },
);
PhoneField.displayName = "PhoneField";

function humanize(value: string, country: "US" | "CA" | "GB" | "AU"): string {
  if (!value) return "";
  const parsed = parsePhoneNumberFromString(value, country);
  if (parsed?.isValid()) return parsed.formatNational();
  return value;
}

function stripNonDigits(v: string): string {
  return v.replace(/\D/g, "");
}
