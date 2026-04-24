import { eq } from "drizzle-orm";
import { get } from "@vercel/blob";

import { db } from "@/db/client";
import { submissions } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public-ish PDF proxy for the signed JV agreement. The blob store is
 * configured as private, so the raw blob URL isn't directly reachable —
 * this route authenticates via BLOB_READ_WRITE_TOKEN and streams the file
 * through.
 *
 * Access is gated by the `returnLinkToken` nanoid on the submission, which
 * is unguessable (32 chars). Whapi.Cloud also fetches this URL when we
 * attach the signed PDF to the WhatsApp group message.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || token.length < 8) {
    return new Response("Not found", { status: 404 });
  }

  const rows = await db
    .select({
      id: submissions.id,
      signedPdfUrl: submissions.signedPdfUrl,
      propertyStreet: submissions.propertyStreet,
    })
    .from(submissions)
    .where(eq(submissions.returnLinkToken, token))
    .limit(1);
  const submission = rows[0];
  if (!submission?.signedPdfUrl) {
    return new Response("Not found", { status: 404 });
  }

  const upstream = await get(submission.signedPdfUrl, { access: "private" });
  if (!upstream || upstream.statusCode !== 200) {
    return new Response("Not found", { status: 404 });
  }

  const filenameSafe = (submission.propertyStreet ?? submission.id)
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(0, 80);
  return new Response(upstream.stream, {
    headers: {
      "Content-Type": upstream.blob.contentType,
      "Content-Length": String(upstream.blob.size),
      "Content-Disposition": `inline; filename="JV-Agreement-${filenameSafe}.pdf"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
