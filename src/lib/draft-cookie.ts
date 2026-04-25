import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import type { NextResponse } from "next/server";

export const DRAFT_COOKIE_NAME = "jvwn_draft";
export const DRAFT_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

export function generateDraftToken(): string {
  // 32-char URL-safe id - plenty of entropy for a non-guessable draft cookie.
  return nanoid(32);
}

/** Read the draft cookie from an incoming request (App Router server context). */
export async function readDraftCookie(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(DRAFT_COOKIE_NAME)?.value;
}

/** Write the draft cookie on the outgoing response. */
export function writeDraftCookie(res: NextResponse, token: string) {
  res.cookies.set({
    name: DRAFT_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DRAFT_COOKIE_MAX_AGE_SECONDS,
  });
}

/** Clear the draft cookie (on final submit or explicit reset). */
export function clearDraftCookie(res: NextResponse) {
  res.cookies.set({
    name: DRAFT_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
