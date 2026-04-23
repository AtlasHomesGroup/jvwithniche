"use client";

import { useFormContext } from "react-hook-form";

import { Button } from "@/components/ui/button";
import type { FullFormData } from "@/lib/form-schema";
import { StepHeading } from "./step-setter";

export function StepReview({
  onEditStep,
}: {
  onEditStep: (step: "setter" | "prospect" | "dealType" | "narrative" | "discovery") => void;
}) {
  const form = useFormContext<FullFormData>();
  const values = form.watch();

  const submitterName = [values.firstName, values.lastName]
    .filter(Boolean)
    .join(" ") || "—";
  const prospectName = [values.prospectFirstName, values.prospectLastName]
    .filter(Boolean)
    .join(" ") || "—";
  const propertyAddress =
    [values.propertyStreet, values.propertyCity, values.propertyState, values.propertyZip]
      .filter(Boolean)
      .join(", ") || "—";

  return (
    <div className="space-y-6">
      <StepHeading
        eyebrow="Step 6 · Review & sign"
        title="Look it over, then sign the JV agreement."
        description="Everything you've entered is below. Click Edit to jump back to a section, or Submit & Sign to continue."
      />

      <div className="space-y-4">
        <ReviewSection title="Setter" onEdit={() => onEditStep("setter")}>
          <Row label="Name" value={submitterName} />
          <Row label="Email" value={values.email} />
          <Row label="Phone" value={values.phoneE164} />
          <Row
            label="Address"
            value={
              [values.address, values.city, values.state, values.zip]
                .filter(Boolean)
                .join(", ") || "—"
            }
          />
          <Row
            label="Niche Community member"
            value={
              values.isNicheCommunityMember
                ? `Yes · ${values.communityEmail || "(no email given)"}`
                : "No"
            }
          />
          <Row
            label="WhatsApp consent"
            value={values.whatsappConsent ? "Confirmed" : "Not confirmed"}
          />
        </ReviewSection>

        <ReviewSection title="Prospect & property" onEdit={() => onEditStep("prospect")}>
          <Row label="Prospect" value={prospectName} />
          <Row label="Property" value={propertyAddress} />
          <Row label="Occupancy" value={values.occupancy ?? "—"} />
          {(values.dealType === "Pre-foreclosure" ||
            values.dealType === "NOD") && (
            <>
              <Row label="Lender" value={values.lender || "—"} />
              <Row
                label="Foreclosing trustee"
                value={values.foreclosingTrustee || "—"}
              />
            </>
          )}
        </ReviewSection>

        <ReviewSection title="Deal type" onEdit={() => onEditStep("dealType")}>
          <Row label="Selected" value={values.dealType ?? "—"} />
        </ReviewSection>

        <ReviewSection title="Narrative" onEdit={() => onEditStep("narrative")}>
          <Row label="Challenge" value={values.challenge || "—"} multiline />
          <Row
            label="Situation"
            value={values.situationSummary || "—"}
            multiline
          />
          <Row
            label="Equity estimate"
            value={values.equityEstimateReasoning || "—"}
            multiline
          />
          <Row
            label="Assistance requested"
            value={
              (values.assistanceRequested ?? []).join(", ") || "—"
            }
          />
          <Row
            label="Why it has potential"
            value={values.potentialReasoning || "—"}
            multiline
          />
          {values.additionalInfo && (
            <Row
              label="Additional info"
              value={values.additionalInfo}
              multiline
            />
          )}
        </ReviewSection>

        <ReviewSection
          title={`Discovery · ${values.dealType ?? "(no type)"}`}
          onEdit={() => onEditStep("discovery")}
        >
          <DiscoverySummary values={values} />
        </ReviewSection>
      </div>

      <div className="rounded-lg border border-brand-orange/30 bg-brand-orange-light/40 p-4 text-[13px] text-brand-navy">
        <p className="font-medium">Next: sign the JV agreement.</p>
        <p className="mt-1 text-brand-text-muted">
          When you click <strong>Submit &amp; Sign</strong>, we&apos;ll open
          the e-signature flow in the same session. Merging your info into
          the agreement takes 2–3 clicks.
        </p>
      </div>
    </div>
  );
}

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-brand-navy/10 bg-white p-4 sm:p-3">
      <header className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-navy">
          {title}
        </h3>
        <Button type="button" size="sm" variant="ghost" onClick={onEdit}>
          Edit
        </Button>
      </header>
      <dl className="space-y-2.5">{children}</dl>
    </section>
  );
}

