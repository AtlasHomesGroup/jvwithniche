/**
 * Thin, typed wrapper around the PandaDoc public API.
 * Only the endpoints this project actually uses — creating a document from a
 * template, opening an embedded signing session, downloading the signed PDF,
 * and checking status.
 *
 * Auth: "API-Key {key}" header. Sandbox and production keys both use the
 * same base URL (https://api.pandadoc.com/public/v1) — different keys point
 * at different workspaces.
 */

const PANDADOC_API_BASE = "https://api.pandadoc.com/public/v1";

export class PandaDocConfigError extends Error {
  constructor() {
    super("PANDADOC_API_KEY is not set");
    this.name = "PandaDocConfigError";
  }
}

export class PandaDocApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`PandaDoc API error ${status}: ${body.slice(0, 200)}`);
    this.name = "PandaDocApiError";
  }
}

function apiKey(): string {
  const key = process.env.PANDADOC_API_KEY;
  if (!key) throw new PandaDocConfigError();
  return key;
}

export function isConfigured(): boolean {
  return Boolean(process.env.PANDADOC_API_KEY);
}

export function hasTemplate(): boolean {
  return Boolean(
    process.env.PANDADOC_API_KEY && process.env.PANDADOC_TEMPLATE_ID,
  );
}

async function request<T>(
  path: string,
  init: RequestInit & { parse?: "json" | "blob" | "none" } = {},
): Promise<T> {
  const { parse = "json", ...rest } = init;
  const res = await fetch(`${PANDADOC_API_BASE}${path}`, {
    ...rest,
    headers: {
      Authorization: `API-Key ${apiKey()}`,
      Accept: "application/json",
      ...(rest.body && !(rest.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(rest.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new PandaDocApiError(res.status, body);
  }
  if (parse === "none") return undefined as T;
  if (parse === "blob") return (await res.blob()) as T;
  return (await res.json()) as T;
}

/* ─────────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────────── */

export type Recipient = {
  email: string;
  first_name: string;
  last_name: string;
  role?: string;
  signing_order?: number;
  delivery_methods?: {
    email?: boolean;
    sms?: boolean;
  };
};

export type TokenValue = {
  name: string;
  value: string;
};

export type FieldValue = {
  /** Maps to a PandaDoc field *name* on the template (not the token). */
  name: string;
  value: string;
};

export type CreateDocumentInput = {
  name: string;
  template_uuid: string;
  recipients: Recipient[];
  tokens?: TokenValue[];
  fields?: Record<string, { value: string; role?: string }>;
  metadata?: Record<string, string>;
  /** If true, PandaDoc skips the "draft → sent" transition automatically
   *  once the document finishes being generated. We want this because
   *  embedded signing requires the doc in "document.sent" state. */
  send_now?: boolean;
};

export type Document = {
  id: string;
  status: string;
  name: string;
  date_created: string;
  date_modified: string;
};

export type EmbedSessionResult = {
  id: string;
  expires_at: string;
};

/* ─────────────────────────────────────────────────────────────
   Endpoints
   ───────────────────────────────────────────────────────────── */

export function createDocument(input: CreateDocumentInput): Promise<Document> {
  return request<Document>("/documents", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getDocument(documentId: string): Promise<Document> {
  return request<Document>(`/documents/${documentId}/details`);
}

export function getDocumentStatus(
  documentId: string,
): Promise<{ id: string; status: string }> {
  return request(`/documents/${documentId}`);
}

/**
 * Transition a draft document to "document.sent" so it can be embedded for
 * signing. Silent (no email) so the submitter only signs through the iframe.
 */
export function sendDocument(
  documentId: string,
  opts: { silent?: boolean } = {},
): Promise<{ id: string; status: string }> {
  return request(`/documents/${documentId}/send`, {
    method: "POST",
    body: JSON.stringify({
      silent: opts.silent ?? true,
      subject: "Your JV With Niche agreement",
    }),
  });
}

export function createEmbedSession(
  documentId: string,
  recipientEmail: string,
  lifetimeSeconds = 900,
): Promise<EmbedSessionResult> {
  return request<EmbedSessionResult>(`/documents/${documentId}/session`, {
    method: "POST",
    body: JSON.stringify({
      recipient: recipientEmail,
      lifetime: lifetimeSeconds,
    }),
  });
}

/** Returns the signed PDF as a Blob, suitable for streaming to Vercel Blob. */
export function downloadSignedPdf(documentId: string): Promise<Blob> {
  return request<Blob>(`/documents/${documentId}/download`, {
    parse: "blob",
    headers: { Accept: "application/pdf" },
  });
}

/**
 * Helper for local debugging — lists templates available to the API key so
 * the user can find their template UUID without clicking through the UI.
 */
export function listTemplates(): Promise<{
  results: Array<{ id: string; name: string; date_modified: string }>;
}> {
  return request("/templates");
}
