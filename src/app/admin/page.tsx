import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Admin · JV With Niche",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-16 sm:px-4">
      <div className="rounded-2xl border border-brand-navy/10 bg-white p-8 shadow-[0_8px_30px_rgba(27,58,92,0.06)]">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-orange">
          Milestone 6 · Admin
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-brand-navy">
          Niche Ops — Admin login
        </h1>
        <p className="mt-2 text-sm text-brand-text-muted">
          Password-protected submissions dashboard. Login, list, detail view and
          manual CRM push will be wired in Milestone 6.
        </p>
        <form className="mt-6 space-y-4" action="#" method="post">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-brand-navy">Email</span>
            <input
              type="email"
              disabled
              className="h-10 w-full rounded-lg border border-input bg-brand-cream px-3 text-sm text-brand-navy shadow-sm disabled:opacity-60"
              placeholder="ops@niche"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-brand-navy">
              Password
            </span>
            <input
              type="password"
              disabled
              className="h-10 w-full rounded-lg border border-input bg-brand-cream px-3 text-sm text-brand-navy shadow-sm disabled:opacity-60"
              placeholder="••••••••"
            />
          </label>
          <Button type="button" disabled className="w-full">
            Sign in (coming soon)
          </Button>
        </form>
      </div>
    </div>
  );
}
