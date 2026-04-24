import { requireAdminSession } from "@/lib/admin/session";
import { ChangePasswordForm } from "./change-password-form";
import { KillSessionsButton } from "./kill-sessions-button";

export const metadata = {
  title: "Profile · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminProfilePage() {
  const user = await requireAdminSession();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
          Profile
        </h1>
        <p className="mt-1 text-sm text-brand-text-muted">
          Your admin account for the JV With Niche portal.
        </p>
      </header>

      <section className="rounded-xl border border-brand-navy/10 bg-white p-5">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-navy">
          Account
        </h2>
        <dl className="grid gap-2 text-[13px]">
          <Row label="Email" value={user.email} />
          <Row label="Admin id" value={user.id} mono />
          <Row
            label="Created"
            value={new Date(user.createdAt).toLocaleString()}
          />
          <Row
            label="Last login"
            value={
              user.lastLoginAt
                ? new Date(user.lastLoginAt).toLocaleString()
                : "—"
            }
          />
          <Row
            label="Sessions valid from"
            value={new Date(user.sessionsValidFrom).toLocaleString()}
          />
        </dl>
      </section>

      <section className="rounded-xl border border-brand-navy/10 bg-white p-5">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-navy">
          Change password
        </h2>
        <p className="mb-3 text-[12px] text-brand-text-muted">
          Rotating your password also signs you out of every other browser
          automatically.
        </p>
        <ChangePasswordForm />
      </section>

      <section className="rounded-xl border border-rose-200 bg-rose-50/40 p-5">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-rose-800">
          Sign out of every browser
        </h2>
        <p className="mb-3 text-[12px] text-brand-text-muted">
          Invalidates every outstanding session for your account —
          including this one. Use this if you think your cookie may have
          leaked. You&apos;ll need to sign in again afterwards.
        </p>
        <KillSessionsButton />
      </section>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[180px_1fr] gap-3 sm:grid-cols-1 sm:gap-0.5">
      <dt className="font-medium text-brand-text-muted">{label}</dt>
      <dd
        className={
          mono
            ? "break-all font-mono text-[12px] text-brand-text-dark"
            : "text-brand-text-dark"
        }
      >
        {value}
      </dd>
    </div>
  );
}
