import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";

type FamilyLink = { label: string; href: string };

const familyLinks: FamilyLink[] = [
  { label: "Niche Community", href: "https://www.getnichenow.com/" },
  { label: "Niche Data", href: "https://nichedata.ai/" },
  { label: "Niche CRM", href: "https://www.nichecrm.ai/" },
  { label: "Niche Acquisitions", href: "https://www.nicheacquisition.com/" },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-brand-navy">
      {/* Ambient orange glow, top-right */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-[-8%] h-[540px] w-[540px] rounded-full bg-brand-orange/15 blur-3xl"
      />
      {/* Thin orange hairline at the top */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-orange/40 to-transparent"
      />

      <div className="relative mx-auto w-full max-w-[1200px] px-6 pt-16 pb-8 sm:px-4 sm:pt-12">
        {/* 3-column grid: brand/pitch · family links · contact */}
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-8">
          {/* Column 1 - logo + pitch */}
          <div className="md:col-span-5">
            <Link href="/" className="inline-block" aria-label="JV With Niche home">
              <Image
                src="/app-logo/niche-logo.png"
                alt="Niche"
                width={486}
                height={218}
                style={{ width: "auto", height: "56px" }}
              />
            </Link>
            <p className="mt-6 max-w-md text-[14px] leading-relaxed text-white/70">
              Submit a distressed-property JV opportunity to the Niche
              acquisitions team - we partner on capital, seller conversations,
              paperwork, and closing.
            </p>
          </div>

          {/* Column 2 - The Niche Family */}
          <div className="md:col-span-3">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">
              The Niche Family
            </h3>
            <ul className="mt-5 flex flex-col gap-3">
              {familyLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-1.5 text-[14px] font-medium text-brand-orange transition-colors hover:text-white"
                  >
                    {link.label}
                    <ArrowUpRight
                      className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                      aria-hidden="true"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 - Contact */}
          <div className="md:col-span-4">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">
              Contact
            </h3>
            <ul className="mt-5 flex flex-col gap-3 text-[13px]">
              <li>
                <a
                  href="mailto:support@nichecrm.ai"
                  className="group inline-flex w-fit items-center gap-3 text-white/80 transition-colors hover:text-brand-orange"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-colors group-hover:border-brand-orange/40 group-hover:bg-brand-orange/10">
                    <Mail className="h-4 w-4 text-brand-orange" />
                  </span>
                  support@nichecrm.ai
                </a>
              </li>
              <li>
                <a
                  href="tel:+18163101161"
                  className="group inline-flex w-fit items-center gap-3 text-white/80 transition-colors hover:text-brand-orange"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-colors group-hover:border-brand-orange/40 group-hover:bg-brand-orange/10">
                    <Phone className="h-4 w-4 text-brand-orange" />
                  </span>
                  816-310-1161
                </a>
              </li>
              <li>
                <span className="inline-flex w-fit items-start gap-3 text-white/80">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5">
                    <MapPin className="h-4 w-4 text-brand-orange" />
                  </span>
                  <span className="pt-1.5 leading-tight">
                    3620 Arrowhead Ave
                    <br />
                    Independence, MO 64057
                  </span>
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom - hairline divider with centered orange mark + copyright */}
        <div className="mt-14 flex items-center gap-4 sm:mt-10">
          <div className="h-px flex-1 bg-white/10" />
          <Image
            src="/app-logo/niche-orange-icon.png"
            alt=""
            width={291}
            height={291}
            style={{ width: "28px", height: "28px" }}
            aria-hidden="true"
          />
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <p className="mt-6 text-center text-[12px] text-white/45">
          © {year} Niche Solutions. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
