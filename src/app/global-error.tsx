"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#faf5f0",
          color: "#2d2d2d",
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div style={{ maxWidth: 480, padding: "48px 24px", textAlign: "center" }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#e8640a",
              margin: 0,
            }}
          >
            Critical error
          </p>
          <h1
            style={{
              marginTop: 8,
              fontSize: 28,
              lineHeight: 1.2,
              fontWeight: 600,
              color: "#1b3a5c",
            }}
          >
            The site couldn&apos;t load.
          </h1>
          <p
            style={{
              marginTop: 12,
              fontSize: 14,
              color: "#666",
              lineHeight: 1.5,
            }}
          >
            We&apos;ve logged the issue. Please try again in a moment, or email{" "}
            <a href="mailto:support@nichecrm.ai" style={{ color: "#e8640a" }}>
              support@nichecrm.ai
            </a>{" "}
            if it keeps happening.
          </p>
          {error.digest && (
            <p
              style={{
                marginTop: 8,
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: 11,
                color: "#666",
              }}
            >
              ref: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: 24,
              padding: "10px 20px",
              borderRadius: 9999,
              background: "#1b3a5c",
              color: "#fff",
              border: "none",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
