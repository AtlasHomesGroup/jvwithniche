/**
 * Server-side check: is this draft's formData fully filled out (all
 * required fields across all steps)? Used by the stall-alerts cron to
 * detect setters who finished the form but never pressed "Generate JV
 * agreement", so we can nudge them to come back and click the button.
 *
 * Mirrors the validation pipeline that runs in POST /api/submissions —
 * any change there should be reflected here.
 */
import {
  dealTypeSchema,
  narrativeSchema,
  prospectSchema,
  setterSchema,
  urgencySchema,
  variantSchemaByDealType,
} from "@/lib/form-schema";

export function isFormComplete(formData: unknown): boolean {
  if (!formData || typeof formData !== "object") return false;

  const checks = [
    setterSchema.safeParse(formData),
    prospectSchema.safeParse(formData),
    dealTypeSchema.safeParse(formData),
    narrativeSchema.safeParse(formData),
    urgencySchema.safeParse(formData),
  ];
  for (const r of checks) {
    if (!r.success) return false;
  }

  const dealTypeResult = dealTypeSchema.safeParse(formData);
  if (dealTypeResult.success) {
    const variant = variantSchemaByDealType[dealTypeResult.data.dealType];
    if (variant && !variant.safeParse(formData).success) return false;
  }

  return true;
}
