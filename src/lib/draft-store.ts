import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "@/db/client";
import { submissions, type Submission } from "@/db/schema";

export type DraftFormData = Record<string, unknown>;

export type DraftRecord = {
  id: Submission["id"];
  draftSessionToken: string;
  formData: DraftFormData;
  status: Submission["status"];
  updatedAt: Submission["updatedAt"];
  createdAt: Submission["createdAt"];
};

function toDraftRecord(row: Submission): DraftRecord {
  return {
    id: row.id,
    draftSessionToken: row.draftSessionToken ?? "",
    formData: (row.formData as DraftFormData) ?? {},
    status: row.status,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
  };
}

/**
 * Look up an existing draft by its session token.
 * Returns null if no row matches OR the row has already advanced beyond draft
 * status (e.g., signed/synced) - in either case the caller should start fresh.
 */
export async function findDraftByToken(
  token: string,
): Promise<DraftRecord | null> {
  if (!token) return null;
  const rows = await db
    .select()
    .from(submissions)
    .where(eq(submissions.draftSessionToken, token))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.status !== "draft") return null;
  return toDraftRecord(row);
}

/**
 * Create a fresh draft row with a new session token + return-link token.
 * Both tokens are generated here; the return-link one is reserved at draft
 * time so the column can stay NOT NULL on the schema.
 */
export async function createDraft(): Promise<DraftRecord> {
  const [row] = await db
    .insert(submissions)
    .values({
      draftSessionToken: nanoid(32),
      returnLinkToken: nanoid(32),
      formData: {},
      status: "draft",
    })
    .returning();
  return toDraftRecord(row);
}

const DENORM_KEYS: Record<
  "submitterEmail" | "submitterPhoneE164" | "propertyStreet" | "propertyCity" | "propertyState" | "dealType",
  keyof DraftFormData
> = {
  submitterEmail: "email",
  submitterPhoneE164: "phoneE164",
  propertyStreet: "propertyStreet",
  propertyCity: "propertyCity",
  propertyState: "propertyState",
  dealType: "dealType",
};

function pickString(data: DraftFormData, key: keyof DraftFormData): string | null {
  const v = data[key];
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

/**
 * Merge a partial form-data payload into an existing draft. Later writes win
 * at the field level; untouched fields are preserved.
 */
export async function updateDraft(
  token: string,
  patch: DraftFormData,
): Promise<DraftRecord | null> {
  const existing = await findDraftByToken(token);
  if (!existing) return null;

  const merged: DraftFormData = { ...existing.formData, ...patch };
  const now = new Date();

  const [row] = await db
    .update(submissions)
    .set({
      formData: merged,
      updatedAt: now,
      lastActivityAt: now,
      submitterEmail: pickString(merged, DENORM_KEYS.submitterEmail),
      submitterPhoneE164: pickString(merged, DENORM_KEYS.submitterPhoneE164),
      propertyStreet: pickString(merged, DENORM_KEYS.propertyStreet),
      propertyCity: pickString(merged, DENORM_KEYS.propertyCity),
      propertyState: pickString(merged, DENORM_KEYS.propertyState),
      dealType: pickString(merged, DENORM_KEYS.dealType),
    })
    .where(eq(submissions.draftSessionToken, token))
    .returning();

  return row ? toDraftRecord(row) : null;
}

/**
 * Get or create a draft in a single call. Used by server components and the
 * GET draft endpoint to hydrate the form on page load.
 * Returns the record plus whether a new row was just created - callers need
 * that to know when to write the cookie on the response.
 */
export async function getOrCreateDraft(
  token: string | undefined,
): Promise<{ draft: DraftRecord; created: boolean }> {
  if (token) {
    const existing = await findDraftByToken(token);
    if (existing) return { draft: existing, created: false };
  }
  const fresh = await createDraft();
  return { draft: fresh, created: true };
}
