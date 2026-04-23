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
   Step 1 — Setter (strict, for step validation)
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
   Step 2 — Prospect (strict, for step validation)
   ───────────────────────────────────────────────────────────── */

export const prospectSchema = z.object({
  prospectFirstName: nonEmptyString("Prospect first name"),
  prospectLastName: nonEmptyString("Prospect last name"),
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
   Step 4 — Universal narrative (strict)
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
   Step 5 — Deal-type-specific (strict, per variant)
   All fields are namespaced by variant prefix so they can
   coexist in the flat composite used for draft autosave.
   ───────────────────────────────────────────────────────────── */

// Pre-foreclosure / NOD share the same script — prefix "foreclosure_"
export const foreclosureSchema = z
  .object({
    foreclosure_auctionDate: z.string().trim().default(""),
    foreclosure_auctionTime: z.string().trim().default(""),
    foreclosure_onlyOwnerOnTitle: z.enum(YES_NO_UNKNOWN),
    foreclosure_otherOwners: z.string().trim().default(""),
    foreclosure_recentMortgageStatement: z.enum(YES_NO_UNKNOWN),
    foreclosure_multipleMortgagesOrHaf: minChars(1, "Mortgages / HAF detail"),
    foreclosure_lenderBackendPromise: z.enum(YES_NO_UNKNOWN),
    foreclosure_urgencyScale: z
      .number({ message: "Select 1 through 10" })
      .int()
      .min(1, "Select 1 through 10")
      .max(10, "Select 1 through 10"),
    foreclosure_paymentsMissed: z
      .number({ message: "Enter a number" })
      .int()
      .min(0, "Must be zero or more"),
    foreclosure_hardshipReason: minChars(40, "Hardship reason"),
    foreclosure_magicWand: minChars(40, "Magic wand outcome"),
  })
  .superRefine((data, ctx) => {
    if (
      data.foreclosure_onlyOwnerOnTitle === "No" &&
      !data.foreclosure_otherOwners.trim()
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Who else is on title?",
        path: ["foreclosure_otherOwners"],
      });
    }
  });
export type ForeclosureData = z.infer<typeof foreclosureSchema>;

export const probateSchema = z
  .object({
    probate_deceasedFullName: nonEmptyString("Deceased full name"),
    probate_dateOfDeath: z.string().trim().default(""),
    probate_isProbateOpened: z.enum(YES_NO_UNKNOWN),
    probate_executorName: z.string().trim().default(""),
    probate_executorContact: z.string().trim().default(""),
    probate_probateCourt: z.string().trim().default(""),
    probate_willExists: z.enum(YES_NO_UNKNOWN),
    probate_multipleHeirs: z.enum(YES_NO_UNKNOWN),
    probate_heirsDetail: z.string().trim().default(""),
    probate_outstandingLiens: nonEmptyString("Outstanding liens detail"),
  })
  .superRefine((data, ctx) => {
    if (data.probate_isProbateOpened === "Yes") {
      if (!data.probate_executorName.trim())
        ctx.addIssue({
          code: "custom",
          message: "Executor name is required",
          path: ["probate_executorName"],
        });
      if (!data.probate_executorContact.trim())
        ctx.addIssue({
          code: "custom",
          message: "Executor contact is required",
          path: ["probate_executorContact"],
        });
      if (!data.probate_probateCourt.trim())
        ctx.addIssue({
          code: "custom",
          message: "Probate court / county is required",
          path: ["probate_probateCourt"],
        });
    }
    if (
      data.probate_multipleHeirs === "Yes" &&
      !data.probate_heirsDetail.trim()
    ) {
      ctx.addIssue({
        code: "custom",
        message: "How many heirs, and are they in agreement about selling?",
        path: ["probate_heirsDetail"],
      });
    }
  });
export type ProbateData = z.infer<typeof probateSchema>;

export const preProbateSchema = z.object({
  preprobate_deceasedFullName: nonEmptyString("Deceased full name"),
  preprobate_dateOfDeath: z.string().trim().default(""),
  preprobate_relationshipToDeceased: nonEmptyString("Your relationship"),
  preprobate_likelyHeir: nonEmptyString("Likely heir / next of kin"),
  preprobate_probateInitiated: z.enum(YES_NO_UNKNOWN),
  preprobate_propertyOccupancy: z.enum(PREPROBATE_OCCUPANCY_OPTIONS),
  preprobate_outstandingLiens: nonEmptyString("Outstanding liens detail"),
});
export type PreProbateData = z.infer<typeof preProbateSchema>;

export const surplusFundsSchema = z.object({
  sf_auctionDate: nonEmptyString("Auction / foreclosure sale date"),
  sf_estimatedSurplusAmount: z
    .number({ message: "Enter a dollar amount" })
    .nonnegative("Must be zero or more"),
  sf_formerOwnerNotified: z.enum(YES_NO_UNKNOWN),
  sf_otherApproachedFormerOwner: z.enum(YES_NO_UNKNOWN),
  sf_countyJurisdiction: nonEmptyString("County / jurisdiction"),
  sf_claimTimeline: z.string().trim().default(""),
});
export type SurplusFundsData = z.infer<typeof surplusFundsSchema>;

export const divorceSchema = z
  .object({
    divorce_bothSpousesOnTitle: z.enum(YES_NO_UNKNOWN),
    divorce_divorceFinalized: z.enum(YES_NO_INPROGRESS),
    divorce_bothPartiesAgreeToSell: z.enum(YES_NO_UNKNOWN),
    divorce_courtOrderExists: z.enum(YES_NO_UNKNOWN),
    divorce_courtOrderDescription: z.string().trim().default(""),
    divorce_primaryContactSpouse: nonEmptyString("Primary contact spouse"),
  })
  .superRefine((data, ctx) => {
    if (
      data.divorce_courtOrderExists === "Yes" &&
      !data.divorce_courtOrderDescription.trim()
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Briefly describe the court order",
        path: ["divorce_courtOrderDescription"],
      });
    }
  });
