import { z } from "zod";
import { parsePhoneNumberWithError } from "libphonenumber-js";

/* ─────────────────────────────────────────────────────────────
   Enums + shared constants (exported for UI)
   ───────────────────────────────────────────────────────────── */

export const YES_NO_UNKNOWN = ["Yes", "No", "Unknown"] as const;
export const YES_NO_INPROGRESS = ["Yes", "No", "In progress"] as const;

export const OCCUPANCY_OPTIONS = [
  "Owner-occupied",
  "Vacant",
  "Tenant-occupied",
  "Unknown",
] as const;

export const PREPROBATE_OCCUPANCY_OPTIONS = [
  "Vacant",
  "Occupied by heir",
  "Occupied by tenant",
  "Unknown",
] as const;

export const DEAL_TYPES = [
  "Pre-foreclosure",
  "NOD",
  "Surplus Funds",
  "Divorce",
  "Probate",
  "Pre-probate",
] as const;
export type DealType = (typeof DEAL_TYPES)[number];

export const ASSISTANCE_OPTIONS = [
  "Speak with the seller",
  "Tough situation advice",
  "Paperwork assistance",
  "Close the deal",
  "Bring financing",
  "Other",
] as const;

/* ─────────────────────────────────────────────────────────────
   Reusable field validators
   ───────────────────────────────────────────────────────────── */

const nonEmptyString = (label: string) =>
  z.string().trim().min(1, { message: `${label} is required` });

const minChars = (n: number, label: string) =>
  z.string().trim().min(n, {
    message: `${label} must be at least ${n} characters`,
  });

const e164Phone = z.string().refine(
  (v) => {
    if (!v) return false;
    try {
      return parsePhoneNumberWithError(v).isValid();
    } catch {
      return false;
    }
  },
  {
    message: "Enter a valid phone number with country code, e.g., +12025551234",
  },
);

const optionalEmail = z
  .union([z.string().email("Enter a valid email"), z.literal("")])
  .optional()
  .transform((v) => v ?? "");

const optionalE164Phone = z
  .union([e164Phone, z.literal("")])
  .optional()
  .transform((v) => v ?? "");

/* ─────────────────────────────────────────────────────────────
   Step 1 — Setter
   ───────────────────────────────────────────────────────────── */

export const setterSchema = z
  .object({
    firstName: nonEmptyString("First name"),
    lastName: nonEmptyString("Last name"),
    address: nonEmptyString("Address"),
    city: nonEmptyString("City"),
    state: nonEmptyString("State"),
    zip: nonEmptyString("Zip"),
    country: z.string().trim().min(1).default("US"),
    email: z.string().email("Enter a valid email"),
    phoneE164: e164Phone,
    whatsappConsent: z.literal(true, {
      message: "You must confirm this phone has WhatsApp to continue",
    }),
    isNicheCommunityMember: z.boolean(),
    communityEmail: z
      .union([z.string().email("Enter a valid email"), z.literal("")])
      .optional()
      .transform((v) => v ?? ""),
  })
  .superRefine((data, ctx) => {
    if (data.isNicheCommunityMember && !data.communityEmail) {
      ctx.addIssue({
        code: "custom",
        message: "Enter the email you registered with in Niche Community",
        path: ["communityEmail"],
      });
    }
  });

export type SetterData = z.infer<typeof setterSchema>;

/* ─────────────────────────────────────────────────────────────
   Step 2 — Prospect
   (lender + foreclosingTrustee required only if dealType is
   Pre-foreclosure or NOD — enforced at the combined schema level)
   ───────────────────────────────────────────────────────────── */

export const prospectSchema = z.object({
  firstName: nonEmptyString("Prospect first name"),
  lastName: nonEmptyString("Prospect last name"),
  propertyStreet: nonEmptyString("Property street"),
  propertyCity: nonEmptyString("Property city"),
  propertyState: nonEmptyString("Property state"),
  propertyZip: nonEmptyString("Property zip"),
  propertyCountry: z.string().trim().min(1).default("US"),
  prospectEmail: optionalEmail,
  prospectPhoneE164: optionalE164Phone,
  occupancy: z.enum(OCCUPANCY_OPTIONS),
  lender: z.string().trim().default(""),
  foreclosingTrustee: z.string().trim().default(""),
});

