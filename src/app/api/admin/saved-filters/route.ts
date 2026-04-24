import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { badRequest, serverError, unauthorized } from "@/lib/api";
import { db } from "@/db/client";
import { adminSavedFilters } from "@/db/schema";
import { getAdminSession } from "@/lib/admin/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  url: z
    .string()
    .trim()
    .min(1, "URL is required")
    .max(2048)
    .refine((v) => v.startsWith("/admin/"), "url must start with /admin/"),
});

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return unauthorized("not authenticated");
  const rows = await db
    .select()
    .from(adminSavedFilters)
    .where(eq(adminSavedFilters.adminUserId, admin.id))
    .orderBy(desc(adminSavedFilters.createdAt));
  return NextResponse.json({ ok: true, rows });
}

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return unauthorized("not authenticated");

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return badRequest("invalid json");
  }
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return badRequest("validation", parsed.error.flatten());
  }

  try {
    const [row] = await db
      .insert(adminSavedFilters)
      .values({
        adminUserId: admin.id,
        name: parsed.data.name,
        url: parsed.data.url,
      })
      .returning();
    return NextResponse.json({ ok: true, row });
  } catch (err) {
    console.error("[admin/saved-filters POST] failed", err);
    return serverError("save failed");
  }
}

export async function DELETE(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return unauthorized("not authenticated");
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return badRequest("invalid id");
  }
  try {
    await db
      .delete(adminSavedFilters)
      .where(
        and(
          eq(adminSavedFilters.id, id),
          eq(adminSavedFilters.adminUserId, admin.id),
        ),
      );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/saved-filters DELETE] failed", err);
    return serverError("delete failed");
  }
}
