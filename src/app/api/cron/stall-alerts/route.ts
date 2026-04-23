import { notImplemented } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cron entry point — fires Michael-facing "stalled at signature" alerts
// (drafts in awaiting_signature for >2h) and auto-deletes abandoned drafts
// older than 7 days. Guarded by CRON_SECRET (Milestone 3).
export async function GET() {
  return notImplemented("M3 — stalled-draft alert worker");
}
