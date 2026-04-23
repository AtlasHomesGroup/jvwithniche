"use client";

import Link from "next/link";
import { useFormContext } from "react-hook-form";

import { Button } from "@/components/ui/button";
import type { FullFormData } from "@/lib/form-schema";
import { StepHeading } from "./step-setter";
import { ForeclosureDiscovery } from "./discovery/foreclosure";
import { ProbateDiscovery } from "./discovery/probate";
import { PreProbateDiscovery } from "./discovery/pre-probate";
import { SurplusFundsDiscovery } from "./discovery/surplus-funds";
import { DivorceDiscovery } from "./discovery/divorce";

export function StepDiscovery() {
  const form = useFormContext<FullFormData>();
  const dealType = form.watch("dealType");

  if (!dealType) {
    return (
      <div className="space-y-6">
        <StepHeading
          eyebrow="Step 5 · Discovery questions"
          title="Pick a deal type first."
          description="These questions are tailored to the deal type you select in step 3."
        />
        <div className="rounded-lg border border-dashed border-border bg-brand-cream/50 p-6 text-sm text-brand-text-muted">
          <p>
            You haven&apos;t selected a deal type yet. Step back to step 3 to
            pick one, then return here.
          </p>
          <div className="mt-4">
            <Button asChild variant="outline" size="sm">
              <Link href="#">Go back to step 3</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const headingBody =
    dealType === "Pre-foreclosure" || dealType === "NOD"
      ? "Use this script verbatim when you talk to the prospect — Michael has refined it over 500+ closed deals."
      : "Answer what you know. Leave blank what you don't, and we'll chase it down together.";

  return (
    <div className="space-y-6">
      <StepHeading
        eyebrow={`Step 5 · Discovery · ${dealType}`}
        title="Scripted discovery questions."
        description={headingBody}
      />

      {(dealType === "Pre-foreclosure" || dealType === "NOD") && (
        <ForeclosureDiscovery />
      )}
      {dealType === "Probate" && <ProbateDiscovery />}
      {dealType === "Pre-probate" && <PreProbateDiscovery />}
      {dealType === "Surplus Funds" && <SurplusFundsDiscovery />}
      {dealType === "Divorce" && <DivorceDiscovery />}
    </div>
  );
}
