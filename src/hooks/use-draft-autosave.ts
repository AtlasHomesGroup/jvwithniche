"use client";

import { useEffect, useRef, useState } from "react";
import type { UseFormReturn, FieldValues } from "react-hook-form";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

export interface UseDraftAutosaveOptions {
  /** Skip autosave until the initial draft is hydrated to avoid overwriting
   *  server-side state with defaultValues on first render. */
  enabled?: boolean;
  /** Milliseconds to wait after the last change before POSTing. Default 800ms. */
  debounceMs?: number;
  /** URL of the draft write endpoint. */
  endpoint?: string;
}

/**
 * Watches the form's current values and POSTs them to the draft endpoint
 * after a debounce period. The server merges the payload into form_data.
 */
export function useDraftAutosave<T extends FieldValues>(
  form: UseFormReturn<T>,
  {
    enabled = true,
    debounceMs = 800,
    endpoint = "/api/submissions/draft",
  }: UseDraftAutosaveOptions = {},
): AutosaveStatus {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const subscription = form.watch((values, info) => {
      // Ignore initial programmatic resets (no field name means it's a reset).
      if (!info.name) return;

      if (timerRef.current) clearTimeout(timerRef.current);
      setStatus("saving");

      timerRef.current = setTimeout(async () => {
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ formData: values }),
            signal: controller.signal,
            credentials: "same-origin",
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          setStatus("saved");
        } catch (err) {
          if ((err as Error).name === "AbortError") return;
          console.error("[draft autosave] failed", err);
          setStatus("error");
        }
      }, debounceMs);
    });

    return () => {
      subscription.unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
      controllerRef.current?.abort();
    };
    // form.watch is stable across renders on a given form instance.
  }, [form, enabled, debounceMs, endpoint]);

  return status;
}
