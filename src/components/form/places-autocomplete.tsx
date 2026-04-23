"use client";

import * as React from "react";
import { nanoid } from "nanoid";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export type PlaceSelection = {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  formatted: string;
};

type Suggestion = {
  placeId: string;
  mainText: string;
  secondaryText: string;
};

interface PlacesAutocompleteProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: string | undefined;
  onChange: (value: string) => void;
  onPlaceSelected: (place: PlaceSelection) => void;
  invalid?: boolean;
}

const PLACES_HOST = "https://places.googleapis.com/v1";

/**
 * Custom Google Places autocomplete using the Places API (New) REST endpoint.
 * Works for accounts enrolled after March 2025 (the legacy JS Autocomplete
 * class is no longer available to new customers). Falls back to a plain
 * text input if the API key is missing so the form still submits in dev.
 */
export const PlacesAutocomplete = React.forwardRef<
  HTMLInputElement,
  PlacesAutocompleteProps
>(({ value, onChange, onPlaceSelected, invalid, className, ...props }, ref) => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([]);
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);
  const sessionTokenRef = React.useRef(nanoid());
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const fetchSuggestions = React.useCallback(
    async (q: string) => {
      if (!apiKey || q.trim().length < 3) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      try {
        const res = await fetch(`${PLACES_HOST}/places:autocomplete`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "X-Goog-Api-Key": apiKey,
          },
          body: JSON.stringify({
            input: q,
            sessionToken: sessionTokenRef.current,
            includedPrimaryTypes: ["street_address", "premise", "subpremise"],
            includedRegionCodes: ["US"],
          }),
        });
        if (!res.ok) {
          setSuggestions([]);
          setOpen(false);
          return;
        }
        const data = (await res.json()) as {
          suggestions?: Array<{
            placePrediction?: {
              placeId: string;
              structuredFormat?: {
                mainText?: { text?: string };
                secondaryText?: { text?: string };
              };
            };
          }>;
        };
        const mapped: Suggestion[] = (data.suggestions ?? [])
          .map((s) => ({
            placeId: s.placePrediction?.placeId ?? "",
            mainText: s.placePrediction?.structuredFormat?.mainText?.text ?? "",
            secondaryText:
              s.placePrediction?.structuredFormat?.secondaryText?.text ?? "",
          }))
          .filter((s) => s.placeId)
          .slice(0, 5);
        setSuggestions(mapped);
        setHighlight(0);
        setOpen(mapped.length > 0);
      } catch (err) {
        console.warn("[places autocomplete] request failed", err);
        setSuggestions([]);
        setOpen(false);
      }
    },
    [apiKey],
  );

  const selectPlace = React.useCallback(
    async (placeId: string) => {
      setOpen(false);
      if (!apiKey) return;
      try {
        const res = await fetch(
          `${PLACES_HOST}/places/${placeId}?sessionToken=${sessionTokenRef.current}`,
          {
            headers: {
              "X-Goog-Api-Key": apiKey,
              "X-Goog-FieldMask": "addressComponents,formattedAddress",
            },
          },
        );
        sessionTokenRef.current = nanoid();
        if (!res.ok) return;
        const data = (await res.json()) as {
          addressComponents?: Array<{
            longText: string;
            shortText: string;
            types: string[];
          }>;
          formattedAddress?: string;
        };
        const selection = parsePlace(
          data.addressComponents ?? [],
          data.formattedAddress ?? "",
        );
        onChange(selection.street);
        onPlaceSelected(selection);
      } catch (err) {
        console.warn("[places autocomplete] details failed", err);
      }
    },
    [apiKey, onChange, onPlaceSelected],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (suggestions[highlight]) {
        e.preventDefault();
        void selectPlace(suggestions[highlight].placeId);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <Input
        ref={ref}
        type="text"
        autoComplete="off"
        value={value ?? ""}
        aria-invalid={invalid || undefined}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="places-listbox"
        onChange={(e) => {
          onChange(e.target.value);
          if (debounceRef.current) clearTimeout(debounceRef.current);
          const q = e.target.value;
          debounceRef.current = setTimeout(() => void fetchSuggestions(q), 220);
        }}
        onKeyDown={onKeyDown}
        {...props}
      />
      {open && suggestions.length > 0 && (
        <ul
          id="places-listbox"
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-border bg-white shadow-[0_8px_30px_rgba(27,58,92,0.12)]"
        >
          {suggestions.map((s, i) => (
            <li key={s.placeId} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                className={cn(
                  "block w-full px-3 py-2 text-left transition-colors",
                  i === highlight
                    ? "bg-brand-orange-light"
                    : "hover:bg-brand-orange-light/50",
                )}
                onClick={() => void selectPlace(s.placeId)}
                onMouseEnter={() => setHighlight(i)}
              >
                <div className="text-sm font-medium text-brand-navy">
                  {s.mainText}
                </div>
                <div className="text-xs text-brand-text-muted">
                  {s.secondaryText}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
PlacesAutocomplete.displayName = "PlacesAutocomplete";

function parsePlace(
  components: Array<{ longText: string; shortText: string; types: string[] }>,
  formatted: string,
): PlaceSelection {
  const find = (
    type: string,
    prefer: "long" | "short" = "long",
  ): string => {
    const c = components.find((c) => c.types.includes(type));
    if (!c) return "";
    return prefer === "short" ? c.shortText : c.longText;
  };
  const streetNumber = find("street_number");
  const route = find("route");
  const street = [streetNumber, route].filter(Boolean).join(" ").trim();
  const city =
    find("locality") ||
    find("sublocality") ||
    find("sublocality_level_1") ||
    find("postal_town") ||
    "";
  const state = find("administrative_area_level_1", "short");
  const zip = find("postal_code");
  const country = find("country", "short") || "US";
  return { street, city, state, zip, country, formatted };
}
