import Link from "next/link";

import { requireAdminSession } from "@/lib/admin/session";
import { LogoutButton } from "./_components/logout-button";

export const dynamic = "force-dynamic";

export default async function AuthedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdminSession();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 sm:px-4 sm:py-6">
      <header className="flex items-center justify-between gap-4 border-b border-brand-navy/10 pb-4">
        <div className="flex items-center gap-6">
          <Link
            href="/admin"
            className="text-[15px] font-bold tracking-tight text-brand-navy hover:text-brand-orange"
          >
            JV With Niche · Admin
          </Link>
          <nav className="flex items-center gap-4 text-[13px]">
            <Link
              href="/admin"
              className="text-brand-text-dark hover:text-brand-orange"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/submissions"
              className="text-brand-text-dark hover:text-brand-orange"
            >
              Submissions
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-brand-text-muted">
            {user.email}
          </span>
          <LogoutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
