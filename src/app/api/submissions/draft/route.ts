import { NextResponse } from "next/server";
import { z } from "zod";

import { badRequest, serverError } from "@/lib/api";
import {
  readDraftCookie,
  writeDraftCookie,
} from "@/lib/draft-cookie";
import {
  getOrCreateDraft,
  updateDraft,
} from "@/lib/draft-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET - hydrate the form on page load. Creates a new draft + cookie if none. */
export async function GET() {
  try {
    const token = await readDraftCookie();
    const { draft, created } = await getOrCreateDraft(token);
    const res = NextResponse.json({
      draftId: draft.id,
      formData: draft.formData,
      status: draft.status,
      updatedAt: draft.updatedAt.toISOString(),
    });
    if (created) writeDraftCookie(res, draft.draftSessionToken);
    return res;
  } catch (err) {
    console.error("[draft GET] failed", err);
    return serverError("Failed to load draft");
  }
}

/**
 * PATCH / POST - merge a partial form-data payload into the current draft.
 * The client sends only changed values (or the whole watched form - the
 * server merges field-by-field either way).
 */
const patchBodySchema = z.object({
  formData: z.record(z.string(), z.unknown()),
});

async function handleWrite(req: Request) {
  try {
    const raw = await req.json().catch(() => null);
    const parsed = patchBodySchema.safeParse(raw);
    if (!parsed.success) {
      return badRequest("Invalid payload", parsed.error.flatten());
    }

    let token = await readDraftCookie();
    let createdNewDraft = false;

    if (!token) {
      const { draft } = await getOrCreateDraft(undefined);
      token = draft.draftSessionToken;
      createdNewDraft = true;
    }

    const updated = await updateDraft(token, parsed.data.formData);
    if (!updated) {
      // Cookie pointed at a non-existent draft - spin up a new one and
      // merge this payload into it so we don't lose user input.
      const { draft } = await getOrCreateDraft(undefined);
      const merged = await updateDraft(
        draft.draftSessionToken,
        parsed.data.formData,
      );
      const res = NextResponse.json({
        draftId: merged?.id ?? draft.id,
        updatedAt: (merged ?? draft).updatedAt.toISOString(),
      });
      writeDraftCookie(res, draft.draftSessionToken);
      return res;
    }

    const res = NextResponse.json({
      draftId: updated.id,
      updatedAt: updated.updatedAt.toISOString(),
    });
    if (createdNewDraft) writeDraftCookie(res, token);
    return res;
  } catch (err) {
    console.error("[draft write] failed", err);
    return serverError("Failed to save draft");
  }
}

export { handleWrite as PATCH, handleWrite as POST };
