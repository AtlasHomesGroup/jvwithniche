import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { Button } from "@/components/ui/button";
import { db } from "@/db/client";
import { submissions } from "@/db/schema";

export const metadata = {
  title: "Sign your JV agreement · JV With Niche",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

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
    })
    .from(submissions)
    .where(eq(submissions.id, draftId))
    .limit(1);

  const submission = rows[0];
  if (!submission) notFound();

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 sm:px-4 sm:py-10">
      <div className="rounded-2xl border border-brand-navy/10 bg-white p-6 shadow-[0_8px_30px_rgba(27,58,92,0.04)] sm:p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-orange">
          Submission received
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-brand-navy sm:text-xl md:text-3xl">
          Thanks — we&apos;ve got it.
        </h1>
        <p className="mt-3 text-sm text-brand-text-muted">
          Your submission is saved and marked{" "}
          <span className="inline-flex items-center rounded-full bg-brand-orange-light px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-brand-orange">
            {submission.status.replace("_", " ")}
          </span>
          . Michael and the Niche acquisitions team have been alerted.
        </p>

        <div className="mt-6 rounded-lg border border-dashed border-border bg-brand-cream/50 p-4 text-sm text-brand-text-muted">
          <p>
            <span className="font-medium text-brand-navy">Up next — M3:</span>{" "}
            the embedded e-signature step. We&apos;ll auto-merge your form
            answers into the JV agreement and you&apos;ll sign in 2–3 clicks.
          </p>
          <p className="mt-2 text-[12px]">
            Reference: <code className="font-mono">{submission.id}</code>
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/">Back to landing</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/submit">Start another submission</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
