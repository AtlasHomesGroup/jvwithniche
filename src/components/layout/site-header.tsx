"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const familyLinks = [
  { label: "Niche Community", href: "https://www.getnichenow.com/" },
  { label: "Niche Data", href: "https://nichedata.ai/" },
  { label: "Niche CRM", href: "https://www.nichecrm.ai/" },
  { label: "Niche Acquisitions", href: "https://www.nicheacquisition.com/" },
] as const;

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 bg-white transition-shadow duration-300 ${
        scrolled ? "shadow-[0_1px_12px_rgba(0,0,0,0.06)]" : ""
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-6 sm:h-14 sm:px-4">
        <Link href="/" className="flex-shrink-0" aria-label="JV With Niche home">
          <Image
            src="/app-logo/niche-orange-icon.png"
            alt="Niche"
            width={291}
            height={291}
            priority
            style={{ width: "40px", height: "40px" }}
          />
        </Link>

        <nav className="flex items-center gap-2 sm:gap-1.5">
          {familyLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden rounded-full px-3 py-2 text-[13px] font-semibold text-brand-orange transition-colors hover:bg-brand-orange/10 hover:text-brand-orange-hover lg:inline-flex"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/submit"
            className="rounded-full bg-brand-navy px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-brand-navy-hover"
          >
            Start a JV
          </Link>
        </nav>
      </div>
    </header>
  );
}
