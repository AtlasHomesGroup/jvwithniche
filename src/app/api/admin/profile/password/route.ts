import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { badRequest, serverError, unauthorized } from "@/lib/api";
import { db } from "@/db/client";
import { adminUsers } from "@/db/schema";
import {
  hashPassword,
  signSession,
  verifyPassword,
} from "@/lib/admin/auth";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
} from "@/lib/admin/constants";
import { getAdminSession } from "@/lib/admin/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z
    .string()
    .min(12, "New password must be at least 12 characters"),
});

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return unauthorized("not authenticated");

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return badRequest("invalid json");
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return badRequest("validation", parsed.error.flatten());
  }

  const ok = await verifyPassword(
    parsed.data.currentPassword,
    admin.passwordHash,
  );
  if (!ok) return unauthorized("current password is incorrect");

  try {
    // Rotating the password also rotates sessionsValidFrom so every other
    // outstanding session is invalidated. We then mint a fresh cookie for
    // this request so the admin stays signed in in *this* browser.
    const now = new Date();
    const newHash = await hashPassword(parsed.data.newPassword);
    await db
      .update(adminUsers)
      .set({
        passwordHash: newHash,
        sessionsValidFrom: now,
      })
      .where(eq(adminUsers.id, admin.id));

    const token = signSession(admin.id);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
    });
    return res;
  } catch (err) {
    console.error("[admin/profile/password] failed", err);
    return serverError("password change failed");
  }
}
