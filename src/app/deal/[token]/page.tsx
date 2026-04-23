import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";

function isPlausibleToken(token: string) {
  return /^[A-Za-z0-9_-]{16,64}$/.test(token);
}

export default async function DealLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isPlausibleToken(token)) notFound();

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 sm:px-4 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
        Add information about your JV submission
      </h1>
      <p className="mt-2 text-sm text-brand-text-muted">
        Upload attachments and add append-only notes for your submission. The
        Niche team sees these instantly in the CRM.
      </p>

      <section className="mt-10 rounded-2xl border border-dashed border-brand-navy/20 bg-white p-8 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-orange">
          Milestone 5
        </p>
        <h2 className="mt-2 text-lg font-semibold text-brand-navy">
          Attachments upload + note composer
        </h2>
        <p className="mt-2 text-sm text-brand-text-muted">
          Drag-and-drop attachments and append-only notes will be wired here.
          Token validated:{" "}
          <code className="rounded bg-brand-navy-light px-1.5 py-0.5 font-mono text-brand-navy">
            {token.slice(0, 6)}…
          </code>
        </p>
        <div className="mt-6">
          <Button variant="outline" disabled>
            Upload (coming soon)
          </Button>
        </div>
      </section>
    </div>
  );
}
