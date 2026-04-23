import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "JV With Niche — Submit a Joint Venture Opportunity",
  description:
    "Submit a distressed-property JV opportunity to the Niche acquisitions team. Fast, secure, signed in one session.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://jvwithniche.com",
  ),
  openGraph: {
    title: "JV With Niche",
    description:
      "Submit a distressed-property JV opportunity to the Niche acquisitions team.",
    url: "/",
    siteName: "JV With Niche",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full !scroll-smooth`}>
      <body className="flex min-h-full flex-col bg-brand-cream text-brand-text-dark">
        <SiteHeader />
        <main className="flex-1 pt-16 sm:pt-14">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
