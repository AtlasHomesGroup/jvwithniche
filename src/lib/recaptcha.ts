const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

export interface RecaptchaResult {
  ok: boolean;
  reason?: string;
  score?: number;
  action?: string;
  hostname?: string;
}

/**
 * Verify a reCAPTCHA v3 token against Google's siteverify endpoint.
 * When RECAPTCHA_SECRET_KEY is not configured (e.g., a dev without keys),
 * returns ok=true with a 'skipped' reason so the submit flow still works.
 */
export async function verifyRecaptcha(
  token: string | undefined,
  { expectedAction, minScore }: { expectedAction?: string; minScore?: number } = {},
): Promise<RecaptchaResult> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return { ok: true, reason: "skipped" };
  if (!token) return { ok: false, reason: "missing_token" };

  const threshold = minScore ?? Number(process.env.RECAPTCHA_MIN_SCORE ?? 0.5);

  try {
    const body = new URLSearchParams({ secret, response: token });
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      // Google's verify endpoint is chatty on network issues; cap the wait.
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { ok: false, reason: "verify_http_error" };
    const data = (await res.json()) as {
      success: boolean;
      score?: number;
      action?: string;
      hostname?: string;
      "error-codes"?: string[];
    };
    if (!data.success) {
      return { ok: false, reason: data["error-codes"]?.join(",") ?? "failed" };
    }
    if (typeof data.score === "number" && data.score < threshold) {
      return {
        ok: false,
        reason: "low_score",
        score: data.score,
        action: data.action,
        hostname: data.hostname,
      };
    }
    if (expectedAction && data.action && data.action !== expectedAction) {
      return {
        ok: false,
        reason: "action_mismatch",
        score: data.score,
        action: data.action,
      };
    }
    return {
      ok: true,
      score: data.score,
      action: data.action,
      hostname: data.hostname,
    };
  } catch (err) {
    console.warn("[recaptcha] verify error", err);
    return { ok: false, reason: "verify_exception" };
  }
}
