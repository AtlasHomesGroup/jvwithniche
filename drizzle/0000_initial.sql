CREATE TYPE "public"."esign_provider" AS ENUM('pandadoc', 'jotform');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('draft', 'awaiting_signature', 'crm_sync_pending', 'crm_synced', 'failed');--> statement-breakpoint
CREATE TYPE "public"."update_type" AS ENUM('attachment', 'note');--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	"disabled" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_sync_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid,
	"update_id" uuid,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submission_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"update_type" "update_type" NOT NULL,
	"payload" jsonb NOT NULL,
	"crm_synced" boolean DEFAULT false NOT NULL,
	"crm_sync_attempts" integer DEFAULT 0 NOT NULL,
	"last_sync_error" text
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "submission_status" DEFAULT 'draft' NOT NULL,
	"form_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"submitter_email" text,
	"submitter_phone_e164" text,
	"property_street" text,
	"property_city" text,
	"property_state" text,
	"deal_type" text,
	"esign_provider" "esign_provider",
	"esign_document_id" text,
	"signed_pdf_url" text,
	"signed_at" timestamp with time zone,
	"stalled_alert_sent_at" timestamp with time zone,
	"crm_opportunity_id" text,
	"crm_synced_at" timestamp with time zone,
	"whatsapp_group_created" boolean DEFAULT false NOT NULL,
	"whatsapp_group_id" text,
	"whatsapp_group_invite_link" text,
	"return_link_token" text NOT NULL,
	"draft_session_token" text,
	"submitter_ip" text,
	"submitter_user_agent" text
);
--> statement-breakpoint
ALTER TABLE "crm_sync_queue" ADD CONSTRAINT "crm_sync_queue_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_sync_queue" ADD CONSTRAINT "crm_sync_queue_update_id_submission_updates_id_fk" FOREIGN KEY ("update_id") REFERENCES "public"."submission_updates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_updates" ADD CONSTRAINT "submission_updates_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_email_idx" ON "admin_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "crm_sync_queue_next_attempt_idx" ON "crm_sync_queue" USING btree ("next_attempt_at");--> statement-breakpoint
CREATE INDEX "crm_sync_queue_submission_idx" ON "crm_sync_queue" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "submission_updates_submission_idx" ON "submission_updates" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "submission_updates_unsynced_idx" ON "submission_updates" USING btree ("crm_synced");--> statement-breakpoint
CREATE UNIQUE INDEX "submissions_return_link_token_idx" ON "submissions" USING btree ("return_link_token");--> statement-breakpoint
CREATE UNIQUE INDEX "submissions_draft_session_token_idx" ON "submissions" USING btree ("draft_session_token");--> statement-breakpoint
CREATE INDEX "submissions_status_idx" ON "submissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "submissions_submitter_email_idx" ON "submissions" USING btree ("submitter_email");--> statement-breakpoint
CREATE INDEX "submissions_last_activity_idx" ON "submissions" USING btree ("last_activity_at");