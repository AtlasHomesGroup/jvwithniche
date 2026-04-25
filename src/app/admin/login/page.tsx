import { redirect } from "next/navigation";

import { getAdminSession } from "@/lib/admin/session";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Admin login · JV With Niche",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getAdminSession();
  const sp = await searchParams;
  const next =
    sp.next && sp.next.startsWith("/admin") ? sp.next : "/admin";
  if (user) redirect(next);

  return (
    <div className="mx-auto max-w-md px-6 py-16 sm:px-4">
      <div className="rounded-2xl border border-brand-navy/10 bg-white p-8 shadow-[0_8px_30px_rgba(27,58,92,0.06)]">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-orange">
          Niche Ops
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-brand-navy">
          Admin sign in
        </h1>
        <p className="mt-2 text-sm text-brand-text-muted">
          Use your Niche operations email + password. Submissions data only -
          deal management happens in Salesforce.
        </p>
        <LoginForm next={next} />
      </div>
    </div>
  );
}
