import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { db } from "@/db/client";
import { submissions } from "@/db/schema";
import { createEmbedSession, hasTemplate } from "@/lib/pandadoc/client";
import { SigningFrame } from "./signing-frame";

export const metadata = {
  title: "Sign your JV agreement · JV With Niche",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PANDADOC_EMBED_BASE = "https://app.pandadoc.com/s";

export default async function SignPage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = await params;
  if (!/^[0-9a-fA-F-]{36}$/.test(draftId)) notFound();

  const rows = await db
    .select({
      id: submissions.id,
      status: submissions.status,
      createdAt: submissions.createdAt,
      signedAt: submissions.signedAt,
      esignProvider: submissions.esignProvider,
      esignDocumentId: submissions.esignDocumentId,
      submitterEmail: submissions.submitterEmail,
      returnLinkToken: submissions.returnLinkToken,
    })
    .from(submissions)
    .where(eq(submissions.id, draftId))
    .limit(1);

  const submission = rows[0];
  if (!submission) notFound();

  /* ───── Already signed ───── */
  if (
    submission.status === "crm_sync_pending" ||
    submission.status === "crm_synced" ||
    submission.signedAt
  ) {
    const viewHref = `/view/${submission.returnLinkToken}`;
    return (
      <SignLayout
        eyebrow="Signed"
        title="You’re all set - we’ve got your signed agreement."
      >
        <p className="text-sm text-brand-text-muted">
          Michael and the Niche acquisitions team have been notified.
          We&apos;ll reach out via WhatsApp shortly to discuss next steps.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href={viewHref}>View your submission & agreement</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back to landing</Link>
          </Button>
        </div>
      </SignLayout>
    );
  }

  /* ───── PandaDoc not configured yet (template env var missing) ───── */
  if (!hasTemplate() || !submission.esignDocumentId) {
    return (
      <SignLayout
        eyebrow="Submission received"
        title="Thanks - we’ve saved your submission."
      >
        <p className="text-sm text-brand-text-muted">
          We&apos;re still finishing the signing flow setup. Your submission is
          safe and marked as awaiting signature. You&apos;ll get an email from{" "}
          <code className="font-mono">
            {submission.submitterEmail ?? "us"}
          </code>{" "}
          with the signing link once it&apos;s ready.
        </p>
        <div className="mt-6 rounded-lg border border-dashed border-border bg-brand-cream/60 p-4 text-[12px] text-brand-text-muted">
          Reference: <code className="font-mono">{submission.id}</code>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/">Back to landing</Link>
          </Button>
        </div>
      </SignLayout>
    );
  }

  /* ───── Awaiting signature - open an embed session ───── */
  let sessionUrl: string | null = null;
  let sessionError: string | null = null;
  try {
    const session = await createEmbedSession(
      submission.esignDocumentId,
      submission.submitterEmail ?? "",
    );
    sessionUrl = `${PANDADOC_EMBED_BASE}/${session.id}`;
  } catch (err) {
    console.error("[sign page] createEmbedSession failed", err);
    sessionError =
      err instanceof Error ? err.message : "Couldn't open the signing session";
  }

  return (
    <SignLayout
      eyebrow="Almost done"
      title="Review and sign the JV agreement."
      description="Your info has been merged into the agreement. Signing takes 2-3 clicks - you stay on this page the whole time."
    >
      {sessionUrl ? (
        <SigningFrame
          sessionUrl={sessionUrl}
          submissionId={submission.id}
          viewHref={`/view/${submission.returnLinkToken}`}
        />
      ) : (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm">
          <p className="font-medium text-destructive">
            Couldn&apos;t open the signing session.
          </p>
          <p className="mt-2 text-brand-text-muted">
            {sessionError ?? "Please refresh this page to try again."}
          </p>
          <div className="mt-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/submit">Back to submission</Link>
            </Button>
          </div>
        </div>
      )}
    </SignLayout>
  );
}

function SignLayout({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10 sm:px-4 sm:py-8">
      <header className="mb-6">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-orange">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-brand-navy sm:text-xl md:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm text-brand-text-muted">
            {description}
          </p>
        )}
      </header>
      {children}
    </div>
  );
}
