"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const PANDADOC_ORIGIN = "https://app.pandadoc.com";

/**
 * Embedded PandaDoc signing iframe.
 *
 * PandaDoc's embedded session emits postMessage events we can react to so
 * the user doesn't have to refresh after signing. The canonical source of
 * truth is still the server webhook (/api/webhooks/pandadoc); this is just
 * for nicer UX — it triggers a router.refresh() on completion so the page
 * re-fetches submission state and shows the "thanks" view.
 */
export function SigningFrame({ sessionUrl }: { sessionUrl: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"signing" | "completed" | "exception">(
    "signing",
  );

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== PANDADOC_ORIGIN) return;
      const data = event.data as { type?: string } | string | null;
      const type = typeof data === "string" ? data : data?.type;
      if (!type) return;

      if (type === "session_view.document.completed") {
        setStatus("completed");
        // Give the webhook a moment to land, then refresh the server state.
        setTimeout(() => router.refresh(), 1500);
      } else if (type === "session_view.document.exception") {
        setStatus("exception");
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [router]);

  return (
    <div className="overflow-hidden rounded-xl border border-brand-navy/10 bg-white shadow-[0_8px_30px_rgba(27,58,92,0.06)]">
      {status === "completed" && (
        <div className="border-b border-brand-navy/10 bg-brand-orange-light/40 px-4 py-3 text-sm font-medium text-brand-navy">
          Signature received — finishing up…
        </div>
      )}
      {status === "exception" && (
        <div className="border-b border-destructive/40 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
          Something went wrong inside PandaDoc. Refresh this page and try
          again, or email{" "}
          <a href="mailto:support@nichecrm.ai" className="underline">
            support@nichecrm.ai
          </a>
          .
        </div>
      )}
      <iframe
        title="Sign the JV agreement"
        src={sessionUrl}
        className="block h-[820px] w-full md:h-[900px]"
        allow="camera; microphone; fullscreen"
      />
    </div>
  );
}
