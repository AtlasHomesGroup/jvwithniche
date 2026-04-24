import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  adminActions,
  adminSavedFilters,
  crmSyncQueue,
  submissions,
  submissionUpdates,
  type AdminAction,
  type AdminSavedFilter,
  type Submission,
  type SubmissionUpdate,
} from "@/db/schema";
import type { SubmissionStatus } from "./constants";

export { ALL_STATUSES, type SubmissionStatus } from "./constants";

export interface PipelineCounts {
  total: number;
  draft: number;
  awaiting_signature: number;
  crm_sync_pending: number;
  crm_synced: number;
  failed: number;
  /** Submissions flagged for attention (CRM sync failures, WhatsApp failures). */
  needsAttention: number;
}

/**
 * Returns counts per submission status, plus a "needs attention" count of
 * submissions with outstanding CRM push failures (rows enqueued in
 * crm_sync_queue with attempts > 0).
 */
export async function getPipelineCounts(): Promise<PipelineCounts> {
  const [byStatus, attention] = await Promise.all([
    db
      .select({
        status: submissions.status,
        count: count().as("count"),
      })
      .from(submissions)
      .groupBy(submissions.status),
    db
      .select({
        count: count().as("count"),
      })
      .from(crmSyncQueue)
      .where(sql`${crmSyncQueue.attempts} > 0`),
  ]);

  const base: PipelineCounts = {
    total: 0,
    draft: 0,
    awaiting_signature: 0,
    crm_sync_pending: 0,
    crm_synced: 0,
    failed: 0,
    needsAttention: attention[0]?.count ?? 0,
  };
  for (const row of byStatus) {
    base.total += row.count;
    base[row.status] += row.count;
  }
  return base;
}

export interface SubmissionListFilters {
  status?: SubmissionStatus;
  dealType?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface SubmissionListResult {
  rows: Submission[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Paginated submissions list with optional filters. Search matches
 * submitter email, submitter phone, or property street (case-insensitive).
 */
export async function listSubmissions(
  filters: SubmissionListFilters = {},
): Promise<SubmissionListResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
  const offset = (page - 1) * pageSize;

  const conditions = [];
  if (filters.status) {
    conditions.push(eq(submissions.status, filters.status));
  }
  if (filters.dealType && filters.dealType.trim()) {
    conditions.push(eq(submissions.dealType, filters.dealType.trim()));
  }
  if (filters.search && filters.search.trim()) {
    const q = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        ilike(submissions.submitterEmail, q),
        ilike(submissions.submitterPhoneE164, q),
        ilike(submissions.propertyStreet, q),
        ilike(submissions.propertyCity, q),
      )!,
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countRow] = await Promise.all([
    db
      .select()
      .from(submissions)
      .where(whereClause)
      .orderBy(desc(submissions.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: count().as("count") })
      .from(submissions)
      .where(whereClause),
  ]);

  return {
    rows,
    total: countRow[0]?.count ?? 0,
    page,
    pageSize,
  };
}

export interface SubmissionDetail {
  submission: Submission;
  updates: SubmissionUpdate[];
  queueRow: {
    attempts: number;
    lastAttemptAt: Date | null;
    nextAttemptAt: Date;
    lastError: string | null;
  } | null;
}

export async function getSubmissionDetail(
  id: string,
): Promise<SubmissionDetail | null> {
  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, id))
    .limit(1);
  if (!submission) return null;

  const [updates, queueRows] = await Promise.all([
    db
      .select()
      .from(submissionUpdates)
      .where(eq(submissionUpdates.submissionId, id))
      .orderBy(desc(submissionUpdates.createdAt)),
    db
      .select({
        attempts: crmSyncQueue.attempts,
        lastAttemptAt: crmSyncQueue.lastAttemptAt,
        nextAttemptAt: crmSyncQueue.nextAttemptAt,
        lastError: crmSyncQueue.lastError,
      })
      .from(crmSyncQueue)
      .where(eq(crmSyncQueue.submissionId, id))
      .limit(1),
  ]);

  return {
    submission,
    updates,
    queueRow: queueRows[0] ?? null,
  };
}

/** List recent submissions for the dashboard. */
export async function getRecentSubmissions(
  limit = 10,
): Promise<Submission[]> {
  return db
    .select()
    .from(submissions)
    .orderBy(desc(submissions.createdAt))
    .limit(limit);
}

export interface AuditListFilters {
  actionType?: string;
  adminEmail?: string;
  submissionId?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditListResult {
  rows: AdminAction[];
  total: number;
  page: number;
  pageSize: number;
}

/** Paginated list of admin audit actions, newest first. */
export async function listAdminActions(
  filters: AuditListFilters = {},
): Promise<AuditListResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 50));
  const offset = (page - 1) * pageSize;

  const conditions = [];
  if (filters.actionType && filters.actionType.trim()) {
    conditions.push(eq(adminActions.actionType, filters.actionType.trim()));
  }
  if (filters.adminEmail && filters.adminEmail.trim()) {
    conditions.push(eq(adminActions.adminEmail, filters.adminEmail.trim()));
  }
  if (filters.submissionId) {
    conditions.push(eq(adminActions.submissionId, filters.submissionId));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countRow] = await Promise.all([
    db
      .select()
      .from(adminActions)
      .where(whereClause)
      .orderBy(desc(adminActions.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: count().as("count") })
      .from(adminActions)
      .where(whereClause),
  ]);

  return {
    rows,
    total: countRow[0]?.count ?? 0,
    page,
    pageSize,
  };
}

/** Saved filter presets for one admin, newest first. */
export async function listSavedFiltersFor(
  adminId: string,
): Promise<AdminSavedFilter[]> {
  return db
    .select()
    .from(adminSavedFilters)
    .where(eq(adminSavedFilters.adminUserId, adminId))
    .orderBy(desc(adminSavedFilters.createdAt));
}

/** All audit rows for a single submission, newest first. */
export async function listAuditForSubmission(
  submissionId: string,
): Promise<AdminAction[]> {
  return db
    .select()
    .from(adminActions)
    .where(eq(adminActions.submissionId, submissionId))
    .orderBy(desc(adminActions.createdAt));
}

/** Submissions with outstanding CRM failures — for the dashboard alert rail. */
export async function getFlaggedSubmissions(
  limit = 10,
): Promise<Array<Submission & { queueAttempts: number; queueLastError: string | null }>> {
  const rows = await db
    .select({
      submission: submissions,
      attempts: crmSyncQueue.attempts,
      lastError: crmSyncQueue.lastError,
    })
    .from(crmSyncQueue)
    .innerJoin(submissions, eq(crmSyncQueue.submissionId, submissions.id))
    .where(sql`${crmSyncQueue.attempts} > 0`)
    .orderBy(desc(crmSyncQueue.lastAttemptAt))
    .limit(limit);
  return rows.map((r) => ({
    ...r.submission,
    queueAttempts: r.attempts,
    queueLastError: r.lastError,
  }));
}
