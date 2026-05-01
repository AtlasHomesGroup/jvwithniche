import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { CalendarClock, CheckCircle2, Download, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { db } from "@/db/client";
import { submissions, submissionUpdates } from "@/db/schema";
import { renderSubmissionSections } from "@/lib/submission-view";
import { buildCalendlyUrl } from "@/lib/calendly/url";
import { UpdatePanel } from "./update-panel";
import { UpdateHistory, type UpdateRow } from "./update-history";

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
  const calendlyUrl = submission.signedAt ? buildCalendlyUrl(submission) : null;
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

  const updates = await db
    .select({
      id: submissionUpdates.id,
      createdAt: submissionUpdates.createdAt,
      updateType: submissionUpdates.updateType,
      payload: submissionUpdates.payload,
      crmSynced: submissionUpdates.crmSynced,
    })
    .from(submissionUpdates)
    .where(eq(submissionUpdates.submissionId, submission.id))
    .orderBy(desc(submissionUpdates.createdAt));

  const historyRows: UpdateRow[] = updates.map((u) => ({
    id: u.id,
    createdAt: u.createdAt.toISOString(),
    updateType: u.updateType,
    payload: u.payload as UpdateRow["payload"],
    crmSynced: u.crmSynced,
  }));

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
            record - bookmark it to come back any time.
          </p>
        )}
      </header>

      {pdfHref ? (
        <>
          <section className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-brand-navy/10 bg-white p-5 shadow-[0_8px_30px_rgba(27,58,92,0.06)] sm:flex-col sm:items-start">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-orange-light text-brand-orange">
                <FileText className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold text-brand-navy">
                  Signed JV agreement
                </p>
                <p className="text-[12px] text-brand-text-muted">
                  PDF · downloadable
                </p>
              </div>
            </div>
            <Button asChild>
              <a href={pdfHref} target="_blank" rel="noopener noreferrer">
                <Download className="mr-2 h-4 w-4" aria-hidden /> Download PDF
              </a>
            </Button>
          </section>
          {calendlyUrl && (
            <section className="mb-10 flex items-center justify-between gap-4 rounded-xl border border-brand-orange/30 bg-brand-orange-light/40 p-5 shadow-[0_8px_30px_rgba(27,58,92,0.06)] sm:flex-col sm:items-start">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white text-brand-orange">
                  <CalendarClock className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-semibold text-brand-navy">
                    Book your kickoff call
                  </p>
                  <p className="text-[12px] text-brand-text-muted">
                    30 minutes with our closer · prefilled with your details
                  </p>
                </div>
              </div>
              <Button asChild>
                <a
                  href={calendlyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Book your call
                </a>
              </Button>
            </section>
          )}
        </>
      ) : (
        <section className="mb-10 rounded-xl border border-dashed border-brand-navy/20 bg-brand-cream/60 p-6 text-sm text-brand-text-muted">
          The JV agreement hasn&apos;t been counter-signed yet. This page will
          update automatically once both parties have signed. Reference ID:{" "}
          <code className="font-mono text-brand-navy">{submission.id}</code>
        </section>
      )}

      <section className="mb-10">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-navy">
          Add an update
        </h2>
        <UpdatePanel token={token} crmSynced={!!submission.crmOpportunityId} />
      </section>

      {historyRows.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-navy">
            Your updates
          </h2>
          <UpdateHistory token={token} rows={historyRows} />
        </section>
      )}

      <div className="space-y-4">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-navy">
          Submission details
        </h2>
        {sections.map((section) => (
          <section
            key={section.title}
            className="rounded-xl border border-brand-navy/10 bg-white p-4 sm:p-3"
          >
            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-navy">
              {section.title}
            </h3>
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
          Questions? Reply in your WhatsApp group with the Niche acquisitions
          team, or email{" "}
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
        {value || "-"}
      </dd>
    </div>
  );
}
