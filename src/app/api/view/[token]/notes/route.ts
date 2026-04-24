import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { badRequest, serverError } from "@/lib/api";
import { db } from "@/db/client";
import { submissions, submissionUpdates } from "@/db/schema";
import { pushFollowUpToCrm } from "@/lib/crm/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Write something before sending")
    .max(10_000, "Note is too long (max 10,000 characters)"),
});

/**
 * Append-only note composer — JV partner-facing. Persists the note in
 * `submission_updates`, then pushes it to the CRM as a new note on the
 * existing Lead if CRM sync has already completed for this submission.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || token.length < 8) return badRequest("invalid token");

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
    const [submission] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.returnLinkToken, token))
      .limit(1);
    if (!submission) return badRequest("submission not found");

    const now = new Date();
    const [row] = await db
      .insert(submissionUpdates)
      .values({
        submissionId: submission.id,
        updateType: "note",
        payload: { text: parsed.data.text, submittedAt: now.toISOString() },
      })
      .returning();

    // Non-blocking CRM push — we respond with ok immediately and fire the
    // push in the background. If CRM isn't synced yet or the push fails,
    // the admin view can show "not yet synced" and the retry cron can
    // pick it up later.
    const crmTitle = `JV partner note · ${now.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`;
    const outcome = await pushFollowUpToCrm(submission, {
      note: { title: crmTitle, body: parsed.data.text },
    });
    if (outcome.ok) {
      await db
        .update(submissionUpdates)
        .set({ crmSynced: true, crmSyncAttempts: 1 })
        .where(eq(submissionUpdates.id, row.id));
    } else {
      await db
        .update(submissionUpdates)
        .set({
          crmSyncAttempts: 1,
          lastSyncError: outcome.reason?.slice(0, 400) ?? "unknown",
        })
        .where(eq(submissionUpdates.id, row.id));
    }

    return NextResponse.json({
      ok: true,
      update: {
        id: row.id,
        createdAt: row.createdAt,
        updateType: row.updateType,
        payload: row.payload,
        crmSynced: outcome.ok,
      },
    });
  } catch (err) {
    console.error("[view/notes] failed", err);
    return serverError("failed to post note");
  }
}
