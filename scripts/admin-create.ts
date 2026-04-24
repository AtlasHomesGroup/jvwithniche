/**
 * Create (or update) an admin user. Reads email + password from
 * environment variables so the password never lands in shell history.
 *
 * Usage:
 *   ADMIN_EMAIL=ops@nichesolutions.ai ADMIN_PASSWORD='<strong-password>' \
 *     npm run admin:create
 *
 * If a user with that email already exists, the password is rotated and
 * the `disabled` flag is cleared.
 */

import { eq } from "drizzle-orm";
import { createInterface } from "readline/promises";

import { db } from "@/db/client";
import { adminUsers } from "@/db/schema";
import { hashPassword } from "@/lib/admin/auth";

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  let password = process.env.ADMIN_PASSWORD ?? "";

  if (!email) {
    console.error("ADMIN_EMAIL is not set.");
    process.exit(1);
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error(`"${email}" isn't a valid email.`);
    process.exit(1);
  }

  if (!password) {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    password = await rl.question(
      `Set a password for ${email} (min 12 chars): `,
    );
    rl.close();
  }
  if (password.length < 12) {
    console.error("Password must be at least 12 characters.");
    process.exit(1);
  }

  if (!process.env.ADMIN_SESSION_SECRET) {
    console.warn(
      "⚠️  ADMIN_SESSION_SECRET isn't set. Admin login will fail at runtime until it is.",
    );
  }

  const passwordHash = await hashPassword(password);

  const [existing] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1);

  if (existing) {
    await db
      .update(adminUsers)
      .set({ passwordHash, disabled: false })
      .where(eq(adminUsers.id, existing.id));
    console.log(`✓ Updated admin user ${email} (id=${existing.id})`);
  } else {
    const [row] = await db
      .insert(adminUsers)
      .values({ email, passwordHash })
      .returning();
    console.log(`✓ Created admin user ${email} (id=${row.id})`);
  }

  console.log("\nNext steps:");
  console.log("  1. Ensure ADMIN_SESSION_SECRET is set in Vercel (≥32 chars).");
  console.log("  2. Visit https://jvwithniche.com/admin/login and sign in.");
}

void main();
