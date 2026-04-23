"use client";

import * as React from "react";

/**
 * Honeypot trap. Bots auto-fill every visible field; humans can't see this
 * one. Submit handlers reject any submission where the value is non-empty.
 * Absolute-positioned off-screen (tabIndex=-1) so it stays truly invisible
 * to keyboard users and screen readers.
 */
export const HoneypotField = React.forwardRef<HTMLInputElement>((_, ref) => {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: "-9999px",
        top: "-9999px",
        opacity: 0,
        pointerEvents: "none",
        width: 0,
        height: 0,
        overflow: "hidden",
      }}
    >
      <label>
        Do not fill this field
        <input
          ref={ref}
          type="text"
          name="company_website"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </label>
    </div>
  );
});
HoneypotField.displayName = "HoneypotField";
