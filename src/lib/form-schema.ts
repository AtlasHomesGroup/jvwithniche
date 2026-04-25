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

/**
 * Canonical deal-type list. Order drives the UI dropdown; labels are what
 * we send to PandaDoc's `Deal Type` merge field and to the CRM.
 */
export const DEAL_TYPES = [
  "Foreclosure",
  "Probate",
  "Divorce",
  "Surplus Funds",
  "Estate Sales",
  "Tax Delinquent",
  "Code Violations",
  "Water Shutoff",
  "Pre-Probate",
  "Guardianship",
  "Lien",
  "Tired Landlord",
  "Expired Listing",
  "For Sale By Owner (FSBO)",
  "Driving for Dollars",
  "Bankruptcy Filing",
  "Eviction Filing",
  "Vacant Land",
  "Predictive Niche List",
  "Other Lead Type",
] as const;
export type DealType = (typeof DEAL_TYPES)[number];

/** Deal types for which we've scripted a specific discovery flow. Other
 *  types still see the universal urgency scale but no variant questions. */
export const SCRIPTED_DEAL_TYPES = [
  "Foreclosure",
  "Probate",
  "Pre-Probate",
  "Surplus Funds",
  "Divorce",
] as const satisfies readonly DealType[];
export type ScriptedDealType = (typeof SCRIPTED_DEAL_TYPES)[number];

export const ASSISTANCE_OPTIONS = [
  "Speak with the seller",
  "Tough situation advice",
  "Paperwork assistance",
  "Close the deal",
  "Bring financing",
  "Stop foreclosure",
  "Other",
] as const;

/** Assistance options that only make sense for specific deal types. */
export const DEAL_TYPE_ONLY_ASSISTANCE: Partial<
  Record<DealType, ReadonlyArray<(typeof ASSISTANCE_OPTIONS)[number]>>
> = {
  Foreclosure: ["Stop foreclosure"],
};

/** Returns the assistance options that should be shown for a given deal type. */
export function assistanceOptionsForDealType(
  dealType: DealType | undefined,
): ReadonlyArray<(typeof ASSISTANCE_OPTIONS)[number]> {
  return ASSISTANCE_OPTIONS.filter((opt) => {
    for (const [key, exclusive] of Object.entries(DEAL_TYPE_ONLY_ASSISTANCE)) {
      if (exclusive?.includes(opt) && key !== dealType) return false;
    }
    return true;
  });
}

/* ─────────────────────────────────────────────────────────────
   Reusable field validators
   ───────────────────────────────────────────────────────────── */

const nonEmptyString = (label: string) =>
  z.string().trim().min(1, { message: `${label} is required` });

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
   Step 1 - Setter (strict, all required)
   ───────────────────────────────────────────────────────────── */

