import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { badRequest, serverError } from "@/lib/api";
import { readDraftCookie } from "@/lib/draft-cookie";
import { findDraftByToken } from "@/lib/draft-store";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { db } from "@/db/client";
import { submissions } from "@/db/schema";
import {
  dealTypeSchema,
  narrativeSchema,
  prospectSchema,
  setterSchema,
  urgencySchema,
  variantSchemaByDealType,
  type FullFormData,
} from "@/lib/form-schema";
import {
  createDocument,
  hasTemplate as hasPandadocTemplate,
  sendDocument,
  PandaDocApiError,
} from "@/lib/pandadoc/client";
import {
  buildDocumentName,
  buildMergeTokens,
  buildRecipients,
} from "@/lib/pandadoc/merge-fields";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RECAPTCHA_ACTION = "submit_jv";

const submitBodySchema = z.object({
  recaptchaToken: z.string().optional().default(""),
  honeypot: z.string().optional().default(""),
});

type FieldErrors = Record<string, string[]>;

function collect(
  errors: FieldErrors,
  result: { success: true } | { success: false; error: z.ZodError },
) {
  if (result.success) return;
  for (const issue of result.error.issues) {
    const key = issue.path.join(".");
    (errors[key] ??= []).push(issue.message);
  }
}

export async function POST(req: Request) {
  try {
    const raw = await req.json().catch(() => null);
    const parsed = submitBodySchema.safeParse(raw);
    if (!parsed.success) return badRequest("Invalid payload");

    const { recaptchaToken, honeypot } = parsed.data;

    // Honeypot — silently "succeed" if a bot filled the trap field.
    if (honeypot.trim().length > 0) {
      return NextResponse.json({ ok: true, next: null });
    }

    const token = await readDraftCookie();
    if (!token) return badRequest("No draft session — start from step 1");

    const draft = await findDraftByToken(token);
    if (!draft) return badRequest("Draft not found or already submitted");

    // reCAPTCHA verification (skipped when keys aren't configured).
    const captcha = await verifyRecaptcha(recaptchaToken, {
      expectedAction: RECAPTCHA_ACTION,
    });
    if (!captcha.ok) {
      return NextResponse.json(
        { error: "captcha_failed", reason: captcha.reason },
        { status: 400 },
      );
    }

    const formData = draft.formData as FullFormData;
    const errors: FieldErrors = {};

    collect(errors, setterSchema.safeParse(formData));
    collect(errors, prospectSchema.safeParse(formData));
    collect(errors, dealTypeSchema.safeParse(formData));
    collect(errors, narrativeSchema.safeParse(formData));
    collect(errors, urgencySchema.safeParse(formData));

    // Variant-specific validation (if we have a script for this deal type).
    const dealTypeResult = dealTypeSchema.safeParse(formData);
    if (dealTypeResult.success) {
      const variant = variantSchemaByDealType[dealTypeResult.data.dealType];
      if (variant) {
        collect(errors, variant.safeParse(formData));
      }
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { error: "validation_failed", fieldErrors: errors },
        { status: 422 },
      );
    }

    // Attempt to create the PandaDoc document up front so the /sign page
    // can open an embed session immediately on load. If PandaDoc isn't
    // configured yet (no template ID), we still advance the submission to
    // awaiting_signature — the sign page will show a friendly "waiting
    // for template setup" message.
    let esignDocumentId: string | null = null;
    let esignProvider: "pandadoc" | "jotform" | null = null;
    let esignError: string | null = null;

    if (hasPandadocTemplate()) {
      try {
        const doc = await createDocument({
          name: buildDocumentName(formData),
          template_uuid: process.env.PANDADOC_TEMPLATE_ID!,
          recipients: buildRecipients(formData),
          tokens: buildMergeTokens(formData),
          metadata: {
            submission_id: draft.id,
            deal_type: formData.dealType ?? "",
          },
        });
        // Poll briefly until the doc leaves "document.uploaded" — sending
        // a doc still in "uploaded" returns 400. In practice this takes
        // well under a second from a template; cap at 6 short tries.
        await sendDocument(doc.id, { silent: true }).catch(async (err) => {
          if (err instanceof PandaDocApiError && err.status === 400) {
            // give PandaDoc a moment to finish processing the doc
            await new Promise((r) => setTimeout(r, 1200));
            await sendDocument(doc.id, { silent: true });
          } else {
            throw err;
          }
        });
        esignDocumentId = doc.id;
        esignProvider = "pandadoc";
      } catch (err) {
        // Non-fatal: we still want the submission persisted so the user
        // doesn't lose their data. The /sign page will show the error.
        console.error("[submit] pandadoc create/send failed", err);
        esignError =
          err instanceof PandaDocApiError
            ? `PandaDoc ${err.status}`
            : err instanceof Error
              ? err.message
              : "unknown";
      }
    }

    const now = new Date();
    const [updated] = await db
      .update(submissions)
      .set({
        status: "awaiting_signature",
        updatedAt: now,
        lastActivityAt: now,
        esignProvider,
        esignDocumentId,
      })
      .where(eq(submissions.id, draft.id))
      .returning();

    return NextResponse.json({
      ok: true,
      submissionId: updated.id,
      next: `/sign/${updated.id}`,
      recaptchaScore: captcha.score,
      esign: {
        configured: hasPandadocTemplate(),
        documentCreated: !!esignDocumentId,
        error: esignError,
      },
    });
  } catch (err) {
    console.error("[submit] failed", err);
    return serverError("Failed to submit");
  }
}
