# JV With Niche — Product Specification

> **Purpose of this document:** Complete build specification for `jvwithniche.com`, a Niche-branded Joint Venture submission portal that replaces the current Typeform intake. Hand this file to Claude Code to scaffold the project.

---

## 1. Executive Summary

### 1.1 What we're building

A Niche-branded, mobile-first web portal where real estate investors (primarily Niche Community members, secondarily other investors/wholesalers) submit distressed-property JV opportunities to the Niche acquisitions team led by Michael Franke (500+ closed deals).

### 1.2 Core user flow

```
1. Submitter lands on jvwithniche.com (Niche-branded, mobile-first)
       ↓
2. Fills out smart conditional JV intake form
   (Setter info → Prospect info → Deal Type → conditional questions by deal type)
       ↓
3. Presented with JV agreement → signs via embedded e-signature (PandaDoc primary / Jotform Sign fallback)
   (All form fields auto-merged into the agreement — 2-3 clicks to sign)
       ↓
4. On signature completion:
   ├─→ Form data + signed PDF pushed to Niche CRM as Opportunity (Source of Record = "JV Request")
   ├─→ Niche CRM triggers existing email + SMS confirmation automation to submitter
   │   (Both messages contain the submitter's unique return link)
   ├─→ Portal auto-creates WhatsApp group (5 people total: 4 Niche team + submitter)
   │   Group name: "Niche JV — [Property Address]"
   │   Bot posts welcome message
   └─→ All future deal work happens in:
       • WhatsApp (communication)
       • Niche CRM (deal management, due diligence, Christina checklist)
       • jvwithniche.com unique link (attachments + append-only notes)
```

### 1.3 Design philosophy

**Basic but robust.** The portal intakes, signs, routes, and introduces — then gets out of the way. No accounts, no dashboards, no two-way status tracking. Every piece has one job.

---

## 2. Business Context

### 2.1 The Niche Family

The portal is the fourth product in the Niche ecosystem:

| Product | URL | Role |
|---|---|---|
| **Niche Data** | nichedata.ai | Daily-updated distressed property lists (foreclosure, probate, divorce, tax sale, surplus funds) — pre-enriched with parcel data, skip tracing, equity calculations |
| **Niche CRM** | nichecrm.ai | Salesforce-based managed package for investors. Pipeline: Prospect → Lead → Opportunity → Transaction → Closed Deal |
| **Niche Community** | getnichenow.com | 500+ investor community with 3x-weekly coaching, scripts, NicheOS training |
| **JV With Niche** (this build) | jvwithniche.com | NEW — JV submission portal for Niche's own acquisitions company |

### 2.2 Why this exists

Michael Franke runs a **real estate niche acquisitions company** that partners on deals with community members and other investors. The current intake is via Typeform, which is being replaced because:

- Data should flow directly into Niche CRM (Salesforce)
- Submitters should be able to add info flexibly after submission
- Needs to be Niche-branded, not generic Typeform
- Needs embedded e-signature in the same session as submission

### 2.3 Value Niche brings to a JV

