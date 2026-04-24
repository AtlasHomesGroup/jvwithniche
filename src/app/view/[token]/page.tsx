import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { CheckCircle2, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { db } from "@/db/client";
import { submissions } from "@/db/schema";
import { renderSubmissionSections } from "@/lib/submission-view";

export const metadata = {
  title: "Your JV submission · JV With Niche",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ViewSubmissionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token || token.length < 8) notFound();

  const rows = await db
    .select()
    .from(submissions)
    .where(eq(submissions.returnLinkToken, token))
    .limit(1);

  const submission = rows[0];
  if (!submission) notFound();

  const pdfHref = submission.signedPdfUrl ? `/api/pdf/${token}` : null;
  const propertyLine = [
    submission.propertyStreet,
    submission.propertyCity,
    submission.propertyState,
  ]
    .filter(Boolean)
    .join(", ") || "Your JV submission";

  const sections = renderSubmissionSections(submission);
  const signedDate = submission.signedAt
    ? new Date(submission.signedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 sm:px-4 sm:py-8">
      <header className="mb-8">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-orange">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Your JV submission
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-brand-navy sm:text-xl md:text-3xl">
          {propertyLine}
        </h1>
        {signedDate && (
          <p className="mt-2 text-sm text-brand-text-muted">
            JV agreement signed on {signedDate}. This page is your private
            record — bookmark it to come back any time.
          </p>
        )}
      </header>

      {pdfHref ? (
        <section className="mb-10 overflow-hidden rounded-xl border border-brand-navy/10 bg-white shadow-[0_8px_30px_rgba(27,58,92,0.06)]">
          <div className="flex items-center justify-between gap-3 border-b border-brand-navy/10 px-5 py-3 sm:flex-col sm:items-start">
            <div className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
              <FileText className="h-4 w-4 text-brand-orange" aria-hidden />
              Signed JV agreement
            </div>
            <Button asChild variant="outline" size="sm">
              <a href={pdfHref} target="_blank" rel="noopener noreferrer">
                Open / download PDF
              </a>
            </Button>
          </div>
          <iframe
            title="Signed JV agreement"
            src={pdfHref}
            className="block h-[760px] w-full md:h-[820px]"
          />
        </section>
      ) : (
        <section className="mb-10 rounded-xl border border-dashed border-brand-navy/20 bg-brand-cream/60 p-6 text-sm text-brand-text-muted">
          The JV agreement hasn&apos;t been counter-signed yet. This page will
          update automatically once both parties have signed. Reference ID:{" "}
          <code className="font-mono text-brand-navy">{submission.id}</code>
        </section>
      )}

      <div className="space-y-4">
        {sections.map((section) => (
          <section
            key={section.title}
            className="rounded-xl border border-brand-navy/10 bg-white p-4 sm:p-3"
          >
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-navy">
              {section.title}
            </h2>
            <dl className="space-y-2.5">
              {section.rows.map(({ label, value, multiline }) => (
                <SummaryRow
                  key={label}
                  label={label}
                  value={value}
                  multiline={multiline}
                />
              ))}
            </dl>
          </section>
        ))}
      </div>

      <div className="mt-10 flex flex-col gap-3 rounded-lg border border-brand-navy/10 bg-brand-cream/60 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-brand-text-muted">
          Need to send us an update or an attachment? Reply in your WhatsApp
          group with the Niche acquisitions team, or email{" "}
          <a
            href="mailto:support@nichecrm.ai"
            className="underline hover:text-brand-orange"
          >
            support@nichecrm.ai
          </a>
          .
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/">Back to landing</Link>
        </Button>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-3 text-[13px] sm:grid-cols-1 sm:gap-0.5">
      <dt className="font-medium text-brand-text-muted">{label}</dt>
      <dd
        className={
          multiline
            ? "whitespace-pre-wrap text-brand-text-dark"
            : "text-brand-text-dark"
        }
      >
        {value || "—"}
      </dd>
    </div>
  );
}

