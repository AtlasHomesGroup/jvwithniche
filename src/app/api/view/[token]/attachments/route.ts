import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

import { badRequest, serverError } from "@/lib/api";
import { db } from "@/db/client";
import { submissions, submissionUpdates } from "@/db/schema";
import { uploadJvAttachment } from "@/lib/blob-storage";
import { pushFollowUpToCrm } from "@/lib/crm/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB - base64-encoded this lands at ~10.7 MB, under Salesforce's 12 MB REST limit.
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
]);

/**
 * Attachment upload - JV partner-facing. Accepts multipart/form-data with
 * a single `file` field (+ optional `caption`). Stores the file in the
 * private Vercel Blob, persists a `submission_updates` row, and pushes
 * the file to the CRM as an attachment on the existing Lead.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || token.length < 8) return badRequest("invalid token");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return badRequest("expected multipart/form-data");
  }
  const file = form.get("file");
  const caption =
    typeof form.get("caption") === "string"
      ? (form.get("caption") as string).slice(0, 280)
      : "";
  if (!(file instanceof Blob)) return badRequest("missing file");
  if (file.size === 0) return badRequest("empty file");
  if (file.size > MAX_BYTES) {
    return badRequest(`file too large - max ${MAX_BYTES / 1024 / 1024} MB`);
  }
  const rawName =
    "name" in file && typeof (file as File).name === "string"
      ? (file as File).name
      : "attachment";
  const contentType = file.type || "application/octet-stream";
  if (!ALLOWED_MIME.has(contentType)) {
    return badRequest(`unsupported file type: ${contentType}`);
  }

  try {
    const [submission] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.returnLinkToken, token))
      .limit(1);
    if (!submission) return badRequest("submission not found");

    // Reserve an update id so the Blob path includes it (avoids collisions
    // and groups each attachment under a deterministic prefix). Read the
    // bytes once so we can both upload them and base64-encode them for
    // the CRM push without re-reading the stream.
    const updateId = randomUUID();
    const bytes = new Uint8Array(await file.arrayBuffer());

    const blob = await uploadJvAttachment({
      submissionId: submission.id,
      updateId,
      file: bytes,
      filename: rawName,
      contentType,
    });

    const [row] = await db
      .insert(submissionUpdates)
      .values({
        id: updateId,
        submissionId: submission.id,
        updateType: "attachment",
        payload: {
          url: blob.url,
          pathname: blob.pathname,
          filename: rawName,
          caption,
          size: file.size,
          mimeType: contentType,
        },
      })
      .returning();

    // Fire CRM push with the base64-encoded file.
    const base64 = Buffer.from(bytes).toString("base64");
    const outcome = await pushFollowUpToCrm(submission, {
      file: {
        filename: rawName,
        contentType,
        base64,
      },
      ...(caption
        ? {
            note: {
              title: `Attachment caption · ${rawName}`,
              body: caption,
            },
          }
        : {}),
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
    console.error("[view/attachments] failed", err);
    return serverError("failed to upload attachment");
  }
}
