import type { Submission } from "@/db/schema";

/**
 * Build a Calendly scheduling URL pre-filled from a submission.
 *
 * Returns null when CALENDLY_BOOKING_URL isn't configured - callers
 * should branch on null and hide the CTA in that case.
 *
 * Prefill keys we set:
 *  - `name`             full submitter name (Calendly merges first+last)
 *  - `email`            submitter email
 *  - `a1`               property address — best-effort first custom answer
 *  - `utm_source`       always "jvwithniche"
 *  - `utm_campaign`     "jv-signed"
 *  - `utm_content`      submission id, so bookings can be correlated back
 *
 * Calendly silently ignores unknown / out-of-range custom answers, so
 * the worst case for `a1` is that the closer's event type doesn't have
 * a first custom question and the field stays empty — booking still
 * works, just less prefilled.
 */
export function buildCalendlyUrl(s: Submission): string | null {
  const base = process.env.CALENDLY_BOOKING_URL?.trim();
  if (!base) return null;

  const url = new URL(base);
  // Strip any session-state params the URL was copied with
  // (e.g. ?back=1&month=2026-05) so they don't override prefill.
  url.search = "";

  const fd =
    (s.formData as { firstName?: unknown; lastName?: unknown } | null) ?? {};
  const fn = typeof fd.firstName === "string" ? fd.firstName.trim() : "";
  const ln = typeof fd.lastName === "string" ? fd.lastName.trim() : "";
  const fullName = [fn, ln].filter(Boolean).join(" ");

  if (fullName) url.searchParams.set("name", fullName);
  if (s.submitterEmail) url.searchParams.set("email", s.submitterEmail);

  const property = [s.propertyStreet, s.propertyCity, s.propertyState]
    .map((v) => v?.trim())
    .filter(Boolean)
    .join(", ");
  if (property) url.searchParams.set("a1", property);

  url.searchParams.set("utm_source", "jvwithniche");
  url.searchParams.set("utm_campaign", "jv-signed");
  url.searchParams.set("utm_content", s.id);

  return url.toString();
}
