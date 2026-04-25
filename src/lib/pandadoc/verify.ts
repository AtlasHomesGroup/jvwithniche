import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify a PandaDoc webhook signature.
 *
 * PandaDoc signs webhooks by HMAC-SHA256 of the raw request body with the
 * shared key configured when the webhook was created. They deliver the hex
 * signature via the `signature` query param (most common) - some legacy
 * configs use an `X-Signature-SHA256` header, so we check both.
 *
 * Returns true only when a signature was present and matches. If the shared
 * key isn't configured, verification is skipped (dev mode) - the webhook
 * route still logs the attempt.
 */
export function verifyPandaDocSignature(
  rawBody: string,
  { signatureHeader, signatureQuery }: {
    signatureHeader?: string | null;
    signatureQuery?: string | null;
  },
): { ok: boolean; reason?: string } {
  const sharedKey = process.env.PANDADOC_WEBHOOK_SHARED_KEY;
  if (!sharedKey) return { ok: true, reason: "skipped" };

  const provided = (signatureQuery ?? signatureHeader ?? "").trim();
  if (!provided) return { ok: false, reason: "missing_signature" };

  const expected = createHmac("sha256", sharedKey)
    .update(rawBody)
    .digest("hex");

  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(provided, "utf8");
    if (a.length !== b.length) return { ok: false, reason: "length_mismatch" };
    return timingSafeEqual(a, b)
      ? { ok: true }
      : { ok: false, reason: "signature_mismatch" };
  } catch {
    return { ok: false, reason: "comparison_error" };
  }
}
