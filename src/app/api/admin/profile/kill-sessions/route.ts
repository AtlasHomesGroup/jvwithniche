import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { serverError, unauthorized } from "@/lib/api";
import { db } from "@/db/client";
import { adminUsers } from "@/db/schema";
import { SESSION_COOKIE_NAME } from "@/lib/admin/constants";
import { getAdminSession } from "@/lib/admin/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Invalidate every outstanding session for the current admin. Bumps the
 * `sessions_valid_from` column so the HMAC session verifier rejects any
 * token issued before now. Also clears the current browser cookie - the
 * admin must sign in again.
 */
export async function POST() {
  const admin = await getAdminSession();
  if (!admin) return unauthorized("not authenticated");

  try {
    await db
      .update(adminUsers)
      .set({ sessionsValidFrom: new Date() })
      .where(eq(adminUsers.id, admin.id));

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });
    return res;
  } catch (err) {
    console.error("[admin/profile/kill-sessions] failed", err);
    return serverError("kill-sessions failed");
  }
}
