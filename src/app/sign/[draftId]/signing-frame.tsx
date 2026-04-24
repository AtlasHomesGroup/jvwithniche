"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

const PANDADOC_ORIGIN = "https://app.pandadoc.com";

/**
 * Embedded PandaDoc signing iframe.
 *
 * Watches for PandaDoc's postMessage events so we can replace the iframe
 * with a branded "thanks" view the moment the JV Partner finishes their
 * part — without waiting for Michael's counter-signature (which happens
 * asynchronously via email). The webhook is still the source of truth for
 * the DB state; this is the user-facing flow.
 */
export function SigningFrame({
  sessionUrl,
  submissionId,
}: {
  sessionUrl: string;
  submissionId: string;
}) {
  const [status, setStatus] = useState<"signing" | "completed" | "exception">(
    "signing",
  );

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== PANDADOC_ORIGIN) return;
      const data = event.data as { type?: string } | string | null;
      const type = typeof data === "string" ? data : data?.type;
      if (!type) return;

      if (type === "session_view.document.completed") {
        setStatus("completed");
      } else if (type === "session_view.document.exception") {
        setStatus("exception");
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (status === "completed") {
    return <CompletedView submissionId={submissionId} />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-brand-navy/10 bg-white shadow-[0_8px_30px_rgba(27,58,92,0.06)]">
      {status === "exception" && (
        <div className="border-b border-destructive/40 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
          Something went wrong inside PandaDoc. Refresh this page and try
          again, or email{" "}
          <a href="mailto:support@nichecrm.ai" className="underline">
            support@nichecrm.ai
          </a>
          .
        </div>
      )}
      <iframe
        title="Sign the JV agreement"
        src={sessionUrl}
        className="block h-[820px] w-full md:h-[900px]"
        allow="camera; microphone; fullscreen"
      />
    </div>
  );
}

function CompletedView({ submissionId }: { submissionId: string }) {
  return (
    <div className="rounded-2xl border border-brand-navy/10 bg-white p-6 shadow-[0_8px_30px_rgba(27,58,92,0.06)] sm:p-5">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-orange-light text-brand-orange">
        <CheckCircle2 className="h-7 w-7" />
      </div>
      <h2 className="mt-4 text-2xl font-semibold tracking-tight text-brand-navy sm:text-xl md:text-3xl">
        Signed. Thank you.
      </h2>
      <p className="mt-3 max-w-xl text-sm text-brand-text-muted">
        Your signature is on file. Michael Franke at Niche Acquisitions will
        counter-sign within 1–2 business days — you&apos;ll receive the fully
        executed agreement via email the moment he does.
      </p>

      <div className="mt-6 grid gap-3 rounded-lg border border-brand-navy/10 bg-brand-cream/40 p-4 text-sm text-brand-text-dark">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-orange">
            What happens next
          </p>
        </div>
        <ol className="ml-5 list-decimal space-y-1.5 text-brand-text-dark">
          <li>
            Michael reviews your submission in the Niche CRM (you&apos;ll see
            us in the WhatsApp group shortly).
          </li>
          <li>
            He counter-signs the agreement in PandaDoc.
          </li>
          <li>
            Both parties receive the executed PDF. We kick off the deal work.
          </li>
        </ol>
      </div>

      <div className="mt-6">
        <Button asChild>
          <Link href="/">Back to landing</Link>
        </Button>
      </div>

      <div className="mt-5 rounded-lg border border-border bg-brand-cream/40 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-text-muted">
          Reference ID
        </p>
        <code className="mt-1 block break-all font-mono text-[13px] text-brand-navy">
          {submissionId}
        </code>
        <p className="mt-2 text-[11px] text-brand-text-muted">
          Save this — quote it if you reach out to{" "}
          <a
            href="mailto:support@nichecrm.ai"
            className="underline hover:text-brand-orange"
          >
            support@nichecrm.ai
          </a>
          .
        </p>
      </div>
    </div>
  );
}
