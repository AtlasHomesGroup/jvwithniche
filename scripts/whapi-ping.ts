/**
 * Quick sanity check for the Whapi.Cloud API key + bound phone number.
 *
 * Usage (from repo root):
 *   npm run whapi:ping
 */

import { getHealth } from "@/lib/whatsapp/client";
import { nicheTeamNumbers } from "@/lib/whatsapp/group";

async function main() {
  if (!process.env.WHAPI_API_KEY) {
    console.error("WHAPI_API_KEY is not set. Put it in .env.local or export it.");
    process.exit(1);
  }
  try {
    const h = await getHealth();
    console.log("✓ Whapi reachable");
    console.log(`  status:    ${h.status?.text ?? "unknown"} (code ${h.status?.code})`);
    console.log(`  version:   ${h.version}`);
    console.log(`  uptime:    ${h.uptime}s`);
    if (h.user) {
      console.log(
        `  bound to:  +${h.user.id}  (${h.user.name})${h.user.is_business ? "  [business]" : ""}`,
      );
    }
    if (h.channel_id) console.log(`  channel:   ${h.channel_id}`);

    console.log("\n▶ Niche team participants from env:");
    const team = nicheTeamNumbers();
    if (team.length === 0) {
      console.log("  ⚠️  No NICHE_WHATSAPP_TEAM_* env vars set");
    } else {
      for (const n of team) console.log(`    • ${n}`);
    }
    console.log(
      `\n  Total team members: ${team.length} (group will hold ${team.length + 1} including the JV partner)`,
    );

    if (h.status?.code !== 11) {
      console.log(
        `\n  ⚠️  Account status is "${h.status?.text}" (code ${h.status?.code}), not READY (code 11). API calls may queue or fail until WhatsApp finishes syncing on the bound device.`,
      );
    }
  } catch (err) {
    console.error("✗ Whapi ping failed:", err);
    process.exit(1);
  }
}

void main();
