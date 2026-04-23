import Link from "next/link";
import {
  CheckCircle2,
  FileSignature,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col">
      <Hero />
      <HowItWorks />
      <TrustStrip />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-brand-navy/5 bg-brand-cream">
      <div className="pointer-events-none absolute left-1/2 top-[-10%] h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-brand-orange/10 blur-3xl" />
      <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-6 px-6 py-20 text-center sm:px-4 sm:py-14">
        <span className="inline-flex items-center rounded-full border border-brand-navy/10 bg-white px-3 py-1 text-xs font-semibold tracking-wide text-brand-navy">
          500+ closed deals · Michael Franke &amp; the Niche acquisitions team
        </span>
        <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight text-brand-navy sm:text-3xl md:text-5xl">
          Partner with Niche on your next distressed-property deal.
        </h1>
        <p className="max-w-2xl text-balance text-base text-brand-text-muted sm:text-[15px] md:text-lg">
          Submit the opportunity, sign the JV agreement, and get introduced to
          our acquisitions team — all in one session. Capital, seller
          conversations, paperwork, and closing support available.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" variant="accent">
            <Link href="/submit">Start a JV submission</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#how-it-works">How it works</a>
          </Button>
        </div>
        <p className="text-xs text-brand-text-muted">
          Nationwide · SFR, multi-family, commercial, land, sub-to — all welcome.
        </p>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: CheckCircle2,
      title: "Tell us about the deal",
      body: "Smart intake form tailored to each deal type — pre-foreclosure, NOD, probate, pre-probate, surplus funds, or divorce.",
    },
    {
      icon: FileSignature,
      title: "Sign the JV agreement",
      body: "Your information is auto-merged into the agreement. Sign in 2–3 clicks — no redirect, no paperwork.",
    },
    {
      icon: MessageCircle,
      title: "Meet the acquisitions team",
      body: "We auto-create a WhatsApp group with Michael and the Niche team to discuss next steps immediately.",
    },
  ];

  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 border-b border-brand-navy/5 bg-white"
    >
      <div className="mx-auto max-w-5xl px-6 py-16 sm:px-4 sm:py-12">
        <div className="mb-10 max-w-2xl">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-orange">
            How it works
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-brand-navy sm:text-xl md:text-3xl">
            Three steps. One session. No account required.
          </h2>
        </div>
        <ol className="grid gap-6 md:grid-cols-3">
          {steps.map((step, idx) => (
            <li
              key={step.title}
              className="rounded-2xl border border-brand-navy/10 bg-brand-cream p-6 transition-shadow hover:shadow-[0_8px_30px_rgba(27,58,92,0.08)]"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-orange-light text-brand-orange">
                <step.icon className="h-5 w-5" />
              </div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-text-muted">
                Step {idx + 1}
              </p>
              <h3 className="mb-2 text-lg font-semibold text-brand-navy">
                {step.title}
              </h3>
              <p className="text-sm text-brand-text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function TrustStrip() {
  return (
    <section className="bg-brand-cream">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 py-10 text-center sm:px-4">
        <div className="inline-flex items-center gap-2 text-sm text-brand-navy">
          <ShieldCheck className="h-4 w-4 text-brand-orange" />
          <span className="font-medium">
            Your data flows directly into Niche CRM — encrypted in transit and at
            rest.
          </span>
        </div>
        <p className="max-w-2xl text-xs text-brand-text-muted">
          The portal doesn&apos;t sell, share, or market your information. We use
          it solely to evaluate and act on the JV opportunity you&apos;ve shared.
        </p>
      </div>
    </section>
  );
}
