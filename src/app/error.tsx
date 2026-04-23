"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-6 py-20 text-center sm:px-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-orange">
        Something went wrong
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-brand-navy sm:text-2xl">
        Hmm, that didn&apos;t work.
      </h1>
      <p className="mt-3 text-sm text-brand-text-muted">
        We hit an unexpected error. Try again, or head back to the landing
        page — we&apos;ve logged the failure and our team will see it.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-[11px] text-brand-text-muted">
          ref: {error.digest}
        </p>
      )}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Back to landing</Link>
        </Button>
      </div>
    </div>
  );
}
