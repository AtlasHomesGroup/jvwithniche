"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function onClick() {
    setSubmitting(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // Still navigate away — cookie is cleared server-side even on a
      // transport hiccup since the cookie is read per-request.
    }
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={submitting}
      className="text-[12px]"
    >
      <LogOut className="mr-1.5 h-3.5 w-3.5" aria-hidden />
      Sign out
    </Button>
  );
}
