import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { badRequest, serverError, unauthorized } from "@/lib/api";
import { db } from "@/db/client";
import { submissions } from "@/db/schema";
import { getAdminSession } from "@/lib/admin/session";
import { logAdminAction } from "@/lib/admin/audit";
import {
  isConfigured as whatsappConfigured,
  WhapiApiError,
} from "@/lib/whatsapp/client";
import { createSubmissionGroup } from "@/lib/whatsapp/group";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin-triggered WhatsApp group (re)creation. Mirrors the auto-flow in
 * the Pandadoc webhook — calling this on a submission that already has a
 * group id is a no-op (returns kind: "already_created").
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminSession();
  if (!admin) return unauthorized("not authenticated");

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return badRequest("invalid id");

  if (!whatsappConfigured()) {
    return badRequest("WHAPI_API_KEY is not configured");
  }

  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, id))
    .limit(1);
  if (!submission) return badRequest("submission not found");

  if (submission.whatsappGroupCreated && submission.whatsappGroupId) {
    return NextResponse.json({
      ok: true,
      outcome: {
        kind: "already_created",
        groupId: submission.whatsappGroupId,
        inviteLink: submission.whatsappGroupInviteLink,
      },
      triggeredBy: admin.email,
    });
  }

  if (!submission.signedAt || !submission.signedPdfUrl) {
    return badRequest("submission is not signed yet");
  }
  if (!submission.submitterPhoneE164) {
    return badRequest("submission has no submitter phone");
  }

  try {
    const result = await createSubmissionGroup(submission);
    const now = new Date();
    await db
      .update(submissions)
      .set({
        whatsappGroupCreated: true,
        whatsappGroupId: result.groupId,
        whatsappGroupInviteLink: result.inviteLink,
        updatedAt: now,
      })
      .where(eq(submissions.id, submission.id));

    await logAdminAction({
      admin,
      actionType: "retry_whatsapp_group",
      submissionId: submission.id,
      details: {
        outcome: "created",
        groupId: result.groupId,
        memberCount: result.participants.length,
      },
    });

    return NextResponse.json({
      ok: true,
      outcome: {
        kind: "created",
        groupId: result.groupId,
        inviteLink: result.inviteLink,
        memberCount: result.participants.length,
      },
      triggeredBy: admin.email,
    });
  } catch (err) {
    const diag =
      err instanceof WhapiApiError
        ? {
            kind: "WhapiApiError" as const,
            status: err.status,
            body: err.body.slice(0, 400),
            message: err.message,
          }
        : err instanceof Error
          ? { kind: err.name, message: err.message }
          : { kind: "unknown", message: String(err) };

    console.error(
      "[admin/retry-whatsapp] failed",
      JSON.stringify({ submissionId: submission.id, ...diag }),
    );

    await logAdminAction({
      admin,
      actionType: "retry_whatsapp_group",
      submissionId: submission.id,
      details: { outcome: "failed", ...diag },
    }).catch(() => {});

    return serverError(
      "message" in diag
        ? `whatsapp group creation failed: ${diag.message}`
        : "whatsapp group creation failed",
    );
  }
}
