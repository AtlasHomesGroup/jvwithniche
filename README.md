# JV With Niche

Niche-branded Joint Venture submission portal — `jvwithniche.com`. Replaces the legacy Typeform intake with a mobile-first Next.js app that intakes deals, handles e-signature, pushes to Niche CRM (Salesforce), and auto-creates a 5-person WhatsApp group with the Niche acquisitions team.

Full product spec: [`docs/jv-with-niche-spec.md`](./docs/jv-with-niche-spec.md).

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 |
| Styling | Tailwind CSS v4 + shadcn/ui primitives |
| DB | Postgres via Drizzle ORM (`pg` driver) |
| File storage | Vercel Blob |
| E-signature | PandaDoc (primary) / Jotform Sign (fallback) |
| WhatsApp | Whapi.Cloud or AiSensy (configurable) |
| Email alerts | Resend or SendGrid (dev-team only) |
| Hosting | Vercel (DNS from GoDaddy) |

## Setup

```bash
npm install
cp .env.example .env.local
# fill in DATABASE_URL at minimum — everything else is additive per milestone
npm run db:push       # apply schema to the DB
npm run dev           # http://localhost:3000
```

Type-check and build:

```bash
npm run typecheck
npm run build
```

## Project layout

```text
src/
  app/
    layout.tsx           Root layout — Niche header/footer, Inter font, metadata
    page.tsx             Landing (hero + how it works + trust strip)
    submit/              Intake form (Milestone 2)
    deal/[token]/        Unique return-link page (Milestone 5)
    admin/               Ops admin view (Milestone 6)
    api/
      health/            GET — liveness probe
      submissions/       POST create/advance · PATCH /draft autosave (M2)
      webhooks/
        pandadoc/        POST e-sign webhook (M3)
        jotform/         POST e-sign webhook fallback (M3)
      deal/[token]/
        attachments/     POST upload + GET list (M5)
        notes/           POST append + GET list (M5)
      admin/
        login/           POST admin login (M6)
      cron/
        crm-retry/       GET — drain CRM retry queue (M4)
        stall-alerts/    GET — fire stalled-draft alerts + auto-delete (M3)
  components/
    ui/                  shadcn-style primitives (button, …)
  db/
    schema.ts            Drizzle schema — submissions / updates / sync queue / admin
    client.ts            Lazy Postgres pool + Drizzle instance
  lib/
    api.ts               JSON response helpers
    utils.ts             cn() classname merger
docs/
  jv-with-niche-spec.md  Full product specification
drizzle.config.ts        drizzle-kit config
vercel.json              Cron schedule for CRM retry + stall alerts
```

## Milestone status

- [x] **M1 — Foundation:** Next.js scaffold, Tailwind + shadcn tokens, Drizzle schema for all 4 tables, base routes and API stubs, Niche-branded layout with real logo + palette ported from `nichecrm.ai`, env template, cron schedule.
- [ ] **M2 — Intake form:** Conditional multi-section form, draft autosave, reCAPTCHA v3 + honeypot, Google Places autocomplete, full client + server validation.
- [ ] **M3 — E-signature:** PandaDoc template merge + embedded signing, webhook handler, signed-PDF storage, stalled-draft alerts, 7-day auto-delete.
- [ ] **M4 — CRM + WhatsApp:** Outbound CRM webhook with retry queue, WhatsApp group auto-create + welcome message, failure alerts.
- [ ] **M5 — Unique return link:** Attachments (Vercel Blob), append-only notes, secondary update webhook to CRM, rate limits.
- [ ] **M6 — Admin view:** Password auth, submissions list + filters, detail view, manual push-to-CRM, delete, resend-link.
- [ ] **M7 — Launch:** E2E tests, DNS migration from GoDaddy, prod env, soft launch.

## User-provided items (blocking milestones)

- **M1:** Niche logo SVG (currently a placeholder mark).
- **M2:** reCAPTCHA v3 site + secret keys · Google Places API key.
- **M3:** PandaDoc template with merge fields configured · PandaDoc API key.
- **M4:** 4 Niche team WhatsApp numbers (E.164) · WhatsApp provider API key · Niche CRM webhook URL + auth · Michael's alert email.
- **M6:** Admin password(s).
- **M7:** GoDaddy DNS access for cutover.

## Branding

Ported from the sibling `niche_crm_website` project. The live palette lives in [`src/app/globals.css`](./src/app/globals.css) as CSS variables exposed to Tailwind via `@theme inline`:

| Token | Value | Use |
| --- | --- | --- |
| `--brand-cream` | `#FAF5F0` | Page background |
| `--brand-navy` | `#1B3A5C` | Primary text, headings, solid CTAs |
| `--brand-navy-hover` | `#142d49` | Navy CTA hover |
| `--brand-orange` | `#E8640A` | Accent, hero CTAs |
| `--brand-orange-hover` | `#c85508` | Orange CTA hover |
| `--brand-orange-light` | `#FDE9D9` | Icon tiles, accent backgrounds |
| `--brand-text-dark` | `#2D2D2D` | Body copy |
| `--brand-text-muted` | `#666666` | Secondary copy |
| `--brand-navy-light` | `#D5E8F0` | Inline code, secondary chips |

Logo: [`public/app-logo/logo.svg`](./public/app-logo/logo.svg) — the circular "NICHE" mark (navy ring, orange center, white letterforms). Favicon: [`src/app/icon.ico`](./src/app/icon.ico). Header + footer components are in [`src/components/layout/`](./src/components/layout/) and mirror the CRM site — fixed 64px header with scroll-triggered shadow, navy footer with orange accent links.