export type ProspectData = z.infer<typeof prospectSchema>;

/* ─────────────────────────────────────────────────────────────
   Step 3 — Deal Type
   ───────────────────────────────────────────────────────────── */

export const dealTypeSchema = z.object({
  dealType: z.enum(DEAL_TYPES),
});

export type DealTypeData = z.infer<typeof dealTypeSchema>;

/* ─────────────────────────────────────────────────────────────
   Step 4 — Universal narrative
   ───────────────────────────────────────────────────────────── */

export const narrativeSchema = z
  .object({
    challenge: minChars(40, "Challenge"),
    situationSummary: minChars(40, "Situation summary"),
    equityEstimateReasoning: nonEmptyString("Equity estimate"),
    assistanceRequested: z
      .array(z.enum(ASSISTANCE_OPTIONS))
      .min(1, "Select at least one assistance option"),
    assistanceOther: z.string().trim().default(""),
    potentialReasoning: minChars(40, "Why this deal has potential"),
    additionalInfo: z.string().trim().default(""),
  })
  .superRefine((data, ctx) => {
    if (
      data.assistanceRequested.includes("Other") &&
      data.assistanceOther.trim().length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Describe what 'Other' assistance means",
        path: ["assistanceOther"],
      });
    }
  });

export type NarrativeData = z.infer<typeof narrativeSchema>;

/* ─────────────────────────────────────────────────────────────
   Step 5 — Deal-type-specific questions (per-variant schemas)
   ───────────────────────────────────────────────────────────── */

// Pre-foreclosure / NOD share the same script
export const foreclosureSchema = z
  .object({
    auctionDate: z.string().trim().default(""),
    auctionTime: z.string().trim().default(""),
    onlyOwnerOnTitle: z.enum(YES_NO_UNKNOWN),
    otherOwners: z.string().trim().default(""),
    recentMortgageStatement: z.enum(YES_NO_UNKNOWN),
    multipleMortgagesOrHaf: minChars(1, "Mortgages / HAF detail"),
    lenderBackendPromise: z.enum(YES_NO_UNKNOWN),
    urgencyScale: z
      .number({ message: "Select 1 through 10" })
      .int()
      .min(1, "Select 1 through 10")
      .max(10, "Select 1 through 10"),
    paymentsMissed: z
      .number({ message: "Enter a number" })
      .int()
      .min(0, "Must be zero or more"),
    hardshipReason: minChars(40, "Hardship reason"),
    magicWand: minChars(40, "Magic wand outcome"),
  })
  .superRefine((data, ctx) => {
    if (data.onlyOwnerOnTitle === "No" && !data.otherOwners.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Who else is on title?",
        path: ["otherOwners"],
      });
    }
  });
export type ForeclosureData = z.infer<typeof foreclosureSchema>;

export const probateSchema = z
  .object({
    deceasedFullName: nonEmptyString("Deceased full name"),
    dateOfDeath: z.string().trim().default(""),
    isProbateOpened: z.enum(YES_NO_UNKNOWN),
    executorName: z.string().trim().default(""),
    executorContact: z.string().trim().default(""),
    probateCourt: z.string().trim().default(""),
    willExists: z.enum(YES_NO_UNKNOWN),
    multipleHeirs: z.enum(YES_NO_UNKNOWN),
    heirsDetail: z.string().trim().default(""),
    outstandingLiens: nonEmptyString("Outstanding liens detail"),
  })
  .superRefine((data, ctx) => {
    if (data.isProbateOpened === "Yes") {
      if (!data.executorName.trim())
        ctx.addIssue({
          code: "custom",
          message: "Executor name is required",
          path: ["executorName"],
        });
      if (!data.executorContact.trim())
        ctx.addIssue({
          code: "custom",
          message: "Executor contact is required",
          path: ["executorContact"],
        });
      if (!data.probateCourt.trim())
        ctx.addIssue({
          code: "custom",
          message: "Probate court / county is required",
          path: ["probateCourt"],
        });
    }
    if (data.multipleHeirs === "Yes" && !data.heirsDetail.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "How many heirs, and are they in agreement about selling?",
        path: ["heirsDetail"],
      });
    }
  });