export const setterSchema = z
  .object({
    firstName: nonEmptyString("First name"),
    lastName: nonEmptyString("Last name"),
    address: nonEmptyString("Address"),
    city: nonEmptyString("City"),
    state: nonEmptyString("State"),
    zip: nonEmptyString("Zip"),
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
   Step 2 - Prospect
   Required: names + property address block.
   Optional: prospect contact, occupancy, lender/trustee.
   ───────────────────────────────────────────────────────────── */

export const prospectSchema = z.object({
  prospectFirstName: nonEmptyString("Prospect first name"),
  prospectLastName: nonEmptyString("Prospect last name"),
  propertyStreet: nonEmptyString("Property street"),
  propertyCity: nonEmptyString("Property city"),
  propertyState: nonEmptyString("Property state"),
  propertyZip: nonEmptyString("Property zip"),
  prospectEmail: optionalEmail,
  prospectPhoneE164: optionalE164Phone,
  occupancy: z.enum(OCCUPANCY_OPTIONS).optional(),
  lender: z.string().trim().default(""),
  foreclosingTrustee: z.string().trim().default(""),
});

export type ProspectData = z.infer<typeof prospectSchema>;

/* ─────────────────────────────────────────────────────────────
   Step 3 - Deal Type
   ───────────────────────────────────────────────────────────── */

export const dealTypeSchema = z.object({
  dealType: z.enum(DEAL_TYPES),
});

export type DealTypeData = z.infer<typeof dealTypeSchema>;

/* ─────────────────────────────────────────────────────────────
   Step 4 - Narrative
   Required: assistanceRequested (at least one option).
   Everything else is optional free text.
   ───────────────────────────────────────────────────────────── */

export const narrativeSchema = z
  .object({
    challenge: z.string().trim().default(""),
    situationSummary: z.string().trim().default(""),
    equityEstimateReasoning: z.string().trim().default(""),
    assistanceRequested: z
      .array(z.enum(ASSISTANCE_OPTIONS))
      .min(1, "Select at least one assistance option"),
    assistanceOther: z.string().trim().default(""),
    potentialReasoning: z.string().trim().default(""),
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
   Step 5 - Discovery
   Required across every deal type: urgencyScale (1-10).
   Variant-specific fields are all optional free-form info.
   ───────────────────────────────────────────────────────────── */

export const urgencySchema = z.object({
  urgencyScale: z
    .number({ message: "Select 1 through 10" })
    .int()
    .min(1, "Select 1 through 10")
    .max(10, "Select 1 through 10"),
});

// Foreclosure - all fields optional except the universal urgency above.
export const foreclosureSchema = z.object({
  foreclosure_auctionDate: z.string().trim().default(""),
  foreclosure_auctionTime: z.string().trim().default(""),
  foreclosure_onlyOwnerOnTitle: z.enum(YES_NO_UNKNOWN).optional(),
  foreclosure_otherOwners: z.string().trim().default(""),
  foreclosure_recentMortgageStatement: z.enum(YES_NO_UNKNOWN).optional(),
  foreclosure_multipleMortgagesOrHaf: z.string().trim().default(""),
  foreclosure_lenderBackendPromise: z.enum(YES_NO_UNKNOWN).optional(),
  foreclosure_paymentsMissed: z.number().int().min(0).optional(),
  foreclosure_hardshipReason: z.string().trim().default(""),
  foreclosure_magicWand: z.string().trim().default(""),
});
export type ForeclosureData = z.infer<typeof foreclosureSchema>;

export const probateSchema = z.object({
  probate_deceasedFullName: z.string().trim().default(""),
  probate_dateOfDeath: z.string().trim().default(""),
  probate_isProbateOpened: z.enum(YES_NO_UNKNOWN).optional(),
  probate_executorName: z.string().trim().default(""),
  probate_executorContact: z.string().trim().default(""),
  probate_probateCourt: z.string().trim().default(""),
  probate_willExists: z.enum(YES_NO_UNKNOWN).optional(),
  probate_multipleHeirs: z.enum(YES_NO_UNKNOWN).optional(),
  probate_heirsDetail: z.string().trim().default(""),
  probate_outstandingLiens: z.string().trim().default(""),
});
export type ProbateData = z.infer<typeof probateSchema>;

export const preProbateSchema = z.object({
  preprobate_deceasedFullName: z.string().trim().default(""),
  preprobate_dateOfDeath: z.string().trim().default(""),
  preprobate_relationshipToDeceased: z.string().trim().default(""),
  preprobate_likelyHeir: z.string().trim().default(""),
  preprobate_probateInitiated: z.enum(YES_NO_UNKNOWN).optional(),
  preprobate_propertyOccupancy: z
    .enum(PREPROBATE_OCCUPANCY_OPTIONS)
    .optional(),
  preprobate_outstandingLiens: z.string().trim().default(""),
});
export type PreProbateData = z.infer<typeof preProbateSchema>;

export const surplusFundsSchema = z.object({
  sf_auctionDate: z.string().trim().default(""),
  sf_estimatedSurplusAmount: z.number().nonnegative().optional(),
  sf_formerOwnerNotified: z.enum(YES_NO_UNKNOWN).optional(),
  sf_otherApproachedFormerOwner: z.enum(YES_NO_UNKNOWN).optional(),
  sf_countyJurisdiction: z.string().trim().default(""),
  sf_claimTimeline: z.string().trim().default(""),
});
export type SurplusFundsData = z.infer<typeof surplusFundsSchema>;

export const divorceSchema = z.object({
  divorce_bothSpousesOnTitle: z.enum(YES_NO_UNKNOWN).optional(),
  divorce_divorceFinalized: z.enum(YES_NO_INPROGRESS).optional(),
  divorce_bothPartiesAgreeToSell: z.enum(YES_NO_UNKNOWN).optional(),
  divorce_courtOrderExists: z.enum(YES_NO_UNKNOWN).optional(),
  divorce_courtOrderDescription: z.string().trim().default(""),
  divorce_primaryContactSpouse: z.string().trim().default(""),
});
export type DivorceData = z.infer<typeof divorceSchema>;

/* ─────────────────────────────────────────────────────────────
   Combined flat form schema - used for draft autosave and as
   react-hook-form's Field type.
   ───────────────────────────────────────────────────────────── */

const setterBase = z.object({
  firstName: z.string().default(""),
  lastName: z.string().default(""),
  address: z.string().default(""),
  city: z.string().default(""),
  state: z.string().default(""),
  zip: z.string().default(""),
  email: z.string().default(""),
  phoneE164: z.string().default(""),
  whatsappConsent: z.boolean().default(false),
  isNicheCommunityMember: z.boolean().default(false),
  communityEmail: z.string().default(""),
});

const prospectBase = z.object({
  prospectFirstName: z.string().default(""),
  prospectLastName: z.string().default(""),
  propertyStreet: z.string().default(""),
  propertyCity: z.string().default(""),
  propertyState: z.string().default(""),
  propertyZip: z.string().default(""),
  prospectEmail: z.string().default(""),
  prospectPhoneE164: z.string().default(""),
  occupancy: z.enum(OCCUPANCY_OPTIONS).optional(),
  lender: z.string().default(""),
  foreclosingTrustee: z.string().default(""),
});

const dealTypeBase = z.object({
  dealType: z.enum(DEAL_TYPES).optional(),
});

const narrativeBase = z.object({
  challenge: z.string().default(""),
  situationSummary: z.string().default(""),
  equityEstimateReasoning: z.string().default(""),
  assistanceRequested: z.array(z.enum(ASSISTANCE_OPTIONS)).default([]),
  assistanceOther: z.string().default(""),
  potentialReasoning: z.string().default(""),
  additionalInfo: z.string().default(""),
});

// Universal urgency - required across every discovery flow.
const urgencyBase = z.object({
  urgencyScale: z.number().int().min(1).max(10).optional(),
});

const foreclosureBase = z.object({
  foreclosure_auctionDate: z.string().default(""),
  foreclosure_auctionTime: z.string().default(""),
  foreclosure_onlyOwnerOnTitle: z.enum(YES_NO_UNKNOWN).optional(),
  foreclosure_otherOwners: z.string().default(""),
  foreclosure_recentMortgageStatement: z.enum(YES_NO_UNKNOWN).optional(),
  foreclosure_multipleMortgagesOrHaf: z.string().default(""),
  foreclosure_lenderBackendPromise: z.enum(YES_NO_UNKNOWN).optional(),
  foreclosure_paymentsMissed: z.number().int().min(0).optional(),
  foreclosure_hardshipReason: z.string().default(""),
  foreclosure_magicWand: z.string().default(""),
});

const probateBase = z.object({
  probate_deceasedFullName: z.string().default(""),
  probate_dateOfDeath: z.string().default(""),
  probate_isProbateOpened: z.enum(YES_NO_UNKNOWN).optional(),
  probate_executorName: z.string().default(""),
  probate_executorContact: z.string().default(""),
  probate_probateCourt: z.string().default(""),
  probate_willExists: z.enum(YES_NO_UNKNOWN).optional(),
  probate_multipleHeirs: z.enum(YES_NO_UNKNOWN).optional(),
  probate_heirsDetail: z.string().default(""),
  probate_outstandingLiens: z.string().default(""),
});

const preProbateBase = z.object({
  preprobate_deceasedFullName: z.string().default(""),
  preprobate_dateOfDeath: z.string().default(""),
  preprobate_relationshipToDeceased: z.string().default(""),
  preprobate_likelyHeir: z.string().default(""),
  preprobate_probateInitiated: z.enum(YES_NO_UNKNOWN).optional(),
  preprobate_propertyOccupancy: z
    .enum(PREPROBATE_OCCUPANCY_OPTIONS)
    .optional(),
  preprobate_outstandingLiens: z.string().default(""),
});

const surplusFundsBase = z.object({
  sf_auctionDate: z.string().default(""),
  sf_estimatedSurplusAmount: z.number().nonnegative().optional(),
  sf_formerOwnerNotified: z.enum(YES_NO_UNKNOWN).optional(),
  sf_otherApproachedFormerOwner: z.enum(YES_NO_UNKNOWN).optional(),
  sf_countyJurisdiction: z.string().default(""),
  sf_claimTimeline: z.string().default(""),
});

const divorceBase = z.object({
  divorce_bothSpousesOnTitle: z.enum(YES_NO_UNKNOWN).optional(),
  divorce_divorceFinalized: z.enum(YES_NO_INPROGRESS).optional(),
  divorce_bothPartiesAgreeToSell: z.enum(YES_NO_UNKNOWN).optional(),
  divorce_courtOrderExists: z.enum(YES_NO_UNKNOWN).optional(),
  divorce_courtOrderDescription: z.string().default(""),
  divorce_primaryContactSpouse: z.string().default(""),
});

export const fullFormSchema = setterBase
  .merge(prospectBase)
  .merge(dealTypeBase)
  .merge(narrativeBase)
  .merge(urgencyBase)
  .merge(foreclosureBase)
  .merge(probateBase)
  .merge(preProbateBase)
  .merge(surplusFundsBase)
  .merge(divorceBase);

/** Input type - what the form holds BEFORE zod applies defaults. */
export type FullFormInput = z.input<typeof fullFormSchema>;
export type FullFormOutput = z.output<typeof fullFormSchema>;
export type FullFormData = FullFormInput;

/**
 * Maps deal types with specific scripts to their strict variant schema.
 * The submit endpoint re-runs this plus urgencySchema. Deal types without
 * a script only require urgency + narrative.assistanceRequested.
 */
export const variantSchemaByDealType: Partial<
  Record<DealType, z.ZodType>
> = {
  Foreclosure: foreclosureSchema,
  Probate: probateSchema,
  "Pre-Probate": preProbateSchema,
  "Surplus Funds": surplusFundsSchema,
  Divorce: divorceSchema,
};

/* ─────────────────────────────────────────────────────────────
   Step metadata - drives the UI stepper + validation gates
   ───────────────────────────────────────────────────────────── */

export const FORM_STEPS = [
  { id: "setter", label: "About you" },
  { id: "prospect", label: "Prospect & property" },
  { id: "dealType", label: "Deal type" },
  { id: "narrative", label: "Deal narrative" },
  { id: "discovery", label: "Discovery questions" },
  { id: "review", label: "Review & sign" },
] as const;

export type FormStepId = (typeof FORM_STEPS)[number]["id"];

/** Per-step lists of field names - used by react-hook-form's trigger() to
 *  validate only the current step before advancing. */
export const STEP_FIELDS: Record<FormStepId, ReadonlyArray<keyof FullFormData>> = {
  setter: [
    "firstName",
    "lastName",
    "address",
    "city",
    "state",
    "zip",
    "email",
    "phoneE164",
    "whatsappConsent",
    "isNicheCommunityMember",
    "communityEmail",
  ],
  prospect: [
    "prospectFirstName",
    "prospectLastName",
    "propertyStreet",
    "propertyCity",
    "propertyState",
    "propertyZip",
    "prospectEmail",
    "prospectPhoneE164",
    "occupancy",
    "lender",
    "foreclosingTrustee",
  ],
  dealType: ["dealType"],
  narrative: [
    "challenge",
    "situationSummary",
    "equityEstimateReasoning",
    "assistanceRequested",
    "assistanceOther",
    "potentialReasoning",
    "additionalInfo",
  ],
  discovery: ["urgencyScale"],
  review: [],
};

/** Per-step required field names - what the required-markers UI and the
 *  step validation reference to decide "is this step complete?". */
export const REQUIRED_FIELDS: Partial<Record<FormStepId, ReadonlySet<keyof FullFormData>>> = {
  setter: new Set([
    "firstName",
    "lastName",
    "address",
    "city",
    "state",
    "zip",
    "email",
    "phoneE164",
    "whatsappConsent",
  ]),
  prospect: new Set([
    "prospectFirstName",
    "prospectLastName",
    "propertyStreet",
    "propertyCity",
    "propertyState",
    "propertyZip",
  ]),
  dealType: new Set(["dealType"]),
  narrative: new Set(["assistanceRequested"]),
  discovery: new Set(["urgencyScale"]),
};

/** Default values used when mounting a fresh form. */
export const DEFAULT_FORM_VALUES: FullFormData =
  fullFormSchema.parse({}) as FullFormData;
