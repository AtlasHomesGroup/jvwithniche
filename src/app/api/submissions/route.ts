import { notImplemented } from "@/lib/api";

export const runtime = "nodejs";

// Create or advance a submission (Milestone 2-3).
// POST body: { draftToken?, formData, recaptchaToken, honeypot }
export async function POST() {
  return notImplemented("M2 — form submission endpoint");
}
