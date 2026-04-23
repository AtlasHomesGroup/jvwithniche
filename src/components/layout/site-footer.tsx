import Image from "next/image";
import Link from "next/link";

type FamilyLink = { label: string; href: string; accent: boolean };

const familyLinks: FamilyLink[] = [
  { label: "Niche Community", href: "https://www.getnichenow.com/", accent: true },
  { label: "Niche Data", href: "https://nichedata.ai/", accent: true },
  { label: "Niche CRM", href: "https://www.nichecrm.ai/", accent: true },
  { label: "Niche Acquisitions", href: "https://www.nicheacquisition.com/", accent: true },
  { label: "How it works", href: "/#how-it-works", accent: false },
  { label: "Start a JV", href: "/submit", accent: false },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-brand-navy">
      <div className="mx-auto w-full max-w-[1200px] px-6 pt-12 pb-6 sm:px-4 sm:pt-10">
        {/* Centered logo */}
        <div className="mb-10 flex justify-center">
          <Link href="/" aria-label="JV With Niche home">
            <Image
              src="/app-logo/niche-logo.png"
              alt="Niche"
              width={486}
              height={218}
              style={{ width: "auto", height: "56px" }}
            />
          </Link>
        </div>

        {/* Two equal columns */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-1 sm:gap-10">
          {/* Column 1 — pitch + contact */}
          <div className="flex flex-col gap-3 text-[13px] leading-relaxed text-white/70 sm:items-center sm:text-center">
            <p className="max-w-sm">
              Submit a distressed-property JV opportunity to the Niche
              acquisitions team — we partner on capital, seller conversations,
              paperwork, and closing.
            </p>
            <a
              href="mailto:support@nichecrm.ai"
              className="transition-colors hover:text-brand-orange"
            >
              support@nichecrm.ai
            </a>
            <a
              href="tel:+18163101161"
              className="transition-colors hover:text-brand-orange"
            >
              816-310-1161
            </a>
            <span className="text-white/65">3620 Arrowhead Ave</span>
            <span className="text-white/65">Independence, MO 64057</span>
          </div>

          {/* Column 2 — family links + in-site links */}
          <div className="flex flex-col sm:items-center sm:text-center">
            <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">
              The Niche Family
            </h3>
            <nav className="flex flex-col gap-2.5">
              {familyLinks.map((item) => {
                const className = `whitespace-nowrap text-[13px] font-medium transition-colors ${
                  item.accent
                    ? "text-brand-orange hover:text-white"
                    : "text-white/70 hover:text-brand-orange"
                }`;
                return item.href.startsWith("http") ? (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={className}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link key={item.label} href={item.href} className={className}>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-white/10 pt-5">
          <p className="text-[12px] text-white/50 sm:text-center">
            © {year} Niche Solutions. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
