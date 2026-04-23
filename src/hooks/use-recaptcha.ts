"use client";

import { useCallback, useEffect, useRef } from "react";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

let loadPromise: Promise<void> | null = null;

function loadScript(siteKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(
      'script[src^="https://www.google.com/recaptcha/api.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      if ((existing as HTMLScriptElement).dataset.loaded === "true") resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    });
    script.addEventListener("error", (e) => reject(e));
    document.head.appendChild(script);
  });
  return loadPromise;
}

/**
 * Lazy-loads reCAPTCHA v3 and returns an `execute(action)` fn. If no site
 * key is configured, execute() resolves with an empty string and the server
 * treats it as "verification skipped in dev".
 */
export function useRecaptcha() {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const readyRef = useRef(false);

  useEffect(() => {
    if (!siteKey) return;
    void loadScript(siteKey).then(() => {
      readyRef.current = true;
    });
  }, [siteKey]);

  const execute = useCallback(
    async (action: string): Promise<string> => {
      if (!siteKey || typeof window === "undefined") return "";
      await loadScript(siteKey);
      return new Promise<string>((resolve, reject) => {
        if (!window.grecaptcha) {
          resolve("");
          return;
        }
        window.grecaptcha.ready(() => {
          window.grecaptcha!
            .execute(siteKey, { action })
            .then(resolve)
            .catch(reject);
        });
      });
    },
    [siteKey],
  );

  return { execute };
}
