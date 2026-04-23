import { notImplemented } from "@/lib/api";

export const runtime = "nodejs";

// PandaDoc webhook receiver — verifies HMAC signature and acts on
// document_state_changed / recipient_completed events (Milestone 3).
export async function POST() {
  return notImplemented("M3 — PandaDoc webhook");
}
