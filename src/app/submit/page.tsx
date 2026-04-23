import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Submit a JV opportunity · JV With Niche",
};

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 sm:px-4">
      <div className="rounded-2xl border border-dashed border-brand-navy/20 bg-white p-8 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-orange">
          Milestone 2
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-brand-navy">
          Intake form goes here
        </h1>
        <p className="mt-3 text-sm text-brand-text-muted">
          The smart conditional JV intake form (Setter → Prospect → Deal type →
          narrative → deal-type-specific questions → e-signature) will be wired
          in the next milestone.
        </p>
        <div className="mt-6">
          <Button asChild variant="outline">
            <Link href="/">Back to landing</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