export type DivorceData = z.infer<typeof divorceSchema>;

/* ─────────────────────────────────────────────────────────────
   Combined flat form schema — used for draft autosave and as
   react-hook-form's Field type. Everything relaxed so partial
   drafts pass; strict per-section schemas run before advancing
   a step, and server re-runs them at final submit.
   ───────────────────────────────────────────────────────────── */

const setterBase = z.object({
  firstName: z.string().default(""),
  lastName: z.string().default(""),
  address: z.string().default(""),
  city: z.string().default(""),
  state: z.string().default(""),
  zip: z.string().default(""),
  country: z.string().default("US"),
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
  propertyCountry: z.string().default("US"),
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

const foreclosureBase = z.object({
  foreclosure_auctionDate: z.string().default(""),
  foreclosure_auctionTime: z.string().default(""),
  foreclosure_onlyOwnerOnTitle: z.enum(YES_NO_UNKNOWN).optional(),
  foreclosure_otherOwners: z.string().default(""),
  foreclosure_recentMortgageStatement: z.enum(YES_NO_UNKNOWN).optional(),
  foreclosure_multipleMortgagesOrHaf: z.string().default(""),
  foreclosure_lenderBackendPromise: z.enum(YES_NO_UNKNOWN).optional(),
  foreclosure_urgencyScale: z.number().int().min(1).max(10).optional(),
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
  .merge(foreclosureBase)
  .merge(probateBase)
  .merge(preProbateBase)
  .merge(surplusFundsBase)
  .merge(divorceBase);

/** Input type — what the form state looks like BEFORE zod applies defaults.
 *  Everything is optional because the draft can be partial mid-fill. */
export type FullFormInput = z.input<typeof fullFormSchema>;

/** Output type — what a validated, fully-completed submission looks like.
 *  Server-side handlers receive this. */
export type FullFormOutput = z.output<typeof fullFormSchema>;

/** Alias the UI uses — we work with input-typed values throughout the form
 *  and only narrow to output on final submit. */
export type FullFormData = FullFormInput;

export const variantSchemaByDealType = {
  "Pre-foreclosure": foreclosureSchema,
  NOD: foreclosureSchema,
  Probate: probateSchema,
  "Pre-probate": preProbateSchema,
  "Surplus Funds": surplusFundsSchema,
  Divorce: divorceSchema,
} as const;

/* ─────────────────────────────────────────────────────────────
   Step metadata — drives the UI stepper + validation gates
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

/** Per-step lists of field names — used by react-hook-form's trigger() to
 *  validate only the current step before advancing. */
export const STEP_FIELDS: Record<FormStepId, ReadonlyArray<keyof FullFormData>> = {
  setter: [
    "firstName",
    "lastName",
    "address",
    "city",
    "state",
    "zip",
    "country",
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
    "propertyCountry",
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
  discovery: [], // populated dynamically from dealType + STEP_FIELDS_BY_DEAL_TYPE
  review: [],
};

export const DISCOVERY_FIELDS_BY_DEAL_TYPE: Record<
  DealType,
  ReadonlyArray<keyof FullFormData>
> = {
  "Pre-foreclosure": [
    "foreclosure_auctionDate",
    "foreclosure_auctionTime",
    "foreclosure_onlyOwnerOnTitle",
    "foreclosure_otherOwners",
    "foreclosure_recentMortgageStatement",
    "foreclosure_multipleMortgagesOrHaf",
    "foreclosure_lenderBackendPromise",
    "foreclosure_urgencyScale",
    "foreclosure_paymentsMissed",
    "foreclosure_hardshipReason",
    "foreclosure_magicWand",
  ],
  NOD: [
    "foreclosure_auctionDate",
    "foreclosure_auctionTime",
    "foreclosure_onlyOwnerOnTitle",
    "foreclosure_otherOwners",
    "foreclosure_recentMortgageStatement",
    "foreclosure_multipleMortgagesOrHaf",
    "foreclosure_lenderBackendPromise",
    "foreclosure_urgencyScale",
    "foreclosure_paymentsMissed",
    "foreclosure_hardshipReason",
    "foreclosure_magicWand",
  ],
  Probate: [
    "probate_deceasedFullName",
    "probate_dateOfDeath",
    "probate_isProbateOpened",
    "probate_executorName",
    "probate_executorContact",
    "probate_probateCourt",
    "probate_willExists",
    "probate_multipleHeirs",
    "probate_heirsDetail",
    "probate_outstandingLiens",
  ],
  "Pre-probate": [
    "preprobate_deceasedFullName",
    "preprobate_dateOfDeath",
    "preprobate_relationshipToDeceased",
    "preprobate_likelyHeir",
    "preprobate_probateInitiated",
    "preprobate_propertyOccupancy",
    "preprobate_outstandingLiens",
  ],
  "Surplus Funds": [
    "sf_auctionDate",
    "sf_estimatedSurplusAmount",
    "sf_formerOwnerNotified",
    "sf_otherApproachedFormerOwner",
    "sf_countyJurisdiction",
    "sf_claimTimeline",
  ],
  Divorce: [
    "divorce_bothSpousesOnTitle",
    "divorce_divorceFinalized",
    "divorce_bothPartiesAgreeToSell",
    "divorce_courtOrderExists",
    "divorce_courtOrderDescription",
    "divorce_primaryContactSpouse",
  ],
};

/** Default values used when mounting a fresh form. */
export const DEFAULT_FORM_VALUES: FullFormData =
  fullFormSchema.parse({}) as FullFormData;
