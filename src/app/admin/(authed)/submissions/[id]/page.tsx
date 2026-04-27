import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileText,
  MessageSquare,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  getSubmissionDetail,
  listAuditForSubmission,
} from "@/lib/admin/queries";
import { renderSubmissionSections } from "@/lib/submission-view";
import { StatusBadge } from "../../_components/status-badge";
import { ActionBadge } from "../../audit-log/_components/action-badge";
import { RetryCrmButton } from "./_components/retry-crm-button";
import { RetryWhatsappButton } from "./_components/retry-whatsapp-button";
import { ResendSigningButton } from "./_components/resend-signing-button";
import { DeleteButton } from "./_components/delete-button";

export const metadata = {
  title: "Submission · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminSubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const [detail, auditRows] = await Promise.all([
    getSubmissionDetail(id),
    listAuditForSubmission(id),
  ]);
  if (!detail) notFound();

  const { submission: s, updates, queueRow } = detail;
  const sections = renderSubmissionSections(s);
  const propertyLabel = propertyLine(s) || s.id;

  const viewLink = `/view/${s.returnLinkToken}`;
  const pdfHref = s.signedPdfUrl ? `/api/pdf/${s.returnLinkToken}` : null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/submissions"
          className="inline-flex items-center gap-1 text-[12px] text-brand-text-muted hover:text-brand-orange"
        >
          <ArrowLeft className="h-3 w-3" aria-hidden /> All submissions
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3 sm:flex-col sm:items-start">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
              {propertyLine(s) || "(no property)"}
            </h1>
            <p className="mt-1 text-sm text-brand-text-muted">
              Submitted {formatDateTime(s.createdAt)} ·{" "}
              <code className="font-mono text-[12px] text-brand-navy">
                {s.id}
              </code>
            </p>
          </div>
          <StatusBadge status={s.status} />
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <Card
          title="Signed JV agreement"
          body={
            pdfHref ? (
              <Button asChild size="sm" variant="outline" className="w-full">
                <a href={pdfHref} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-4 w-4" aria-hidden />
                  Download PDF
                </a>
              </Button>
            ) : (
              <span className="text-[12px] text-brand-text-muted">
                Not signed yet.
              </span>
            )
          }
          footer={
            s.signedAt ? (
              <>Signed {formatDateTime(s.signedAt)}</>
            ) : (
              <>Awaiting both signatures</>
            )
          }
        />
        <Card
          title="Salesforce CRM"
          body={
            s.crmOpportunityId ? (
              <div className="text-[12px]">
                <p className="text-brand-text-muted">Lead Id</p>
                <code className="mt-0.5 block break-all font-mono text-brand-navy">
                  {s.crmOpportunityId}
                </code>
              </div>
            ) : (
              <span className="text-[12px] text-brand-text-muted">
                Not yet synced.
              </span>
            )
          }
          footer={
            <div className="flex items-center gap-2">
              <RetryCrmButton submissionId={s.id} />
              {s.crmSyncedAt && <span>· synced {formatDateTime(s.crmSyncedAt)}</span>}
            </div>
          }
        />
        <Card
          title="WhatsApp group"
          body={
            s.whatsappGroupId ? (
              <div className="text-[12px]">
                <p className="text-brand-text-muted">Group Id</p>
                <code className="mt-0.5 block break-all font-mono text-brand-navy">
                  {s.whatsappGroupId}
                </code>
                {s.whatsappGroupInviteLink && (
                  <a
                    href={s.whatsappGroupInviteLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-brand-navy hover:text-brand-orange"
                  >
                    Invite link <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                )}
              </div>
            ) : (
              <span className="text-[12px] text-brand-text-muted">
                Not created.
              </span>
            )
          }
          footer={
            s.signedAt && s.submitterPhoneE164 ? (
              <RetryWhatsappButton
                submissionId={s.id}
                alreadyCreated={Boolean(s.whatsappGroupId)}
              />
            ) : (
              <span>
                {!s.signedAt
                  ? "Awaiting signature"
                  : "No submitter phone on file"}
              </span>
            )
          }
        />
      </section>

      {queueRow && queueRow.attempts > 0 && (
        <section className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 text-[13px]">
          <h2 className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-rose-800">
            CRM sync failure
          </h2>
          <p className="text-brand-text-dark">
            Attempt {queueRow.attempts} failed.{" "}
            {queueRow.lastError ?? "(no error recorded)"}
          </p>
          <p className="mt-1 text-[12px] text-brand-text-muted">
            Last attempt {queueRow.lastAttemptAt ? formatDateTime(queueRow.lastAttemptAt) : "-"} ·
            next retry {formatDateTime(queueRow.nextAttemptAt)}
          </p>
        </section>
      )}

      <section className="rounded-xl border border-brand-navy/10 bg-white p-4">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-navy">
          Quick links
        </h2>
        <div className="flex flex-wrap gap-2 text-[13px]">
          <a
            href={viewLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-brand-navy/10 px-3 py-1.5 hover:bg-brand-cream"
          >
            JV partner view <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
          {s.submitterEmail && (
            <a
              href={`mailto:${s.submitterEmail}`}
              className="inline-flex items-center gap-1 rounded-lg border border-brand-navy/10 px-3 py-1.5 hover:bg-brand-cream"
            >
              Email setter
            </a>
          )}
          {s.submitterPhoneE164 && (
            <a
              href={`tel:${s.submitterPhoneE164}`}
              className="inline-flex items-center gap-1 rounded-lg border border-brand-navy/10 px-3 py-1.5 hover:bg-brand-cream"
            >
              Call setter
            </a>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-brand-navy/10 bg-white p-4">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-navy">
          Admin actions
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          {s.status === "awaiting_signature" && s.esignDocumentId && (
            <ResendSigningButton submissionId={s.id} />
          )}
          <DeleteButton submissionId={s.id} label={propertyLabel} />
        </div>
        <p className="mt-2 text-[11px] text-brand-text-muted">
          Resend signing email is only shown while the submission is awaiting
          signature. Delete is permanent - removes all linked notes,
          attachments, and signed PDFs from Blob storage.
        </p>
      </section>

      {updates.length > 0 && (
        <section>
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-navy">
            Updates from JV partner ({updates.length})
          </h2>
          <ol className="space-y-2">
            {updates.map((u) => (
              <UpdateCard
                key={u.id}
                token={s.returnLinkToken}
                update={u}
              />
            ))}
          </ol>
        </section>
      )}

      {auditRows.length > 0 && (
        <section>
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-navy">
            Admin activity ({auditRows.length})
          </h2>
          <ol className="space-y-2">
            {auditRows.map((row) => (
              <li
                key={row.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-brand-navy/10 bg-white p-3 text-[13px]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <ActionBadge actionType={row.actionType} />
                    <span className="text-[11px] text-brand-text-muted">
                      {formatDateTime(row.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[12px] text-brand-text-muted">
                    by {row.adminEmail} ·{" "}
                    {JSON.stringify(row.details).slice(0, 200)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-navy">
          Submission details
        </h2>
        <div className="space-y-3">
          {sections.map((section) => (
            <div
              key={section.title}
              className="rounded-xl border border-brand-navy/10 bg-white p-4"
            >
              <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-navy">
                {section.title}
              </h3>
              <dl className="space-y-2 text-[13px]">
                {section.rows.map((r) => (
                  <div
                    key={r.label}
                    className="grid grid-cols-[160px_1fr] gap-3 sm:grid-cols-1 sm:gap-0.5"
                  >
                    <dt className="font-medium text-brand-text-muted">
                      {r.label}
                    </dt>
                    <dd
                      className={
                        r.multiline
                          ? "whitespace-pre-wrap text-brand-text-dark"
                          : "text-brand-text-dark"
                      }
                    >
                      {r.value || "-"}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Card({
  title,
  body,
  footer,
}: {
  title: string;
  body: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-brand-navy/10 bg-white p-4">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-navy">
        {title}
      </h3>
      <div className="flex-1">{body}</div>
      {footer && (
        <div className="mt-1 text-[11px] text-brand-text-muted">{footer}</div>
      )}
    </div>
  );
}

function UpdateCard({
  token,
  update,
}: {
  token: string;
  update: {
    id: string;
    createdAt: Date;
    updateType: "attachment" | "note";
    payload: unknown;
    crmSynced: boolean;
    lastSyncError: string | null;
  };
}) {
  const payload = (update.payload ?? {}) as Record<string, unknown>;
  const ts = formatDateTime(update.createdAt);
  if (update.updateType === "note") {
    const text = typeof payload.text === "string" ? payload.text : "";
    return (
      <li className="rounded-xl border border-brand-navy/10 bg-white p-4">
        <header className="mb-2 flex items-center justify-between gap-3 text-[11px]">
          <div className="flex items-center gap-1.5 font-semibold uppercase tracking-[0.14em] text-brand-navy">
            <MessageSquare className="h-3.5 w-3.5 text-brand-orange" aria-hidden />
            Note
          </div>
          <SyncBadge synced={update.crmSynced} ts={ts} error={update.lastSyncError} />
        </header>
        <p className="whitespace-pre-wrap text-[13px] text-brand-text-dark">
          {text}
        </p>
      </li>
    );
  }
  const filename =
    typeof payload.filename === "string" ? payload.filename : "attachment";
  const caption =
    typeof payload.caption === "string" ? payload.caption : "";
  const size =
    typeof payload.size === "number"
      ? `${Math.round(payload.size / 1024)} KB`
      : "";
  const href = `/api/view/${token}/attachments/${update.id}`;
  return (
    <li className="rounded-xl border border-brand-navy/10 bg-white p-4">
      <header className="mb-2 flex items-center justify-between gap-3 text-[11px]">
        <div className="flex items-center gap-1.5 font-semibold uppercase tracking-[0.14em] text-brand-navy">
          <FileText className="h-3.5 w-3.5 text-brand-orange" aria-hidden />
          Attachment
        </div>
        <SyncBadge synced={update.crmSynced} ts={ts} error={update.lastSyncError} />
      </header>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-[13px] font-medium text-brand-navy underline hover:text-brand-orange"
      >
        {filename}
      </a>
      <p className="mt-0.5 text-[11px] text-brand-text-muted">
        {[size, caption].filter(Boolean).join(" · ")}
      </p>
    </li>
  );
}

function SyncBadge({
  synced,
  ts,
  error,
}: {
  synced: boolean;
  ts: string;
  error: string | null;
}) {
  return (
    <span className="flex items-center gap-2 text-brand-text-muted">
      <span>{ts}</span>
      <span
        title={error ?? undefined}
        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          synced
            ? "bg-emerald-100 text-emerald-800"
            : "bg-amber-100 text-amber-800"
        }`}
      >
        {synced ? "Synced" : "Pending"}
      </span>
    </span>
  );
}

function propertyLine(s: {
  propertyStreet: string | null;
  propertyCity: string | null;
  propertyState: string | null;
}): string {
  return [s.propertyStreet, s.propertyCity, s.propertyState]
    .filter(Boolean)
    .join(", ");
}

function formatDateTime(d: Date): string {
  return new Date(d).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
