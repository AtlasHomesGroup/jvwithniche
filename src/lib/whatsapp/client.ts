/**
 * Thin wrapper around Whapi.Cloud's REST API for the operations this
 * project actually uses: create a group with members, post a text message,
 * fetch the group's invite link, and a couple of health/identity checks.
 *
 * Auth: `Authorization: Bearer <WHAPI_API_KEY>` header. Base URL defaults
 * to https://gate.whapi.cloud (can be overridden via WHAPI_API_BASE_URL
 * for testing or alternative regions).
 */

const DEFAULT_BASE_URL = "https://gate.whapi.cloud";

export class WhapiConfigError extends Error {
  constructor() {
    super("WHAPI_API_KEY is not set");
    this.name = "WhapiConfigError";
  }
}

export class WhapiApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`Whapi API error ${status}: ${body.slice(0, 200)}`);
    this.name = "WhapiApiError";
  }
}

function apiKey(): string {
  const key = process.env.WHAPI_API_KEY;
  if (!key) throw new WhapiConfigError();
  return key;
}

function baseUrl(): string {
  return (process.env.WHAPI_API_BASE_URL ?? DEFAULT_BASE_URL).replace(
    /\/+$/,
    "",
  );
}

export function isConfigured(): boolean {
  return Boolean(process.env.WHAPI_API_KEY);
}

async function request<T>(
  path: string,
  init: RequestInit & { parse?: "json" | "none" } = {},
): Promise<T> {
  const { parse = "json", ...rest } = init;
  const res = await fetch(`${baseUrl()}${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      Accept: "application/json",
      ...(rest.body && !(rest.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(rest.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new WhapiApiError(res.status, body);
  }
  if (parse === "none") return undefined as T;
  return (await res.json()) as T;
}

/* ─────────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────────── */

export interface HealthResponse {
  uptime: number;
  status: { code: number; text: string };
  version: string;
  user?: {
    id: string;
    name: string;
    is_business?: boolean;
  };
  channel_id?: string;
}

export interface CreateGroupInput {
  subject: string;
  /** Phone numbers in E.164 format. The `+` is stripped automatically. */
  participants: string[];
}

export interface CreatedGroup {
  id: string;
  subject?: string;
  participants?: Array<{ id: string; rank?: string }>;
}

export interface SendTextMessageInput {
  /** Group chat id from CreatedGroup.id, or a participant's wa-id */
  to: string;
  body: string;
}

export interface SendDocumentInput {
  /** Group chat id from CreatedGroup.id, or a participant's wa-id */
  to: string;
  /** Publicly-reachable URL that Whapi can fetch the file from. */
  mediaUrl: string;
  /** Displayed filename inside WhatsApp. */
  filename: string;
  /** Optional caption shown beneath the attachment. */
  caption?: string;
  /** Mime type - defaults to application/pdf. */
  mimeType?: string;
}

export interface SentMessage {
  message?: {
    id: string;
    chat_id: string;
    timestamp: number;
  };
}

export interface InviteLinkResponse {
  invite_code?: string;
  invite_link?: string;
  link?: string;
}

/* ─────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────── */

/** Strip "+", spaces, dashes, parens. WhatsApp ids are bare digits. */
export function normalizePhone(e164: string): string {
  return e164.replace(/[^\d]/g, "");
}

/* ─────────────────────────────────────────────────────────────
   Endpoints
   ───────────────────────────────────────────────────────────── */

export function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health");
}

export interface ContactCheckResponse {
  contacts: Array<{
    input: string;
    status: "valid" | "invalid" | string;
    wa_id?: string;
  }>;
}

/** Verify which numbers are actually registered on WhatsApp. */
export function checkContacts(
  numbers: string[],
): Promise<ContactCheckResponse> {
  return request<ContactCheckResponse>("/contacts", {
    method: "POST",
    body: JSON.stringify({
      contacts: numbers.map(normalizePhone),
      blocking: "wait",
    }),
  });
}

export function createGroup(
  input: CreateGroupInput,
): Promise<CreatedGroup> {
  return request<CreatedGroup>("/groups", {
    method: "POST",
    body: JSON.stringify({
      subject: input.subject,
      participants: input.participants.map(normalizePhone),
    }),
  });
}

export function sendTextMessage(
  input: SendTextMessageInput,
): Promise<SentMessage> {
  return request<SentMessage>("/messages/text", {
    method: "POST",
    body: JSON.stringify({
      to: input.to,
      body: input.body,
    }),
  });
}

/**
 * Posts a file attachment (PDF, image, etc.) to a chat via Whapi. The
 * `mediaUrl` must be a URL Whapi's servers can GET without auth - for our
 * signed JV agreement that's `/api/pdf/[token]` which proxies the private
 * Vercel Blob.
 */
export function sendDocument(
  input: SendDocumentInput,
): Promise<SentMessage> {
  return request<SentMessage>("/messages/document", {
    method: "POST",
    body: JSON.stringify({
      to: input.to,
      media: input.mediaUrl,
      filename: input.filename,
      caption: input.caption ?? "",
      mime_type: input.mimeType ?? "application/pdf",
    }),
  });
}

export function getGroupInviteLink(
  groupId: string,
): Promise<InviteLinkResponse> {
  return request<InviteLinkResponse>(
    `/groups/${encodeURIComponent(groupId)}/invite`,
  );
}

/**
 * Set a group's display picture. Whapi expects the image as either a
 * publicly-reachable URL or a base64 data-uri on the `media` field.
 */
export function setGroupIcon(
  groupId: string,
  mediaUrl: string,
): Promise<{ success?: boolean }> {
  return request<{ success?: boolean }>(
    `/groups/${encodeURIComponent(groupId)}/icon`,
    {
      method: "PATCH",
      body: JSON.stringify({ media: mediaUrl }),
    },
  );
}
