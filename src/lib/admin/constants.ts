// Edge- and client-safe constants. Must not import or reference anything
// from node:crypto, node:fs, pg, or other Node-only modules - middleware
// (Edge runtime) and client components both import from this file.

export const SESSION_COOKIE_NAME = "niche_jv_admin_session";
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export type SubmissionStatus =
  | "draft"
  | "awaiting_signature"
  | "crm_sync_pending"
  | "crm_synced"
  | "failed";

export const ALL_STATUSES: readonly SubmissionStatus[] = [
  "draft",
  "awaiting_signature",
  "crm_sync_pending",
  "crm_synced",
  "failed",
];
