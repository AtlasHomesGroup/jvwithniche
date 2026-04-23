import Image from "next/image";
import Link from "next/link";

const familyLinks = [
  { label: "Niche Data", href: "https://nichedata.ai/", accent: true },
  { label: "Niche CRM", href: "https://nichecrm.ai/", accent: true },
  { label: "Niche Community", href: "https://www.getnichenow.com/", accent: true },
];

const supportLinks = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Start a JV", href: "/submit" },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-brand-navy">
      <div className="mx-auto max-w-[1200px] px-6 pt-12 pb-6 sm:px-4 sm:pt-8">
        <div className="grid grid-cols-12 gap-8 sm:grid-cols-1 md:grid-cols-2">
          <div className="col-span-6 flex flex-col sm:col-span-1 md:col-span-2">
            <Link href="/" className="mb-2 inline-block">
              <Image
                src="/app-logo/logo.svg"
                alt="Niche"
                width={80}
                height={80}
                style={{ width: "auto", height: "80px" }}
              />
            </Link>
            <p className="mt-2 max-w-md text-[14px] leading-relaxed text-white/65">
              Submit a distressed-property JV opportunity to the Niche
              acquisitions team. Capital, seller conversations, paperwork and
              closing support — all on one deal.
            </p>
            <div className="mt-6 flex flex-col gap-1 text-[13px] text-white/60">
              <div className="flex flex-wrap items-center gap-x-2">
                <a
                  href="mailto:support@nichecrm.ai"
                  className="transition-colors hover:text-brand-orange"
                >
                  support@nichecrm.ai
                </a>
                <span className="text-white/30">|</span>
                <a
                  href="tel:+18163101161"
                  className="transition-colors hover:text-brand-orange"
                >
                  816-310-1161
                </a>
              </div>
              <span>3620 Arrowhead Ave, Independence, MO 64057</span>
            </div>
          </div>

          <div className="col-span-3 sm:col-span-1 md:col-span-1">
            <FooterColumn title="The portal" items={supportLinks} />
          </div>

          <div className="col-span-3 sm:col-span-1 md:col-span-1">
            <FooterColumn title="The Niche Family" items={familyLinks} />
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-5">
          <div className="grid grid-cols-12 items-center gap-4 sm:grid-cols-1 sm:text-center md:grid-cols-2">
            <p className="col-span-8 text-[12px] text-white/50 sm:col-span-1 md:col-span-2">
              © {year} Niche Solutions. All rights reserved.
            </p>
            <p className="col-span-4 whitespace-nowrap text-right text-[12px] text-white/55 sm:col-span-1 sm:text-center">
              A Niche Solutions product
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  items,
}: {
  title: string;
  items: { label: string; href: string; accent?: boolean }[];
}) {
  return (
    <div className="flex flex-col">
      <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">
        {title}
      </h3>
      <nav className="flex flex-col gap-2.5">
        {items.map((item) => {
          const className = `whitespace-nowrap text-[13px] font-medium transition-colors ${
            item.accent
              ? "text-brand-orange hover:text-white"
              : "text-white/70 hover:text-brand-orange"
          }`;
          const isExternal = item.href.startsWith("http");
          return isExternal ? (
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
  );
}