export type ProbateData = z.infer<typeof probateSchema>;

export const preProbateSchema = z.object({
  deceasedFullName: nonEmptyString("Deceased full name"),
  dateOfDeath: z.string().trim().default(""),
  relationshipToDeceased: nonEmptyString("Your relationship"),
  likelyHeir: nonEmptyString("Likely heir / next of kin"),
  probateInitiated: z.enum(YES_NO_UNKNOWN),
  propertyOccupancy: z.enum(PREPROBATE_OCCUPANCY_OPTIONS),
  outstandingLiens: nonEmptyString("Outstanding liens detail"),
});
export type PreProbateData = z.infer<typeof preProbateSchema>;

export const surplusFundsSchema = z.object({
  auctionDate: nonEmptyString("Auction / foreclosure sale date"),
  estimatedSurplusAmount: z
    .number({ message: "Enter a dollar amount" })
    .nonnegative("Must be zero or more"),
  formerOwnerNotified: z.enum(YES_NO_UNKNOWN),
  otherApproachedFormerOwner: z.enum(YES_NO_UNKNOWN),
  countyJurisdiction: nonEmptyString("County / jurisdiction"),
  claimTimeline: z.string().trim().default(""),
});
export type SurplusFundsData = z.infer<typeof surplusFundsSchema>;

export const divorceSchema = z
  .object({
    bothSpousesOnTitle: z.enum(YES_NO_UNKNOWN),
    divorceFinalized: z.enum(YES_NO_INPROGRESS),
    bothPartiesAgreeToSell: z.enum(YES_NO_UNKNOWN),
    courtOrderExists: z.enum(YES_NO_UNKNOWN),
    courtOrderDescription: z.string().trim().default(""),
    primaryContactSpouse: nonEmptyString("Primary contact spouse"),
  })
  .superRefine((data, ctx) => {
    if (
      data.courtOrderExists === "Yes" &&
      !data.courtOrderDescription.trim()
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Briefly describe the court order",
        path: ["courtOrderDescription"],
      });
    }
  });
export type DivorceData = z.infer<typeof divorceSchema>;

/* ─────────────────────────────────────────────────────────────
   Combined form schema — one flat shape with conditional refines
   covering every cross-section dependency.
   ───────────────────────────────────────────────────────────── */

// The "flat" base omits superRefines because .merge/.extend work only on
// z.object, not on ZodEffects. We re-apply refinements on the combined form.
const setterBase = z.object({
  firstName: nonEmptyString("First name"),
  lastName: nonEmptyString("Last name"),
  address: nonEmptyString("Address"),
  city: nonEmptyString("City"),
  state: nonEmptyString("State"),
  zip: nonEmptyString("Zip"),
  country: z.string().trim().min(1).default("US"),
  email: z.string().email("Enter a valid email"),
  phoneE164: e164Phone,
  whatsappConsent: z.boolean(),
  isNicheCommunityMember: z.boolean(),
  communityEmail: z.string().trim().default(""),
});

const prospectBase = prospectSchema;

const narrativeBase = z.object({
  challenge: minChars(40, "Challenge"),
  situationSummary: minChars(40, "Situation summary"),
  equityEstimateReasoning: nonEmptyString("Equity estimate"),
  assistanceRequested: z
    .array(z.enum(ASSISTANCE_OPTIONS))
    .min(1, "Select at least one assistance option"),
  assistanceOther: z.string().trim().default(""),
  potentialReasoning: minChars(40, "Why this deal has potential"),
  additionalInfo: z.string().trim().default(""),
});

const foreclosureBase = z.object({
  auctionDate: z.string().trim().default(""),
  auctionTime: z.string().trim().default(""),
  onlyOwnerOnTitle: z.enum(YES_NO_UNKNOWN).optional(),
  otherOwners: z.string().trim().default(""),
  recentMortgageStatement: z.enum(YES_NO_UNKNOWN).optional(),
  multipleMortgagesOrHaf: z.string().trim().default(""),
  lenderBackendPromise: z.enum(YES_NO_UNKNOWN).optional(),
  urgencyScale: z.number().int().min(1).max(10).optional(),
  paymentsMissed: z.number().int().min(0).optional(),
  hardshipReason: z.string().trim().default(""),
  magicWand: z.string().trim().default(""),
});

