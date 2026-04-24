/**
 * HTTP wrapper around the Niche CRM (Salesforce) JV request endpoint.
 *
 * The endpoint is a public Apex REST method served from a Salesforce Site —
 * no auth header, just JSON in + JSON out. When the integration isn't
 * enabled (CRM_ENDPOINT_URL not set) the push is skipped silently so local
 * dev and early-access deploys can still ship without hitting their CRM.
 */

export class CrmConfigError extends Error {
  constructor() {
    super("CRM_ENDPOINT_URL is not set");
    this.name = "CrmConfigError";
  }
}

export class CrmApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`CRM API error ${status}: ${body.slice(0, 200)}`);
    this.name = "CrmApiError";
  }
}

function endpointUrl(): string {
  const url = process.env.CRM_ENDPOINT_URL;
  if (!url) throw new CrmConfigError();
  return url;
}

export function isConfigured(): boolean {
  return Boolean(process.env.CRM_ENDPOINT_URL);
}

export interface CrmLeadFields {
  attributes: { type: "Lead__c"; url?: string };
  /** Present only on follow-up pushes — identifies the existing Lead. */
  Id?: string;
  First_Name__c?: string;
  Full_Name__c?: string;
  Email__c?: string;
  Phone__c?: string;
  Address__c?: string;
  Type__c?: string;
  Entity_Type__c?: string;
  Source__c?: string;
  Status__c?: string;
  Is_Website_Data__c?: boolean;
  Auction_Date__c?: string;
}

export interface CrmNote {
  title: string;
  body: string;
}

export interface CrmFile {
  filename: string;
  contentType: string;
  base64: string;
}

export interface CrmPushPayload {
  requestObject: CrmLeadFields;
  description: string;
  notes: CrmNote[];
  files: CrmFile[];
}

/** Possible response shapes from the Apex endpoint. */
interface CrmPushResponseShape {
  id?: string;
  Id?: string;
  success?: boolean;
  message?: string;
  requestObject?: { Id?: string; id?: string };
}

export interface CrmPushResult {
  /** Salesforce record Id of the newly-created Lead__c row. */
  recordId: string;
  /** Raw response body (clipped) for audit. */
  rawBody: string;
}

/**
 * POST a JV submission to the Niche CRM. Throws `CrmApiError` on non-2xx.
 * Caller is responsible for deciding whether to retry or alert.
 */
export async function pushToCrm(
  payload: CrmPushPayload,
): Promise<CrmPushResult> {
  const url = endpointUrl();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const rawBody = await res.text().catch(() => "");
  if (!res.ok) {
    throw new CrmApiError(res.status, rawBody);
  }

  let parsed: CrmPushResponseShape | string | null = null;
  try {
    parsed = rawBody ? (JSON.parse(rawBody) as CrmPushResponseShape) : null;
  } catch {
    // The endpoint may return a bare string Id. Handle below.
  }

  const recordId = extractRecordId(parsed, rawBody);
  if (!recordId) {
    throw new CrmApiError(
      res.status,
      `2xx response but no record id in body: ${rawBody.slice(0, 300)}`,
    );
  }
  return { recordId, rawBody: rawBody.slice(0, 2000) };
}

function extractRecordId(
  parsed: CrmPushResponseShape | string | null,
  rawBody: string,
): string | null {
  if (!parsed) {
    // The body might be a bare quoted string, "a0JKS..."
    const trimmed = rawBody.trim().replace(/^"|"$/g, "");
    return /^a?\w{15,20}$/.test(trimmed) ? trimmed : null;
  }
  if (typeof parsed === "string") {
    return parsed.trim() || null;
  }
  if (typeof parsed.id === "string" && parsed.id) return parsed.id;
  if (typeof parsed.Id === "string" && parsed.Id) return parsed.Id;
  if (parsed.requestObject) {
    if (typeof parsed.requestObject.Id === "string" && parsed.requestObject.Id)
      return parsed.requestObject.Id;
    if (typeof parsed.requestObject.id === "string" && parsed.requestObject.id)
      return parsed.requestObject.id;
  }
  return null;
}
