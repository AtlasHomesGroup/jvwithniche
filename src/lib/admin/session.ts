import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { adminUsers, type AdminUser } from "@/db/schema";
import { verifySession } from "./auth";
import { SESSION_COOKIE_NAME } from "./constants";

/**
 * Read the admin session cookie and resolve it to an AdminUser row.
 * Returns null if there's no session, if it's tampered with, if it's
 * expired, if the user was disabled since issuance, or if the token was
 * issued before the user's `sessionsValidFrom` (e.g. after a "sign me
 * out everywhere" action).
 */
export async function getAdminSession(): Promise<AdminUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  const verified = verifySession(token);
  if (!verified) return null;
  const rows = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.id, verified.userId))
    .limit(1);
  const user = rows[0];
  if (!user || user.disabled) return null;
  // Token must have been issued at or after the user's sessionsValidFrom
  // cutoff. Slight clock-tolerance applied (1s) so a session minted
  // milliseconds before the user-record write-through doesn't drop.
  const cutoffMs = user.sessionsValidFrom.getTime() - 1000;
  if (verified.issuedAt < cutoffMs) return null;
  return user;
}

/**
 * Server-component / route-handler guard. Redirects to /admin/login when
 * no valid session is present. Returns the AdminUser otherwise.
 */
export async function requireAdminSession(): Promise<AdminUser> {
  const user = await getAdminSession();
  if (!user) redirect("/admin/login");
  return user;
}
