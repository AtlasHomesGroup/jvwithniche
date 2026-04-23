import { put, type PutBlobResult } from "@vercel/blob";

/**
 * Thin wrapper around @vercel/blob for the two artifacts we store:
 * signed JV agreement PDFs (from PandaDoc / Jotform) and setter-uploaded
 * attachments (M5). Wraps `put()` with conventions for naming + access.
 *
 * Current access model: Vercel Blob URLs are unguessable random paths but
 * publicly fetchable by anyone who holds the URL. We store the URL in the
 * DB and never expose it to submitters — admin-view downloads proxy
 * through our server so we can enforce auth and, later, rotate paths.
 */

export async function uploadSignedPdf({
  submissionId,
  pdf,
  provider,
}: {
  submissionId: string;
  pdf: Blob;
  provider: "pandadoc" | "jotform";
}): Promise<PutBlobResult> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const pathname = `submissions/${submissionId}/jv-agreement__${provider}__${timestamp}.pdf`;

  return put(pathname, pdf, {
    access: "public",
    contentType: "application/pdf",
    // Keep the filename stable for admin downloads.
    addRandomSuffix: false,
    // Long cache because the PDF content is immutable once written.
    cacheControlMaxAge: 60 * 60 * 24 * 365,
  });
}
