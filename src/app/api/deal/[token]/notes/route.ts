import { notImplemented } from "@/lib/api";

export const runtime = "nodejs";

// Append-only note composer (Milestone 5).
// body: { text }
export async function POST() {
  return notImplemented("M5 — note append");
}

export async function GET() {
  return notImplemented("M5 — notes list");
}