When a submitter brings a deal, Niche can contribute any combination of:
- Capital / financing
- Homeowner conversations (Michael's 500+ deal experience)
- Purchase the property outright
- Light rehab → resell
- Probate attorney network
- Sub-to structuring
- Tough-situation navigation
- Paperwork / closing expertise

The portal captures enough info for the Niche acquisitions team to decide how they'll contribute.

### 2.4 Deal types accepted

Six deal types, conditional form logic for each:

1. Pre-foreclosure
2. NOD (Notice of Default)
3. Surplus Funds
4. Divorce
5. Probate
6. Pre-probate

Property types: **not limited to single-family.** Multi-family, commercial, land, sub-to deals all welcome.

Geography: **nationwide — no restrictions.**

---

## 3. Tech Stack

### 3.1 Required

| Layer | Choice | Reason |
|---|---|---|
| **Framework** | Next.js (App Router) | Matches existing Niche Vercel product hosting |
| **Hosting** | Vercel | Niche's standard hosting; DNS move from GoDaddy |
| **Styling** | Tailwind CSS | Fastest path to match nichecrm.ai aesthetic |
| **Database** | Vercel Postgres OR Supabase Postgres | Store drafts, submissions, unique link tokens, attachment refs, retry queue state |
| **File storage** | Vercel Blob OR Supabase Storage | Store attachments uploaded via unique link + signed PDF copies |
| **E-signature** | **Primary: PandaDoc.** Fallback: Jotform Sign. | PandaDoc has superior embedded signing + template merge fields API. Jotform Sign acceptable if cost is the deciding factor (user has existing subscription). |
| **WhatsApp API** | Whapi.Cloud OR AiSensy (recommended). Twilio considered but not ideal for programmatic group creation. | Need programmatic group creation + bot welcome message + adding 5 members. Twilio WhatsApp is designed for 1-to-1 business messaging. Final choice at implementation-time. |
| **Spam protection** | Google reCAPTCHA v3 + honeypot fields | Invisible, behavioral scoring + simple bot traps |
| **Email (dev alerts only)** | Resend or SendGrid | Used for dev-team alerts (abandoned drafts, CRM sync failures). NOT for submitter notifications — those fire from Niche CRM. |

### 3.2 Domain

- **Domain:** `jvwithniche.com`
- **Current registrar:** GoDaddy
- **Target hosting:** Vercel
- **Migration approach:** DNS-only (cheaper and simpler than registrar transfer). Keep registrar at GoDaddy, update nameservers OR A/CNAME records to point to Vercel. Registrar transfer is an alternative if preferred.

### 3.3 NOT in scope

- Submitter account system / login
- Two-way status tracking on the unique link page
- Analytics dashboard (can add in v2)
- SSO integration with Niche Community
- Sending submitter-facing email/SMS from the portal (Niche CRM already handles all submitter notifications)
- Salesforce API integration code (the Niche CRM team handles the Salesforce side — the portal just POSTs a structured payload to a webhook endpoint they provide)

---

## 4. The Form — Smart Conditional Intake

### 4.1 Form behavior rules

- **Single session, multi-step.** Not one-question-at-a-time like Typeform. Grouped sections with progress indicator.
- **Mobile-first.** Every field tested on phone-width viewports first.
- **Conditional logic.** Fields/sections show or hide based on Deal Type selection.
- **Auto-save as draft.** Every field change saves to the portal DB (tied to a session token). Submitter can refresh / close / return via email link within 7 days to resume.
- **Form validation.** Required fields blocked on submit. Real-time inline errors (not just on submit click).
- **Phone numbers:** formatted as `+E.164` (e.g., `+12196138767`) — use `libphonenumber-js` or similar.
- **Addresses:** Use Google Places Autocomplete for the Prospect property address to prevent typos. Setter's own address can be free text.

### 4.2 Section 1 — Niche Setter (the JV submitter)

Who is the person filling out this form.

| Field | Type | Required | Notes |
|---|---|---|---|
| First name | text | Yes | |
| Last name | text | Yes | |
| Address | text (free) | Yes | Setter's own address — no autocomplete required |
| City / Town | text | Yes | |
| State / Region | text or US-state dropdown | Yes | |
| Zip / Postal code | text | Yes | |
| Country | dropdown (default US) | Yes | |
| Email | email | Yes | Validated format |
| Cellular phone | phone (E.164) | Yes | Used for WhatsApp group |
| **WhatsApp confirmation checkbox** | checkbox | **Yes** | Label: *"I confirm this phone number has WhatsApp installed and I agree to join a WhatsApp group with the Niche acquisitions team to discuss this deal."* Form cannot be submitted without this checked. |
| Are you a Niche Community member? | Yes / No radio | Yes | Yes triggers a follow-up: "If yes, what email did you register with?" (used for tagging/prioritization in CRM) |

### 4.3 Section 2 — Prospect (the homeowner/seller)

Who the distressed-property seller is.

| Field | Type | Required | Notes |
|---|---|---|---|
| Prospect first name | text | Yes | |
| Prospect last name | text | Yes | |
| Property address (street) | Google Places Autocomplete | Yes | Autocomplete ensures clean, valid address |
| City / Town | text (auto-filled from autocomplete) | Yes | |
| State / Region | text (auto-filled) | Yes | |
| Zip / Postal code | text (auto-filled) | Yes | |
| Country | text (auto-filled, default US) | Yes | |
| Prospect email | email | No | Often unknown at this stage |
| Prospect best phone | phone (E.164) | No | Often unknown at this stage; allow "No" or blank |
| Property occupancy | dropdown | Yes | Options: Owner-occupied / Vacant / Tenant-occupied / Unknown |
| Mortgage company / Lender foreclosing | text | Conditional — required if Deal Type is Pre-foreclosure or NOD | |
| Foreclosing trustee | text | Conditional — required if Deal Type is Pre-foreclosure or NOD | |

### 4.4 Section 3 — Deal Type

Single dropdown with 6 options. The selection gates Section 4.

- Pre-foreclosure
- NOD (Notice of Default)
- Surplus Funds
- Divorce
- Probate
- Pre-probate

### 4.5 Section 4 — Deal Narrative (universal — shown for all deal types)

| Field | Type | Required | Notes |
|---|---|---|---|
| Explain the specific challenge you are encountering with this prospect | long text | Yes | Min 40 chars |
| Summary of the prospect's situation after speaking with them | long text | Yes | Min 40 chars |
| Equity estimate — with specific reasoning | long text | Yes | Placeholder example text: *"Example: Mortgage balance is $150K, Zillow value avg $450K, one mortgage, clean title. Estimated equity ~$300K."* |
| What assistance are you seeking in the JV? | checkbox multi-select | Yes | Options: Speak with the seller / Tough situation advice / Paperwork assistance / Close the deal / Bring financing / Other (text input) |
| Why do you believe this deal has potential? | long text | Yes | Min 40 chars |
| Any additional information or requests? | long text | No | |

### 4.6 Section 5 — Deal-Type-Specific Scripted Discovery Questions (conditional)

These fields ONLY appear based on Deal Type selection.

#### 4.6.1 If Deal Type = Pre-foreclosure OR NOD

Full script from the JV Portal Questionnaire.docx. Label the section *"Scripted Discovery Questions — Ask Your Prospect"*.

| Field | Type | Required | Notes |
|---|---|---|---|
| Auction date (if known) | date picker | No | |
| Auction time (if known) | time picker | No | |
| Is the prospect the only owner on title? | dropdown: Yes / No / Unknown | Yes | If No, follow-up text: "Who else is on title?" |
| Does the prospect have a recent mortgage statement available? | dropdown: Yes / No / Unknown | Yes | |
| More than one mortgage on the property? Or participated in COVID assistance / HAF? | long text | Yes | |
| Did the lender ever tell them money would be put on the back end of the loan (they wouldn't have to pay back)? | dropdown: Yes / No / Unknown | Yes | |
| **Prospect's 1-10 urgency scale** | **Radio buttons 1 through 10 in a row** | Yes | **Left label: *"1 — In denial"***. **Right label: *"10 — Ready to act"***. Mobile: wraps cleanly. Stored as integer 1-10. |
| How many payments missed? | number | Yes | |
| Hardship reason (what caused them to fall behind)? | long text | Yes | Min 40 chars. Include placeholder note: *"Ask honestly — hardship programs may be available, and this may need supporting documentation."* |
| Magic wand — reasonable outcome from the prospect's perspective? | long text | Yes | Min 40 chars |

#### 4.6.2 If Deal Type = Probate

| Field | Type | Required | Notes |
|---|---|---|---|
| Deceased full name | text | Yes | |
| Date of death (if known) | date | No | |
| Is probate opened? | dropdown: Yes / No / Unknown | Yes | |
| Executor / personal representative name | text | Conditional — required if probate opened = Yes | |
| Executor contact info | text | Conditional — required if probate opened = Yes | |
| Probate court / county | text | Conditional — required if probate opened = Yes | |
| Does a will exist? | dropdown: Yes / No / Unknown | Yes | |
| Are there multiple heirs? | dropdown: Yes / No / Unknown | Yes | If Yes → follow-up: "How many, and are they in agreement about selling?" (long text) |
| Any outstanding liens / mortgages on the property? | long text | Yes | |

#### 4.6.3 If Deal Type = Pre-probate

| Field | Type | Required | Notes |
|---|---|---|---|
| Deceased full name | text | Yes | |
| Date of death (if known) | date | No | |
| Your relationship to the deceased / to the heir | text | Yes | |
| Who is the likely heir / next of kin? | text | Yes | |
| Have any family members initiated probate yet? | dropdown: Yes / No / Unknown | Yes | |
| Is the property currently occupied? | dropdown | Yes | Options: Vacant / Occupied by heir / Occupied by tenant / Unknown |
| Any outstanding liens / mortgages? | long text | Yes | |

#### 4.6.4 If Deal Type = Surplus Funds

| Field | Type | Required | Notes |
|---|---|---|---|
| Auction / foreclosure sale date | date | Yes | |
| Estimated surplus funds amount | currency | Yes | |
| Has the former owner been notified of their right to claim? | dropdown: Yes / No / Unknown | Yes | |
| Has anyone else already approached the former owner about the surplus? | dropdown: Yes / No / Unknown | Yes | |
| County / jurisdiction of the foreclosure | text | Yes | |
| Estimated claim processing timeline | long text | No | |

#### 4.6.5 If Deal Type = Divorce

| Field | Type | Required | Notes |
|---|---|---|---|
| Are both spouses on title? | dropdown: Yes / No / Unknown | Yes | |
| Is the divorce finalized? | dropdown: Yes / No / In progress | Yes | |
| Are both parties in agreement about selling? | dropdown: Yes / No / Unknown | Yes | |
| Is there a court order related to the property? | dropdown: Yes / No / Unknown | Yes | If Yes → follow-up text: "Briefly describe the court order" |
| Who is the primary contact — which spouse? | text | Yes | |

### 4.7 Section 6 — Submit

- reCAPTCHA v3 invisible check (behavior scoring)
- Honeypot fields (hidden from real users, filled by bots → submission silently rejected)
- "Submit and Sign Agreement" CTA button

---

## 5. E-Signature Step

### 5.1 Flow

1. User clicks "Submit and Sign Agreement"
2. Form data validated. If valid:
   - Draft marked as "awaiting signature" in portal DB
   - E-signature session created with **all form fields auto-merged** into the JV agreement template
3. User sees embedded signing UI **inside the portal** (not redirected to PandaDoc/Jotform)
4. User signs with 2-3 clicks maximum (one click to accept terms, one to sign, one to confirm)
5. On signature webhook received → trigger downstream flow (CRM push + WhatsApp group + confirmations)

### 5.2 PandaDoc integration (primary)

- Create JV agreement template in PandaDoc UI with merge fields for every form field that belongs in the legal doc (submitter name, address, email, phone, prospect name, property address, deal type, date, etc.)
- Use **PandaDoc API** to:
  - Create a document from template with form data merged
  - Generate an embedded signing session URL
  - Embed that URL in an iframe inside the portal
- Configure **webhook endpoint** at `/api/webhooks/pandadoc` to receive signature-complete event
- Download signed PDF via API on webhook receipt, store in Vercel Blob / Supabase Storage

### 5.3 Jotform Sign integration (fallback)

- If cost is deciding factor. Acknowledge reduced embedded-signing polish — may require a short redirect instead of pure iframe embed
- Same merge-field and webhook pattern

### 5.4 JV agreement document

**The user (Michael) will create and upload the JV agreement template to PandaDoc/Jotform.** The portal build does not include drafting legal text. The portal only needs to know:
- The template ID
- The full list of merge field names that correspond to form fields (so they can be populated via API)

### 5.5 Abandoned signature handling

- If user closes browser mid-signature → draft remains in portal DB in "awaiting signature" state
- Draft link can be resumed via email (auto-sent when draft is initially saved during the form-filling step)
- **Dev-team email alert fires to Michael** when a draft reaches "awaiting signature" state but is not signed within 2 hours (configurable). Alert includes submitter name + email + phone + property address + deal type + direct link to the draft.
- Draft auto-deletes from portal DB after 7 days if not signed
- **No CRM push happens for abandoned drafts**

---

## 6. CRM Integration (Niche CRM / Salesforce)

### 6.1 Responsibility split

**The Niche CRM team handles the Salesforce side completely.** This includes:
- Receiving webhook from the portal
- Creating the Opportunity record in Salesforce
- Setting Source of Record = "JV Request"
- Attaching the signed PDF
- Triggering the existing email + SMS automation to the submitter (which merges in the unique return link provided by the portal)
- Returning the Opportunity ID to the portal

**The portal's only job** is to send a clean, complete, well-documented webhook payload to the endpoint the CRM team provides.

### 6.2 Webhook endpoint (CRM team provides)

The CRM team will provide:
- Webhook URL (e.g., some Salesforce-connected endpoint or middleware)
- Authentication method (API key in header, HMAC-signed payload, etc.)
- Expected response format (must include created Opportunity ID + status)

The portal stores this configuration in environment variables. Do NOT hardcode.

### 6.3 Payload the portal sends

On signed JV agreement received, portal POSTs:

```json
{
  "submission_id": "uuid-v4-from-portal",
  "source_of_record": "JV Request",
  "submitted_at": "ISO 8601 timestamp",
  "unique_return_link": "https://jvwithniche.com/deal/{token}",

  "setter": {
    "first_name": "string",
    "last_name": "string",
    "email": "string",
    "phone_e164": "+12025551234",
    "address": { "street": "...", "city": "...", "state": "...", "zip": "...", "country": "..." },
    "is_niche_community_member": true,
    "community_email": "string or null"
  },

  "prospect": {
    "first_name": "string",
    "last_name": "string",
    "email": "string or null",
    "phone_e164": "string or null",
    "property_address": { "street": "...", "city": "...", "state": "...", "zip": "...", "country": "..." },
    "occupancy": "Owner-occupied | Vacant | Tenant-occupied | Unknown",
    "lender": "string or null",
    "foreclosing_trustee": "string or null"
  },

  "deal": {
    "type": "Pre-foreclosure | NOD | Surplus Funds | Divorce | Probate | Pre-probate",
    "narrative": {
      "challenge": "string",
      "situation_summary": "string",
      "equity_estimate_reasoning": "string",
      "assistance_requested": ["Speak with the seller", "Paperwork assistance"],
      "assistance_other": "string or null",
      "potential_reasoning": "string",
      "additional_info": "string or null"
    },
    "deal_type_specific": {
      "// All deal-type-specific fields from section 4.6 go here, keyed by field name": "..."
    }
  },

  "agreement": {
    "signed_at": "ISO 8601 timestamp",
    "signed_pdf_url": "https://storage-url-to-pdf",
    "provider": "PandaDoc | Jotform",
    "provider_document_id": "string"
  },

  "whatsapp": {
    "group_created": true,
    "group_id": "string or null",
    "group_invite_link": "string or null"
  }
}
```

### 6.4 CRM response the portal expects

```json
{
  "status": "success",
  "opportunity_id": "sf-opportunity-id",
  "notification_triggered": true
}
```

Portal then:
- Stores `opportunity_id` against the submission in its DB
- Considers the submission "CRM-synced"
- The CRM is responsible for sending email + SMS to the submitter with the unique return link

### 6.5 Retry queue

If the CRM endpoint returns non-2xx OR times out OR is unreachable:
- Submission marked as `crm_sync_pending` in portal DB
- Exponential backoff retry: attempt after 1 min, 5 min, 15 min, 1 hour, 6 hours, 24 hours
- After 3 failed attempts, dev-team email alert fires to Michael
- After 6 failed attempts, submission flagged for manual review in portal admin view

### 6.6 Manual "Push to CRM" button (admin view)

- Portal admin area (password-protected, for Michael + ops team only)
- Lists all submissions with status: `awaiting_signature` | `crm_sync_pending` | `crm_synced` | `failed`
- **"Push to CRM" button** on any row allows manual re-trigger of the CRM webhook
- Also allows viewing the draft data + signed PDF inline for QA purposes
- No edit capability — view + retry only

---

## 7. WhatsApp Group Auto-Creation

### 7.1 Trigger

Fires **immediately after** the e-signature webhook arrives confirming the agreement is signed. Runs in parallel with the CRM webhook push (so group creation doesn't block CRM sync, and vice versa).

### 7.2 Group configuration

| Setting | Value |
|---|---|
| **Participants** | 5 total — 4 fixed Niche team phone numbers (config) + the submitter's phone number |
| **Group name** | `Niche JV — {property_street}, {property_city} {property_state}` (e.g., *"Niche JV — 4313 Maygog Rd, Sarasota FL"*) |
| **Group icon** | Niche logo (provided) |
| **Welcome message** | Bot-posted immediately after group creation:<br>*"Hi {submitter_first_name}! Thanks for submitting {property_full_address} for JV with Niche. Michael and our acquisitions team are reviewing your submission and will jump in here shortly to discuss next steps."* |

### 7.3 The 4 fixed Niche team phone numbers

Configured via environment variables (E.164 format):
- `NICHE_WHATSAPP_TEAM_1` (e.g., Michael Franke)
- `NICHE_WHATSAPP_TEAM_2`
- `NICHE_WHATSAPP_TEAM_3`
- `NICHE_WHATSAPP_TEAM_4`

User will provide these numbers at deploy time. All 4 numbers must have WhatsApp installed and must have pre-consented to being added to groups programmatically.

### 7.4 Provider choice

**Recommended: Whapi.Cloud or AiSensy.** Both support programmatic group creation + adding members + bot-posted messages. Final provider selection at implementation time based on pricing, reliability, and support.

**Twilio considered but not recommended** — Twilio's WhatsApp Business API is built for 1-to-1 business messaging, not group chat automation. Group creation/management is limited/awkward.

**Meta WhatsApp Cloud API direct** — technically possible but more dev overhead than specialized providers.

### 7.5 Failure handling

If WhatsApp group creation fails (submitter's number doesn't have WhatsApp, provider rate limit, API error):
- Do NOT block the CRM sync (they run in parallel, not sequential)
- Log the failure with details
- Set `group_created: false` in the CRM payload
- Dev-team email alert fires to Michael with submitter's contact info so the team can reach out via SMS/email/call instead
- No retry automatically (failed groups are usually due to submitter-side WhatsApp absence, which retry won't fix)

---

## 8. Unique Return Link

### 8.1 Generation

- Cryptographically secure random token (e.g., 32 chars, URL-safe base64)
- URL pattern: `https://jvwithniche.com/deal/{token}`
- Token stored in portal DB against the submission
- Token generated at submission-complete time
- **Never expires** (indefinite validity)

### 8.2 Delivery to submitter

The portal does NOT send the link to the submitter directly. The token is included in the CRM webhook payload, and Niche CRM's existing email + SMS automation templates merge it into outbound messages. This keeps all submitter notifications centralized in the CRM (existing deliverability, templates, spam monitoring, unsubscribe handling).

### 8.3 What the link shows

Minimalist. The page displays:
- Niche logo at top
- Heading: *"Add information about your JV submission"*
- (No status. No recap. No signed PDF. No WhatsApp link.)
- **Attachments upload area** (drag-and-drop + click to browse)
  - Supported: JPG, PNG, HEIC, PDF, DOCX, TXT, MP3, M4A (for seller call recordings), MP4 (short video walkthroughs)
  - Max per file: 25MB
  - Max total uploads per submission: unlimited
  - Each attachment can have an optional short caption
- **Append-note area**
  - Long text field with button "Add Note"
  - Each note is timestamped and append-only — cannot be edited or deleted once submitted
- A small "Your previous notes" list below (read-only, showing past notes the submitter has added via this link, so they know what they've already shared)

### 8.4 What the link does NOT show

- No copy of the original submission
- No signed agreement PDF
- No status ("Under review" / "In discussion" / etc.)
- No WhatsApp group link
- No ability to edit the original form data

### 8.5 How updates flow to the CRM

Every attachment upload and every note append triggers a secondary webhook to the Niche CRM endpoint:

```json
{
  "submission_id": "uuid",
  "opportunity_id": "sf-opportunity-id",
  "update_type": "attachment | note",
  "timestamp": "ISO 8601",
  "payload": {
    // If attachment: file URL, file name, caption, file size, MIME type
    // If note: note text
  }
}
```

The CRM team decides how to surface these on the Salesforce Opportunity record (timeline entry, file attachment, etc.).

### 8.6 Rate limiting on the unique link

- Max 20 attachments per hour per submission (prevents abuse if token leaks)
- Max 50 notes per hour per submission

---

## 9. Branding & Visual Design

### 9.1 Reference

Match **nichecrm.ai** aesthetic. When in doubt, reverse-engineer CSS from that site.

### 9.2 Specifics

- **Logo:** User provides SVG. Use in header, favicon, signed-agreement merge, WhatsApp group icon.
- **Colors:** Pull from nichecrm.ai palette — dark blues, whites, with accent colors (orange/yellow tones appeared on the CRM site).
- **Typography:** Modern sans-serif matching nichecrm.ai. If specific font not licensed, use Inter as default.
- **Tone:** Professional SaaS tool — matches CRM aesthetic, not the marketing/community feel of getnichenow.com.

### 9.3 Mobile-first

- Design every breakpoint starting from mobile (≤ 380px width)
- Scale up cleanly through tablet (768px) to desktop (1024px+)
- Form fields: large touch targets, one column on mobile
- Radio buttons 1-10 urgency scale: wraps gracefully on narrow screens (e.g., 2 rows of 5 on mobile)
- No horizontal scroll ever

### 9.4 Accessibility

- WCAG 2.1 AA minimum
- Keyboard navigation working throughout
- Color contrast ratios meet standards
- Form labels properly associated with inputs
- Error messages announced to screen readers

---

## 10. Data Storage (Portal DB)

### 10.1 Tables

**`submissions`**
```
id (uuid)
created_at, updated_at
status: draft | awaiting_signature | crm_sync_pending | crm_synced | failed
form_data (jsonb — full form state)
submitter_email, submitter_phone (denormalized for fast lookup)
signed_pdf_url (nullable)
signed_at (nullable)
crm_opportunity_id (nullable)
whatsapp_group_id (nullable)
whatsapp_group_created (boolean)
return_link_token (unique, indexed)
last_activity_at (for auto-delete of abandoned drafts)
```

**`submission_updates`** (for notes + attachments added via unique link)
```
id (uuid)
submission_id (FK)
created_at
update_type: attachment | note
payload (jsonb)
crm_synced (boolean)
crm_sync_attempts (int)
```

**`crm_sync_queue`** (retry queue)
```
id (uuid)
submission_id (FK, nullable — can also be for updates)
update_id (FK, nullable)
attempts (int)
last_attempt_at
next_attempt_at
last_error (text)
```

**`admin_users`** (for the admin view password login)
```
id, email, password_hash, created_at
```

### 10.2 PII considerations

- Submission data contains prospect PII (homeowner name, property address, phone)
- Deal-type-specific fields may contain additional sensitive info
- **No SSN / DOB collected via the portal** (those live in the Christina Checklist inside Niche CRM + WhatsApp, per decision)
- Ensure DB is encrypted at rest
- Ensure HTTPS everywhere
- Do not log PII to console / observability tools
- Signed PDFs stored in Vercel Blob / Supabase Storage — ensure bucket is private, URLs are signed with short TTL when shared

---

## 11. Abandoned Draft Handling

- Every field change during form-filling saves the draft to the DB (session-token-keyed)
- If user fills the form, clicks "Submit and Sign Agreement", but abandons e-signature → draft moves to `awaiting_signature` status
- Every status change sends an email to Michael alerting him about submission state (so he knows there's a hot draft that stalled at signature)
- Draft auto-deletes after 7 days of inactivity
- Draft is never pushed to CRM automatically — **only the manual "Push to CRM" button in the admin view can push an unsigned draft to CRM** (with a clear flag in the payload that it is unsigned)

---

## 12. Spam & Security

### 12.1 Spam protection

- **Google reCAPTCHA v3** — invisible, runs behavioral scoring on every submission. Tune threshold at 0.5.
- **Honeypot fields** — hidden CSS-display-none fields that bots fill, humans don't. If filled, silently reject the submission (don't tell the bot it was rejected).
- Rate limiting: max 5 submissions per IP per hour
- Rate limiting: max 20 attachment uploads per hour per unique link

### 12.2 Security

- HTTPS only (Vercel handles this automatically)
- Environment variables for all secrets (PandaDoc API key, WhatsApp provider key, reCAPTCHA keys, CRM webhook URL + auth, etc.)
- Never expose unique-link tokens in server logs
- HMAC-signed webhooks from PandaDoc / Jotform verified on receipt
- Admin view: password-gated with strong password requirement + rate limiting on login
- CSRF protection on all POST endpoints
- Input sanitization on all free-text fields

---

## 13. Notifications & Alerts

### 13.1 Submitter-facing notifications

**All handled by Niche CRM.** The portal does NOT send any email or SMS to submitters. The CRM's existing automation fires on Opportunity creation and handles all submitter communication using Niche's existing templates, deliverability infrastructure, and spam monitoring.

The portal only needs to include the unique return link in the CRM webhook payload so the CRM can merge it into outbound messages.

### 13.2 Dev-team / Michael-facing alerts (portal sends these)

Simple transactional emails to Michael's address (configurable via env var). Use Resend or SendGrid for these alerts only — NOT for submitter notifications.

| Alert | Trigger |
|---|---|
| **New draft stalled at signature** | Draft reaches `awaiting_signature` status but not signed within 2 hours |
| **CRM sync retry escalation** | A submission has failed 3 CRM sync attempts |
| **CRM sync final failure** | A submission has failed 6 CRM sync attempts and is flagged for manual review |
| **WhatsApp group creation failed** | Group could not be created post-signature (so team can reach out via other channels) |
| **Draft auto-deleted** | A draft has been auto-deleted after 7 days without signature |

---

## 14. Admin View (Michael / Ops Team)

### 14.1 Access

- Route: `/admin`
- Password-protected (portal-side auth, not SSO)
- Initial admin accounts created via seed / env config

### 14.2 Views

**Submissions list**
- Table of all submissions with filters: status, deal type, date range, submitter search
- Columns: Submitted date, Setter name, Property address, Deal type, Status, CRM Opportunity ID (if synced), Actions

**Submission detail**
- Full view of form data (read-only)
- Signed PDF (if present) — download button
- Attachments list (download each)
- Notes timeline (read-only)
- WhatsApp group info (group ID, creation status)
- CRM sync history (attempts, errors, timestamps)
- **Action buttons:**
  - **"Push to CRM"** — manually re-trigger CRM webhook (used for failed syncs OR unsigned drafts)
  - **"Delete submission"** — permanent delete with confirmation modal
  - **"Resend unique link"** — re-trigger CRM to send email + SMS with return link (useful if submitter lost link)

---

## 15. MVP Scope — What Ships in v1

All of the following are **in v1** per user's confirmation:

- [x] Smart conditional form on jvwithniche.com (Niche-branded, mobile-first)
- [x] Custom scripted questions for all 6 deal types (Pre-foreclosure, NOD, Probate, Pre-probate, Surplus Funds, Divorce)
- [x] E-signature integration (PandaDoc primary, Jotform Sign fallback)
- [x] CRM webhook push (handoff to Niche CRM team's endpoint)
- [x] WhatsApp group auto-creation with welcome message (5 people)
- [x] Unique link page (add attachments + append-only notes)
- [x] Spam protection (reCAPTCHA v3 + honeypot)
- [x] Abandoned draft handling with dev alerts to Michael
- [x] CRM sync retry queue with exponential backoff
- [x] Manual "Push to CRM" button in admin view
- [x] Admin view for submissions list + detail + actions

## 16. Deferred to v2+

- Submitter account system / login (unique link is sufficient)
- Two-way status tracking on the unique link (current: link shows no status)
- Analytics dashboard for Niche team (conversion funnel, drop-off rate, deal type breakdown)
- SSO / Niche Community membership auto-verification
- Custom email/SMS templates inside the CRM outbound messages (CRM team owns this)
- Multi-language support

---

## 17. Implementation Order / Milestones

Recommended build order for Claude Code:

### Milestone 1 — Foundation (no integrations)
- Next.js project scaffold on Vercel
- Tailwind + shadcn/ui components set up to match nichecrm.ai aesthetic
- Basic routing: `/`, `/deal/[token]`, `/admin`, `/api/*`
- Database schema + migrations
- Logo and branding assets wired in

### Milestone 2 — Form (no submission wiring)
- All sections of the form built with conditional logic
- Client-side validation, auto-save drafts to DB
- reCAPTCHA v3 + honeypot wired in
- Mobile-first responsive tested
- Google Places Autocomplete wired in for property address

### Milestone 3 — E-signature integration
- PandaDoc API integration
- Template configured in PandaDoc with merge fields
- Embedded signing flow
- Webhook endpoint for signature-complete event
- Store signed PDF in blob storage

### Milestone 4 — CRM & WhatsApp integration
- Outbound CRM webhook (with retry queue)
- WhatsApp provider (Whapi.Cloud or AiSensy) integration
- Group creation + welcome message logic
- Failure alerts to Michael

### Milestone 5 — Unique link page
- Token generation
- Attachments upload (Vercel Blob / Supabase Storage)
- Note append
- Update webhook to CRM

### Milestone 6 — Admin view
- Auth
- Submissions list + filters
- Submission detail view
- Manual Push-to-CRM, delete, resend-link actions

### Milestone 7 — Testing, polish, launch
- End-to-end testing on mobile + desktop
- DNS migration from GoDaddy to Vercel
- Production env variables configured
- Soft launch with internal test submissions
- Go live

---

## 18. Open Items (user to provide before/during build)

| Item | Owner | When needed |
|---|---|---|
| Niche logo in SVG | User | Milestone 1 |
| JV agreement template uploaded to PandaDoc with merge fields configured | User (legal team) | Milestone 3 |
| PandaDoc API key | User | Milestone 3 |
| 4 Niche team WhatsApp phone numbers (E.164 format) | User | Milestone 4 |
| WhatsApp API provider account + API key (Whapi.Cloud or AiSensy) | User | Milestone 4 |
| Niche CRM webhook URL + authentication method (from Niche CRM team) | User / Niche CRM team | Milestone 4 |
| Michael's email address for dev-team alerts | User | Milestone 4 |
| reCAPTCHA v3 site key + secret key | User | Milestone 2 |
| Google Places API key | User | Milestone 2 |
| Admin passwords for the `/admin` view | User | Milestone 6 |
| GoDaddy DNS access to migrate jvwithniche.com to Vercel | User | Milestone 7 |

---

## 19. Reference Documents

The following files were provided during discovery and inform the form structure (not included in this spec but available in project notes):

- **JV_PORTAL_QUESTIONNAIRE.docx** — source for the Pre-foreclosure / NOD scripted discovery questions and closing script (closing script is setter coaching, NOT portal content)
- **christina_checklist.xlsx** — due diligence data points (PA, SSN, DOB, loan info, etc.) — **NOT collected via the portal**, handled in Niche CRM + WhatsApp per user's decision
- **4 sample Typeform submissions** (April 2026) — show what real JV requests look like today; all 4 were Pre-foreclosure deals, submitters varied from total beginners to experienced investors

---

*End of specification.*
