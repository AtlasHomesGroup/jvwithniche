import { db } from "@/db/client";
import {
  adminActions,
  type AdminAction,
  type AdminUser,
} from "@/db/schema";

export type AdminActionType =
  | "retry_crm"
  | "retry_whatsapp_group"
  | "resend_signing_email"
  | "delete_submission"
  | "login"
  | "logout";

export async function logAdminAction(input: {
  admin: AdminUser;
  actionType: AdminActionType;
  submissionId?: string | null;
  details?: Record<string, unknown>;
}): Promise<AdminAction> {
  const [row] = await db
    .insert(adminActions)
    .values({
      adminUserId: input.admin.id,
      adminEmail: input.admin.email,
      submissionId: input.submissionId ?? null,
      actionType: input.actionType,
      details: input.details ?? {},
    })
    .returning();
  return row;
}
