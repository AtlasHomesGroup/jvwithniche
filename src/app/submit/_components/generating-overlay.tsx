"use client";

import { Loader2 } from "lucide-react";

/**
 * Fullscreen overlay rendered while we POST to /api/submissions and wait
 * for PandaDoc to finish creating + sending the document. The wait is
 * typically 5-10 seconds; without this overlay users sometimes assumed
 * the form had hung and bailed before the redirect to /sign.
 */
export function GeneratingOverlay() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/70 px-4 backdrop-blur-sm"
    >
      <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl">
        <Loader2
          className="mx-auto h-12 w-12 animate-spin text-brand-orange"
          aria-hidden
        />
        <h2 className="mt-5 text-xl font-semibold tracking-tight text-brand-navy">
          Generating your JV agreement...
        </h2>
        <p className="mt-3 text-sm text-brand-text-muted">
          We&apos;re merging your information into the contract. This usually
          takes <strong className="text-brand-navy">5-10 seconds</strong>.
        </p>
        <p className="mt-2 text-[13px] font-medium text-brand-orange">
          Please don&apos;t close this tab - the signing window will open
          right here as soon as it&apos;s ready.
        </p>
      </div>
    </div>
  );
}