const probateBase = z.object({
  deceasedFullName: z.string().trim().default(""),
  dateOfDeath: z.string().trim().default(""),
  isProbateOpened: z.enum(YES_NO_UNKNOWN).optional(),
  executorName: z.string().trim().default(""),
  executorContact: z.string().trim().default(""),
  probateCourt: z.string().trim().default(""),
  willExists: z.enum(YES_NO_UNKNOWN).optional(),
  multipleHeirs: z.enum(YES_NO_UNKNOWN).optional(),
  heirsDetail: z.string().trim().default(""),
  outstandingLiens: z.string().trim().default(""),
});

const preProbateBase = z.object({
  preprobate_relationshipToDeceased: z.string().trim().default(""),
  preprobate_likelyHeir: z.string().trim().default(""),
  preprobate_probateInitiated: z.enum(YES_NO_UNKNOWN).optional(),
  preprobate_propertyOccupancy: z
    .enum(PREPROBATE_OCCUPANCY_OPTIONS)
    .optional(),
  preprobate_outstandingLiens: z.string().trim().default(""),
});

const surplusFundsBase = z.object({
  sf_auctionDate: z.string().trim().default(""),
  sf_estimatedSurplusAmount: z.number().nonnegative().optional(),
  sf_formerOwnerNotified: z.enum(YES_NO_UNKNOWN).optional(),
  sf_otherApproachedFormerOwner: z.enum(YES_NO_UNKNOWN).optional(),
  sf_countyJurisdiction: z.string().trim().default(""),
  sf_claimTimeline: z.string().trim().default(""),
});

const divorceBase = z.object({
  divorce_bothSpousesOnTitle: z.enum(YES_NO_UNKNOWN).optional(),
  divorce_divorceFinalized: z.enum(YES_NO_INPROGRESS).optional(),
  divorce_bothPartiesAgreeToSell: z.enum(YES_NO_UNKNOWN).optional(),
  divorce_courtOrderExists: z.enum(YES_NO_UNKNOWN).optional(),
  divorce_courtOrderDescription: z.string().trim().default(""),
  divorce_primaryContactSpouse: z.string().trim().default(""),
});

/**
 * The full flat shape used for draft persistence and final submission.
 * Draft rows may hold partial data, hence most deal-type-specific fields
 * allow empty defaults; the final submit endpoint re-runs a strict
 * variant-specific schema based on dealType.
 */
export const fullFormSchema = setterBase
  .merge(prospectBase)
  .merge(z.object({ dealType: z.enum(DEAL_TYPES) }))
  .merge(narrativeBase)
  .merge(foreclosureBase)
  .merge(probateBase)
  .merge(preProbateBase)
  .merge(surplusFundsBase)
  .merge(divorceBase);

export type FullFormData = z.infer<typeof fullFormSchema>;

/**
 * Maps a dealType to the correct strict per-variant schema used at final
 * submit time. Server-side uses this to re-validate all deal-type-specific
 * fields before persisting a submission.
 */
export const variantSchemaByDealType = {
  "Pre-foreclosure": foreclosureSchema,
  NOD: foreclosureSchema,
  Probate: probateSchema,
  "Pre-probate": preProbateSchema,
  "Surplus Funds": surplusFundsSchema,
  Divorce: divorceSchema,
} as const;

/**
 * Steps in the order they appear in the UI. Matches the spec.
 */
export const FORM_STEPS = [
  { id: "setter", label: "About you" },
  { id: "prospect", label: "Prospect & property" },
  { id: "dealType", label: "Deal type" },
  { id: "narrative", label: "Deal narrative" },
  { id: "dealTypeSpecific", label: "Discovery questions" },
  { id: "submit", label: "Review & sign" },
] as const;

export type FormStepId = (typeof FORM_STEPS)[number]["id"];
