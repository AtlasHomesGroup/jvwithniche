import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { badRequest, serverError, unauthorized } from "@/lib/api";
import { db } from "@/db/client";
import { submissions } from "@/db/schema";
import { getAdminSession } from "@/lib/admin/session";
import { logAdminAction } from "@/lib/admin/audit";
import {
  checkContacts,
  isConfigured as whatsappConfigured,
  normalizePhone,
  WhapiApiError,
} from "@/lib/whatsapp/client";
import { createSubmissionGroup, nicheTeamNumbers } from "@/lib/whatsapp/group";

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

  // Pre-validate every number against /contacts so an unregistered phone
  // produces a clear error instead of a generic Whapi 500 on /groups.
  const team = nicheTeamNumbers();
  const allRaw = [...team, submission.submitterPhoneE164];
  const allNorm = allRaw.map(normalizePhone);

  console.info(
    "[admin/retry-whatsapp] preflight",
    JSON.stringify({
      submissionId: submission.id,
      subject: `JV with NICHE: ${[
        submission.propertyStreet,
        submission.propertyCity,
        submission.propertyState,
      ]
        .filter(Boolean)
        .join(", ")}`,
      teamCount: team.length,
      participants: allNorm,
    }),
  );

  try {
    const check = await checkContacts(allNorm);
    const invalid = check.contacts.filter((c) => c.status !== "valid");
    if (invalid.length > 0) {
      const summary = invalid
        .map((c) => `${c.input} (${c.status})`)
        .join(", ");
      console.warn(
        "[admin/retry-whatsapp] participant not on whatsapp",
        JSON.stringify({ submissionId: submission.id, invalid }),
      );
      await logAdminAction({
        admin,
        actionType: "retry_whatsapp_group",
        submissionId: submission.id,
        details: { outcome: "invalid_participant", invalid },
      }).catch(() => {});
      return badRequest(
        `whatsapp number(s) not registered: ${summary}`,
      );
    }
  } catch (err) {
    // Contacts check itself blew up - log and fall through to the
    // create attempt; better to try the real call than block on a
    // diagnostic failure.
    console.warn(
      "[admin/retry-whatsapp] contacts pre-check failed (continuing)",
      err instanceof Error ? err.message : String(err),
    );
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
