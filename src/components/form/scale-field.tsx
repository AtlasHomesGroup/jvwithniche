"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";

/** 1-10 urgency scale.
 *  Renders 10 radio buttons in a row on desktop, wraps to 2 rows of 5 on mobile.
 *  Labels at each end describe what the extremes mean. */
export function ScaleField({
  value,
  onValueChange,
  min = 1,
  max = 10,
  lowLabel = "Low",
  highLabel = "High",
  invalid,
}: {
  value: number | undefined;
  onValueChange: (v: number) => void;
  min?: number;
  max?: number;
  lowLabel?: string;
  highLabel?: string;
  invalid?: boolean;
}) {
  const baseId = useId();
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className="space-y-2" aria-invalid={invalid || undefined}>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-5 md:grid-cols-10">
        {values.map((v) => {
          const id = `${baseId}-${v}`;
          const selected = value === v;
          return (
            <label
              key={v}
              htmlFor={id}
              className={cn(
                "flex h-11 cursor-pointer items-center justify-center rounded-lg border text-sm font-semibold transition-colors",
                selected
                  ? "border-brand-navy bg-brand-navy text-white shadow-sm"
                  : "border-border bg-white text-brand-text-dark hover:border-brand-navy/40 hover:bg-brand-navy/5",
              )}
            >
              <input
                type="radio"
                id={id}
                value={v}
                checked={selected}
                onChange={() => onValueChange(v)}
                className="sr-only"
              />
              {v}
            </label>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[11px] text-brand-text-muted">
        <span>
          <span className="font-semibold text-brand-navy">{min}</span> - {lowLabel}
        </span>
        <span>
          <span className="font-semibold text-brand-navy">{max}</span> - {highLabel}
        </span>
      </div>
    </div>
  );
}
