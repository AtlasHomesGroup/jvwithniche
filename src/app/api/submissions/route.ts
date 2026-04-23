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
  variantSchemaByDealType,
  type FullFormData,
} from "@/lib/form-schema";

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

    // Variant-specific validation once we know the deal type.
    const dealTypeResult = dealTypeSchema.safeParse(formData);
    if (dealTypeResult.success) {
      const variant = variantSchemaByDealType[dealTypeResult.data.dealType];
      collect(errors, variant.safeParse(formData));

      // Cross-section refine: lender + trustee required for Pre-foreclosure/NOD.
      if (
        dealTypeResult.data.dealType === "Pre-foreclosure" ||
        dealTypeResult.data.dealType === "NOD"
      ) {
        if (!formData.lender || formData.lender.trim().length === 0) {
          (errors.lender ??= []).push("Mortgage company / lender is required");
        }
        if (
          !formData.foreclosingTrustee ||
          formData.foreclosingTrustee.trim().length === 0
        ) {
          (errors.foreclosingTrustee ??= []).push(
            "Foreclosing trustee is required",
          );
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { error: "validation_failed", fieldErrors: errors },
        { status: 422 },
      );
    }

    // All good — mark the submission as awaiting signature.
    const now = new Date();
    const [updated] = await db
      .update(submissions)
      .set({
        status: "awaiting_signature",
        updatedAt: now,
        lastActivityAt: now,
      })
      .where(eq(submissions.id, draft.id))
      .returning();

    return NextResponse.json({
      ok: true,
      submissionId: updated.id,
      next: `/sign/${updated.id}`,
      recaptchaScore: captcha.score,
    });
  } catch (err) {
    console.error("[submit] failed", err);
    return serverError("Failed to submit");
  }
}
