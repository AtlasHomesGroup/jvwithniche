import { notImplemented } from "@/lib/api";

export const runtime = "nodejs";

// Upload an attachment against a unique return-link token (Milestone 5).
// multipart/form-data: file + optional caption.
export async function POST() {
  return notImplemented("M5 — attachment upload");
}

export async function GET() {
  return notImplemented("M5 — attachment list");
}
