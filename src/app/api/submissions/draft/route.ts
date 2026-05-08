import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";

import { badRequest, serverError } from "@/lib/api";
import { db } from "@/db/client";
import { submissions } from "@/db/schema";
import {
  readDraftCookie,
  writeDraftCookie,
} from "@/lib/draft-cookie";
import {
  getOrCreateDraft,
  updateDraft,
} from "@/lib/draft-store";
import { isConfigured as smsConfigured, sendOpsSms, sendSms } from "@/lib/sms/client";
import {
  opsFormStartedSms,
  submitterFormStartedSms,
} from "@/lib/sms/templates";

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

    // Best-effort: fire the "form started" SMS once per draft, the moment
    // we have the setter's first name + phone. Atomic conditional UPDATE
    // gates the send so concurrent autosaves can't double-fire.
    void maybeFireFormStartedSms(updated.id);

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

async function maybeFireFormStartedSms(draftId: string): Promise<void> {
  if (!smsConfigured()) return;

  // Re-fetch the full submission row (DraftRecord is a slim view).
  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, draftId))
    .limit(1);
  if (!submission) return;
  if (submission.formStartedSmsAt) return; // already fired

  const fd =
    (submission.formData as
      | {
          firstName?: unknown;
          phoneE164?: unknown;
          prospectFirstName?: unknown;
        }
      | null) ?? {};
  const firstName = typeof fd.firstName === "string" ? fd.firstName.trim() : "";
  const phone = typeof fd.phoneE164 === "string" ? fd.phoneE164.trim() : "";
  // Only fire after the setter has progressed past the first screen.
  // prospectFirstName is the first required field on screen 2 (Prospect),
  // so a non-empty value here proves they've actually moved on rather
  // than abandoned mid-typing on the setter step.
  const prospectFirstName =
    typeof fd.prospectFirstName === "string"
      ? fd.prospectFirstName.trim()
      : "";
  if (!firstName || !phone || !prospectFirstName) return;

  // Race-safe gate: only the row where form_started_sms_at IS NULL gets
  // stamped. Concurrent autosaves see stamped row → 0 rows updated → skip.
  const stamp = await db
    .update(submissions)
    .set({ formStartedSmsAt: new Date() })
    .where(
      and(
        eq(submissions.id, submission.id),
        isNull(submissions.formStartedSmsAt),
      ),
    )
    .returning({ id: submissions.id });
  if (stamp.length === 0) return; // someone else got there first

  try {
    const setterResult = await sendSms({
      to: phone,
      body: submitterFormStartedSms(submission),
    });
    if (!setterResult.sent) {
      console.warn(
        "[draft] setter form-started sms failed",
        submission.id,
        setterResult.reason,
      );
    } else {
      console.info(
        "[draft] setter form-started sms sent",
        JSON.stringify({ submissionId: submission.id, sid: setterResult.sid }),
      );
    }

    const opsResults = await sendOpsSms(opsFormStartedSms(submission));
    for (const r of opsResults) {
      if (!r.sent) {
        console.warn(
          "[draft] ops form-started sms failed",
          JSON.stringify({ submissionId: submission.id, to: r.to, reason: r.reason }),
        );
      }
    }
  } catch (err) {
    console.error(
      "[draft] form-started sms threw",
      submission.id,
      err instanceof Error ? err.message : String(err),
    );
  }
}
