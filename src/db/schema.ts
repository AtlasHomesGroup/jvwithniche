import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const submissionStatusEnum = pgEnum("submission_status", [
  "draft",
  "awaiting_signature",
  "crm_sync_pending",
  "crm_synced",
  "failed",
]);

export const updateTypeEnum = pgEnum("update_type", ["attachment", "note"]);

export const esignProviderEnum = pgEnum("esign_provider", [
  "pandadoc",
  "jotform",
]);

export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    status: submissionStatusEnum("status").default("draft").notNull(),

    // full form state — structured per form sections in the spec
    formData: jsonb("form_data").notNull().default(sql`'{}'::jsonb`),

    // denormalized for fast lookup + dev alerts
    submitterEmail: text("submitter_email"),
    submitterPhoneE164: text("submitter_phone_e164"),
    propertyStreet: text("property_street"),
    propertyCity: text("property_city"),
    propertyState: text("property_state"),
    dealType: text("deal_type"),

    // e-signature
    esignProvider: esignProviderEnum("esign_provider"),
    esignDocumentId: text("esign_document_id"),
    signedPdfUrl: text("signed_pdf_url"),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    stalledAlertSentAt: timestamp("stalled_alert_sent_at", {
      withTimezone: true,
    }),

    // CRM
    crmOpportunityId: text("crm_opportunity_id"),
    crmSyncedAt: timestamp("crm_synced_at", { withTimezone: true }),

    // WhatsApp
    whatsappGroupCreated: boolean("whatsapp_group_created")
      .default(false)
      .notNull(),
    whatsappGroupId: text("whatsapp_group_id"),
    whatsappGroupInviteLink: text("whatsapp_group_invite_link"),

    // unique return link
    returnLinkToken: text("return_link_token").notNull(),

    // draft session cookie link — only for resumable drafts, not the public return link
    draftSessionToken: text("draft_session_token"),

    // audit
    submitterIp: text("submitter_ip"),
    submitterUserAgent: text("submitter_user_agent"),
  },
  (t) => [
    uniqueIndex("submissions_return_link_token_idx").on(t.returnLinkToken),
    uniqueIndex("submissions_draft_session_token_idx").on(t.draftSessionToken),
    index("submissions_status_idx").on(t.status),
    index("submissions_submitter_email_idx").on(t.submitterEmail),
    index("submissions_last_activity_idx").on(t.lastActivityAt),
  ],
);

export const submissionUpdates = pgTable(
  "submission_updates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updateType: updateTypeEnum("update_type").notNull(),
    // payload — for attachment: { url, filename, caption, size, mimeType }; for note: { text }
    payload: jsonb("payload").notNull(),
    crmSynced: boolean("crm_synced").default(false).notNull(),
    crmSyncAttempts: integer("crm_sync_attempts").default(0).notNull(),
    lastSyncError: text("last_sync_error"),
  },
  (t) => [
    index("submission_updates_submission_idx").on(t.submissionId),
    index("submission_updates_unsynced_idx").on(t.crmSynced),
  ],
);

export const crmSyncQueue = pgTable(
  "crm_sync_queue",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    submissionId: uuid("submission_id").references(() => submissions.id, {
      onDelete: "cascade",
    }),
    updateId: uuid("update_id").references(() => submissionUpdates.id, {
      onDelete: "cascade",
    }),
    attempts: integer("attempts").default(0).notNull(),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("crm_sync_queue_next_attempt_idx").on(t.nextAttemptAt),
    index("crm_sync_queue_submission_idx").on(t.submissionId),
  ],
);

export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    disabled: boolean("disabled").default(false).notNull(),
  },
  (t) => [uniqueIndex("admin_users_email_idx").on(t.email)],
);

export const adminActions = pgTable(
  "admin_actions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Nullable so deleting an admin user preserves the audit trail.
    adminUserId: uuid("admin_user_id").references(() => adminUsers.id, {
      onDelete: "set null",
    }),
    // Denormalized email — survives admin-row deletion.
    adminEmail: text("admin_email").notNull(),
    // Nullable so deleting a submission preserves the audit trail.
    submissionId: uuid("submission_id").references(() => submissions.id, {
      onDelete: "set null",
    }),
    // Free-text so new action types don't require a migration.
    actionType: text("action_type").notNull(),
    details: jsonb("details").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("admin_actions_created_idx").on(t.createdAt),
    index("admin_actions_submission_idx").on(t.submissionId),
    index("admin_actions_admin_idx").on(t.adminUserId),
  ],
);

export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
export type SubmissionUpdate = typeof submissionUpdates.$inferSelect;
export type NewSubmissionUpdate = typeof submissionUpdates.$inferInsert;
export type CrmSyncQueueItem = typeof crmSyncQueue.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type AdminAction = typeof adminActions.$inferSelect;
export type NewAdminAction = typeof adminActions.$inferInsert;
