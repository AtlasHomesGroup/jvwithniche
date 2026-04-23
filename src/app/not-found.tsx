import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Page not found · JV With Niche",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-6 py-20 text-center sm:px-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-orange">
        404 · Not found
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-brand-navy sm:text-2xl">
        We can&apos;t find that page.
      </h1>
      <p className="mt-3 text-sm text-brand-text-muted">
        The link may be broken, or the page may have moved. Head back to the
        landing page — or start a new JV submission below.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild>
          <Link href="/">Back to landing</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/submit">Start a JV submission</Link>
        </Button>
      </div>
    </div>
  );
}
