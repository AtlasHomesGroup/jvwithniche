"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next1, setNext1] = useState("");
  const [next2, setNext2] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setMsg(null);
    if (next1.length < 12) {
      setMsg({
        kind: "err",
        text: "New password must be at least 12 characters.",
      });
      return;
    }
    if (next1 !== next2) {
      setMsg({ kind: "err", text: "The two new-password entries don't match." });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: current,
          newPassword: next1,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.message || `Failed (${res.status})`);
      }
      setMsg({
        kind: "ok",
        text: "Password updated. Other browsers have been signed out.",
      });
      setCurrent("");
      setNext1("");
      setNext2("");
    } catch (err) {
      setMsg({
        kind: "err",
        text: err instanceof Error ? err.message : "Password change failed",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-md gap-3 text-sm">
      <label>
        <span className="mb-1 block font-medium text-brand-navy">
          Current password
        </span>
        <Input
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          disabled={submitting}
          required
        />
      </label>
      <label>
        <span className="mb-1 block font-medium text-brand-navy">
          New password
        </span>
        <Input
          type="password"
          autoComplete="new-password"
          value={next1}
          onChange={(e) => setNext1(e.target.value)}
          disabled={submitting}
          required
          minLength={12}
        />
      </label>
      <label>
        <span className="mb-1 block font-medium text-brand-navy">
          Confirm new password
        </span>
        <Input
          type="password"
          autoComplete="new-password"
          value={next2}
          onChange={(e) => setNext2(e.target.value)}
          disabled={submitting}
          required
          minLength={12}
        />
      </label>
      {msg && (
        <p
          className={`text-[12px] font-medium ${
            msg.kind === "ok" ? "text-emerald-700" : "text-destructive"
          }`}
        >
          {msg.text}
        </p>
      )}
      <div>
        <Button type="submit" disabled={submitting} size="sm">
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating
            </>
          ) : (
            "Change password"
          )}
        </Button>
      </div>
    </form>
  );
}
