import { eq } from "drizzle-orm";
import { get } from "@vercel/blob";

import { db } from "@/db/client";
import { submissions, submissionUpdates } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Download proxy for JV-partner-uploaded attachments. Gated by the
 * submission's unguessable `returnLinkToken` + the attachment's UUID;
 * streams the file from the private Vercel Blob.
 */
export async function GET(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{ token: string; updateId: string }>;
  },
) {
  const { token, updateId } = await params;
  if (!token || token.length < 8 || !updateId) {
    return new Response("Not found", { status: 404 });
  }

  const [row] = await db
    .select({
      id: submissionUpdates.id,
      updateType: submissionUpdates.updateType,
      payload: submissionUpdates.payload,
      submissionToken: submissions.returnLinkToken,
    })
    .from(submissionUpdates)
    .innerJoin(
      submissions,
      eq(submissionUpdates.submissionId, submissions.id),
    )
    .where(eq(submissionUpdates.id, updateId))
    .limit(1);

  if (!row) return new Response("Not found", { status: 404 });
  if (row.submissionToken !== token)
    return new Response("Not found", { status: 404 });
  if (row.updateType !== "attachment")
    return new Response("Not found", { status: 404 });

  const payload = row.payload as {
    url?: string;
    filename?: string;
    mimeType?: string;
  };
  if (!payload.url) return new Response("Not found", { status: 404 });

  const upstream = await get(payload.url, { access: "private" });
  if (!upstream || upstream.statusCode !== 200) {
    return new Response("Not found", { status: 404 });
  }

  const filenameSafe = (payload.filename ?? "attachment")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(0, 160);
  return new Response(upstream.stream, {
    headers: {
      "Content-Type":
        payload.mimeType || upstream.blob.contentType || "application/octet-stream",
      "Content-Length": String(upstream.blob.size),
      "Content-Disposition": `inline; filename="${filenameSafe}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
