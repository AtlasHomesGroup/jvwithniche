"use client";

import { useFormContext } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEAL_TYPES, type DealType, type FullFormData } from "@/lib/form-schema";
import { RequiredLegend, StepHeading } from "./step-setter";

const DEAL_TYPE_DESCRIPTIONS: Record<DealType, string> = {
  Foreclosure:
    "Homeowner is behind on payments or has received a Notice of Default; auction or foreclosure sale is approaching.",
  Probate:
    "Owner is deceased and probate has been or needs to be opened.",
  Divorce:
    "Separation or divorce forcing a property sale; parties may or may not agree.",
  "Surplus Funds":
    "Property sold at auction and surplus funds from the sale are claimable.",
  "Estate Sales":
    "Family or heirs are selling the entire estate including the property.",
  "Tax Delinquent":
    "Owner is behind on property taxes; tax sale or lien situation.",
  "Code Violations":
    "Property has unresolved city code violations creating pressure to sell.",
  "Water Shutoff":
    "Utilities (water) have been shut off at the property — a motivation signal.",
  "Pre-Probate":
    "Owner is deceased but probate has not yet been opened. Heirs weighing options.",
  Guardianship:
    "Owner lacks capacity and a guardian is handling affairs; sale may require court approval.",
  Lien:
    "Property has one or more liens attached that may need to be negotiated or cleared.",
  "Tired Landlord":
    "Rental property owner is worn out and looking to exit ownership.",
  "Expired Listing":
    "Listing expired on the MLS without selling; owner may still want to sell off-market.",
  "For Sale By Owner (FSBO)":
    "Owner is selling directly without an agent.",
  "Driving for Dollars":
    "Lead sourced by physically spotting a distressed or vacant property.",
  "Bankruptcy Filing":
    "Owner has filed (or is about to file) bankruptcy affecting the property.",
  "Eviction Filing":
    "Owner is in the middle of evicting a tenant and may want out of the property.",
  "Vacant Land":
    "Unimproved land parcel — no structure to deal with.",
  "Predictive Niche List":
    "Lead sourced from a Niche Data predictive list.",
  "Other Lead Type":
    "Something else — use the narrative section to describe.",
};

export function StepDealType() {
  const form = useFormContext<FullFormData>();
  const selected = form.watch("dealType");

  return (
    <div className="space-y-6">
      <StepHeading
        eyebrow="Step 3 · Deal type"
        title="What kind of situation is this?"
        description="Your selection tailors the discovery questions in the next step. Pick the closest match."
      />
      <RequiredLegend />

      <FormField
        control={form.control}
        name="dealType"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>Deal type</FormLabel>
            <Select value={field.value ?? ""} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a deal type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="max-h-[360px]">
                {DEAL_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {selected && (
        <div className="rounded-lg border border-brand-navy/10 bg-brand-cream p-4 text-sm text-brand-text-muted">
          <p className="font-medium text-brand-navy">{selected}</p>
          <p className="mt-1">{DEAL_TYPE_DESCRIPTIONS[selected]}</p>
        </div>
      )}
    </div>
  );
}
