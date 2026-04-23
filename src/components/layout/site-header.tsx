"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

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
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6 sm:h-14 sm:px-4">
        <Link href="/" className="flex-shrink-0" aria-label="JV With Niche home">
          <Image
            src="/app-logo/niche-orange-icon.png"
            alt="Niche"
            width={337}
            height={291}
            priority
            style={{ width: "auto", height: "40px" }}
          />
        </Link>

        <nav className="flex items-center gap-2">
          <a
            href="https://www.getnichenow.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-full border border-brand-navy/20 px-4 py-2 text-[13px] font-semibold text-brand-navy transition-colors hover:border-brand-navy hover:bg-brand-navy/5 sm:inline-flex"
          >
            Niche Community
          </a>
          <a
            href="https://nichedata.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-full bg-brand-orange px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-brand-orange-hover md:inline-flex"
          >
            Niche Data
          </a>
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
