import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { badRequest, serverError, unauthorized } from "@/lib/api";
import { db } from "@/db/client";
import { adminUsers } from "@/db/schema";
import { signSession, verifyPassword } from "@/lib/admin/auth";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
} from "@/lib/admin/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: Request) {
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

  try {
    const [user] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, parsed.data.email.toLowerCase()))
      .limit(1);

    // Uniform error messaging so the endpoint doesn't leak which half was
    // wrong. Also keep timing uniform by running verifyPassword even on
    // missing-user — otherwise the timing diff is observable.
    const dummyHash =
      "scrypt$00000000000000000000000000000000$" +
      "0".repeat(128);
    const storedHash = user?.passwordHash ?? dummyHash;
    const ok = await verifyPassword(parsed.data.password, storedHash);

    if (!user || user.disabled || !ok) {
      return unauthorized("invalid email or password");
    }

    await db
      .update(adminUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(adminUsers.id, user.id));

    const token = signSession(user.id);
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
    console.error("[admin/login] failed", err);
    return serverError("login failed");
  }
}
