"use client";

import { useId } from "react";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type YesNoValue = "Yes" | "No" | "Unknown" | "In progress";

const DEFAULT_OPTIONS: YesNoValue[] = ["Yes", "No", "Unknown"];

/** Compact horizontal radio row for Yes / No / Unknown questions. */
export function YesNoField({
  value,
  onValueChange,
  options = DEFAULT_OPTIONS,
  invalid,
}: {
  value: YesNoValue | undefined;
  onValueChange: (v: YesNoValue) => void;
  options?: YesNoValue[];
  invalid?: boolean;
}) {
  const baseId = useId();
  return (
    <RadioGroup
      value={value ?? ""}
      onValueChange={(v) => onValueChange(v as YesNoValue)}
      className="flex flex-row flex-wrap gap-4"
      aria-invalid={invalid || undefined}
    >
      {options.map((opt) => {
        const id = `${baseId}-${opt.replace(/\s/g, "-")}`;
        return (
          <div key={opt} className="flex items-center gap-2">
            <RadioGroupItem value={opt} id={id} />
            <Label htmlFor={id} className="font-normal text-brand-text-dark">
              {opt}
            </Label>
          </div>
        );
      })}
    </RadioGroup>
  );
}
