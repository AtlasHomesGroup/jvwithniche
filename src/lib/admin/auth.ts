import { createHmac, randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

import { SESSION_COOKIE_NAME, SESSION_TTL_MS } from "./constants";

const scryptAsync = promisify(scrypt);

const SCRYPT_KEYLEN = 64;
const SALT_BYTES = 16;

export { SESSION_COOKIE_NAME, SESSION_TTL_MS };

/* ──────────────────────────────────────────────────────────────
   Password hashing — scrypt (Node built-in)
   Stored form: `scrypt$<hex-salt>$<hex-hash>`
   ────────────────────────────────────────────────────────────── */

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const hash = (await scryptAsync(
    password,
    salt,
    SCRYPT_KEYLEN,
  )) as Buffer;
  return `scrypt$${salt}$${hash.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hashHex] = parts;
  if (!salt || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const computed = (await scryptAsync(
    password,
    salt,
    SCRYPT_KEYLEN,
  )) as Buffer;
  if (expected.length !== computed.length) return false;
  return timingSafeEqual(expected, computed);
}

/* ──────────────────────────────────────────────────────────────
   Session tokens — `<userId>.<issuedAtMs>.<hmac>`
   HMAC-SHA256 over `<userId>.<issuedAtMs>` using ADMIN_SESSION_SECRET.
   ────────────────────────────────────────────────────────────── */

function sessionSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "ADMIN_SESSION_SECRET is not set (or is too short) — set at least 32 random chars",
    );
  }
  return s;
}

export function signSession(userId: string): string {
  const issuedAt = String(Date.now());
  const payload = `${userId}.${issuedAt}`;
  const sig = createHmac("sha256", sessionSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export interface VerifiedSession {
  userId: string;
  issuedAt: number;
}

export function verifySession(token: string | undefined): VerifiedSession | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, issuedAtStr, sig] = parts;
  if (!userId || !issuedAtStr || !sig) return null;
  const payload = `${userId}.${issuedAtStr}`;
  let expected: string;
  try {
    expected = createHmac("sha256", sessionSecret())
      .update(payload)
      .digest("base64url");
  } catch {
    return null;
  }
  // Constant-time compare.
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  const issuedAt = Number(issuedAtStr);
  if (!Number.isFinite(issuedAt)) return null;
  const age = Date.now() - issuedAt;
  if (age < 0 || age > SESSION_TTL_MS) return null;
  return { userId, issuedAt };
}