function Row({
  label,
  value,
  multiline,
}: {
  label: string;
  value?: string;
  multiline?: boolean;
}) {
  const safe = value && value.trim().length > 0 ? value : "—";
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 text-[13px] sm:grid-cols-1 sm:gap-0.5">
      <dt className="font-medium text-brand-text-muted">{label}</dt>
      <dd
        className={
          multiline
            ? "whitespace-pre-wrap text-brand-text-dark"
            : "text-brand-text-dark"
        }
      >
        {safe}
      </dd>
    </div>
  );
}

function DiscoverySummary({ values }: { values: Partial<FullFormData> }) {
  const d = values.dealType;
  if (!d) return <Row label="Status" value="Pick a deal type first" />;

  const rows: Array<[string, string | number | undefined]> = [];

  if (d === "Pre-foreclosure" || d === "NOD") {
    rows.push(
      ["Auction date", values.foreclosure_auctionDate],
      ["Auction time", values.foreclosure_auctionTime],
      ["Only owner on title", values.foreclosure_onlyOwnerOnTitle],
      ["Other owners", values.foreclosure_otherOwners],
      ["Mortgage statement?", values.foreclosure_recentMortgageStatement],
      ["Multiple mortgages / HAF", values.foreclosure_multipleMortgagesOrHaf],
      ["Lender backend promise", values.foreclosure_lenderBackendPromise],
      ["Urgency 1-10", values.foreclosure_urgencyScale],
      ["Payments missed", values.foreclosure_paymentsMissed],
      ["Hardship reason", values.foreclosure_hardshipReason],
      ["Magic wand outcome", values.foreclosure_magicWand],
    );
  } else if (d === "Probate") {
    rows.push(
      ["Deceased", values.probate_deceasedFullName],
      ["Date of death", values.probate_dateOfDeath],
      ["Probate opened", values.probate_isProbateOpened],
      ["Executor", values.probate_executorName],
      ["Executor contact", values.probate_executorContact],
      ["Probate court", values.probate_probateCourt],
      ["Will exists", values.probate_willExists],
      ["Multiple heirs", values.probate_multipleHeirs],
      ["Heirs detail", values.probate_heirsDetail],
      ["Outstanding liens", values.probate_outstandingLiens],
    );
  } else if (d === "Pre-probate") {
    rows.push(
      ["Deceased", values.preprobate_deceasedFullName],
      ["Date of death", values.preprobate_dateOfDeath],
      ["Your relationship", values.preprobate_relationshipToDeceased],
      ["Likely heir", values.preprobate_likelyHeir],
      ["Probate initiated", values.preprobate_probateInitiated],
      ["Property occupancy", values.preprobate_propertyOccupancy],
      ["Outstanding liens", values.preprobate_outstandingLiens],
    );
  } else if (d === "Surplus Funds") {
    rows.push(
      ["Auction date", values.sf_auctionDate],
      [
        "Estimated surplus",
        typeof values.sf_estimatedSurplusAmount === "number"
          ? `$${values.sf_estimatedSurplusAmount.toLocaleString()}`
          : undefined,
      ],
      ["Former owner notified", values.sf_formerOwnerNotified],
      ["Others approached former owner", values.sf_otherApproachedFormerOwner],
      ["County / jurisdiction", values.sf_countyJurisdiction],
      ["Claim timeline", values.sf_claimTimeline],
    );
  } else if (d === "Divorce") {
    rows.push(
      ["Both spouses on title", values.divorce_bothSpousesOnTitle],
      ["Divorce finalized", values.divorce_divorceFinalized],
      ["Both agree to sell", values.divorce_bothPartiesAgreeToSell],
      ["Court order", values.divorce_courtOrderExists],
      ["Court order description", values.divorce_courtOrderDescription],
      ["Primary contact spouse", values.divorce_primaryContactSpouse],
    );
  }

  return (
    <>
      {rows.map(([label, value]) => (
        <Row
          key={label}
          label={label}
          value={
            value === undefined || value === null || value === ""
              ? "—"
              : String(value)
          }
          multiline={typeof value === "string" && value.length > 60}
        />
      ))}
    </>
  );
}
