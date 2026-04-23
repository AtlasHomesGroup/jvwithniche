import { notImplemented } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cron entry point — drains the CRM retry queue with exponential backoff
// (1m, 5m, 15m, 1h, 6h, 24h). Guarded by CRON_SECRET (Milestone 4).
export async function GET() {
  return notImplemented("M4 — CRM retry worker");
}
