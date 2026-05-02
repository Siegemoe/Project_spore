"use server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { auth } from "@/auth";
import { requireAdminRole, getCurrentAdmin } from "@/lib/admin/auth";
import { createAuditLog } from "@/lib/admin/audit";

/**
 * Content report types and statuses
 */
export type ReportReason = 
  | "spam"
  | "harassment"
  | "hate_speech"
  | "violence"
  | "sexual_content"
  | "misinformation"
  | "copyright"
  | "impersonation"
  | "self_harm"
  | "other";

export type ReportStatus = "pending" | "reviewing" | "resolved" | "dismissed" | "escalated";
export type ReportSeverity = "low" | "medium" | "high" | "critical";
/**
 * Content types for reporting:
 * - "post": A post/media content
 * - "comment": A comment on a post
 * - "profile": Profile content (bio, avatar, profile information)
 * - "user": User account itself (for account-level issues like impersonation, bot behavior)
 */
export type ContentType = "post" | "comment" | "profile" | "user";

export type ResolutionAction =
  | "no_action"
  | "warning_sent"
  | "content_removed"
  | "user_suspended"
  | "user_banned"
  | "escalated_to_legal";

export interface ContentReport {
  id: string;
  reporter_id: string;
  content_type: ContentType;
  content_id: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  severity: ReportSeverity | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  resolution: string | null;
  resolution_action: ResolutionAction | null;
  created_at: string;
  updated_at: string;
}

/**
 * Create a new content report
 */
export async function createReport(input: {
  content_type: ContentType;
  content_id: string;
  reason: ReportReason;
  details?: string;
}) {
  // Get reporter's user ID from Auth.js
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error("Must be authenticated to report content");
  }
  const userId = session.user.id;

  // Use admin client for database insert
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("content_reports")
    .insert({
      reporter_id: userId,
      content_type: input.content_type,
      content_id: input.content_id,
      reason: input.reason,
      details: input.details || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create report: ${error.message}`);
  }

  return data as ContentReport;
}

/**
 * List content reports with filtering and pagination
 */
export async function listReports(params: {
  status?: ReportStatus;
  content_type?: ContentType;
  severity?: ReportSeverity;
  limit?: number;
  offset?: number;
} = {}) {
  await requireAdminRole("moderator");
  
  const admin = getSupabaseAdmin();
  
  let query = admin
    .from("content_reports")
    .select(`
      *,
      reporter:users!content_reports_reporter_id_fkey(id, handle, display_name, avatar_url),
      reviewer:admins!content_reports_reviewed_by_fkey(
        id,
        role,
        user:users!admins_user_id_fkey(handle, display_name)
      )
    `, { count: "exact" })
    .order("created_at", { ascending: false });

  // Apply filters
  if (params.status) {
    query = query.eq("status", params.status);
  }
  
  if (params.content_type) {
    query = query.eq("content_type", params.content_type);
  }
  
  if (params.severity) {
    query = query.eq("severity", params.severity);
  }

  // Pagination
  const limit = params.limit || 50;
  const offset = params.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list reports: ${error.message}`);
  }

  return {
    reports: data as any[],
    total: count || 0,
  };
}

/**
 * Get a single report with full details
 */
export async function getReport(reportId: string) {
  await requireAdminRole("moderator");
  
  const admin = getSupabaseAdmin();
  
  const { data, error } = await admin
    .from("content_reports")
    .select(`
      *,
      reporter:users!content_reports_reporter_id_fkey(id, handle, display_name, avatar_url, email),
      reviewer:admins!content_reports_reviewed_by_fkey(
        id,
        role,
        user:users!admins_user_id_fkey(handle, display_name)
      )
    `)
    .eq("id", reportId)
    .single();

  if (error) {
    throw new Error(`Failed to get report: ${error.message}`);
  }

  return data;
}

/**
 * Update report status
 */
export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  resolution?: string
) {
  const adminUser = await requireAdminRole("moderator");
  const admin = getSupabaseAdmin();

  const updateData: any = {
    status,
    reviewed_by: adminUser.id,
    reviewed_at: new Date().toISOString(),
  };

  if (resolution) {
    updateData.resolution = resolution;
  }

  const { data, error } = await admin
    .from("content_reports")
    .update(updateData)
    .eq("id", reportId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update report: ${error.message}`);
  }

  // Audit log
  await createAuditLog({
    action: "report_status_updated",
    resource_type: "content_report",
    resource_id: reportId,
    details: { status, resolution },
  });

  return data;
}

/**
 * Remove content (post or comment)
 * Uses atomic transaction to ensure consistency across all DB operations
 */
export async function removeContent(
  reportId: string,
  contentType: "post" | "comment",
  contentId: string,
  reason: string
) {
  const adminUser = await requireAdminRole("moderator");
  const admin = getSupabaseAdmin();

  // Execute atomic transaction via stored procedure
  // This performs: delete content, insert moderation_action, update content_report, and create audit_log
  const { data, error } = await admin.rpc('remove_content_transaction', {
    p_content_type: contentType,
    p_content_id: contentId,
    p_admin_id: adminUser.id,
    p_report_id: reportId,
    p_reason: reason
  });

  if (error) {
    // RPC errors include detailed context from the stored procedure
    throw new Error(`Failed to remove content atomically: ${error.message}`);
  }

  // Verify we got a success response
  if (!data || !data.success) {
    throw new Error('Content removal transaction did not complete successfully');
  }

  return { success: true };
}

/**
 * Warn a user
 * Uses atomic transaction to prevent race conditions when multiple warnings occur concurrently
 */
export async function warnUser(
  reportId: string,
  userId: string,
  reason: string
) {
  const adminUser = await requireAdminRole("moderator");
  const admin = getSupabaseAdmin();

  // Execute atomic transaction via stored procedure
  // This performs: increment warning count, insert moderation_action, update content_report, and create audit_log
  const { data, error } = await admin.rpc('warn_user_transaction', {
    p_user_id: userId,
    p_admin_id: adminUser.id,
    p_report_id: reportId,
    p_reason: reason
  });

  if (error) {
    // RPC errors include detailed context from the stored procedure
    throw new Error(`Failed to warn user atomically: ${error.message}`);
  }

  // Verify we got a success response
  if (!data || !data.success) {
    throw new Error('User warning transaction did not complete successfully');
  }

  return { success: true, warning_count: data.warning_count };
}

/**
 * Suspend a user
 */
export async function suspendUser(
  reportId: string,
  userId: string,
  reason: string,
  durationDays: number
) {
  const adminUser = await requireAdminRole("moderator");
  const admin = getSupabaseAdmin();

  const suspensionEnds = new Date();
  suspensionEnds.setDate(suspensionEnds.getDate() + durationDays);

  const { error } = await admin
    .from("user_moderation_status")
    .upsert({
      user_id: userId,
      is_suspended: true,
      suspension_ends_at: suspensionEnds.toISOString(),
      suspended_by: adminUser.id,
      suspended_at: new Date().toISOString(),
      suspension_reason: reason,
      // Preserve warning_count on conflict, or initialize to 0
      warning_count: 0,
    })
    .select();

  if (error) {
    throw new Error(`Failed to suspend user: ${error.message}`);
  }
  // Record moderation action
  await admin
    .from("moderation_actions")
    .insert({
      admin_id: adminUser.id,
      action_type: "user_suspended",
      target_type: "user",
      target_id: userId,
      reason,
      duration_days: durationDays,
      report_id: reportId,
    });

  // Update report
  await admin
    .from("content_reports")
    .update({
      status: "resolved",
      resolution_action: "user_suspended",
      resolution: `${reason} (${durationDays} days)`,
      reviewed_by: adminUser.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  // Audit log
  await createAuditLog({
    action: "user_suspended",
    resource_type: "user",
    resource_id: userId,
    details: { reason, duration_days: durationDays, report_id: reportId },
  });

  return { success: true };
}

/**
 * Ban a user permanently
 */
export async function banUser(
  reportId: string,
  userId: string,
  reason: string
) {
  const adminUser = await requireAdminRole("moderator");
  const admin = getSupabaseAdmin();

  // Use atomic upsert to prevent race conditions under concurrent ban requests
  const { error: upsertError } = await admin
    .from("user_moderation_status")
    .upsert({
      user_id: userId,
      is_banned: true,
      banned_by: adminUser.id,
      banned_at: new Date().toISOString(),
      ban_reason: reason,
      warning_count: 0,
    }, { onConflict: 'user_id' })
    .select();

  if (upsertError) {
    throw new Error(`Failed to ban user: ${upsertError.message}`);
  }

  // Record moderation action
  await admin
    .from("moderation_actions")
    .insert({
      admin_id: adminUser.id,
      action_type: "user_banned",
      target_type: "user",
      target_id: userId,
      reason,
      report_id: reportId,
    });

  // Update report
  await admin
    .from("content_reports")
    .update({
      status: "resolved",
      resolution_action: "user_banned",
      resolution: reason,
      reviewed_by: adminUser.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  // Audit log
  await createAuditLog({
    action: "user_banned",
    resource_type: "user",
    resource_id: userId,
    details: { reason, report_id: reportId },
  });

  return { success: true };
}

/**
 * Dismiss a report with no action
 */
export async function dismissReport(
  reportId: string,
  reason: string
) {
  const adminUser = await requireAdminRole("moderator");
  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from("content_reports")
    .update({
      status: "dismissed",
      resolution_action: "no_action",
      resolution: reason,
      reviewed_by: adminUser.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", reportId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to dismiss report: ${error.message}`);
  }

  // Record moderation action
  // Note: report_id is only used to reference the originating report when the target 
  // is something else (e.g., user, post, comment). When the target is the report itself,
  // report_id should be null to avoid redundancy with target_id.
  await admin
    .from("moderation_actions")
    .insert({
      admin_id: adminUser.id,
      action_type: "report_dismissed",
      target_type: "report",
      target_id: reportId,
      reason,
      report_id: null, // Set to null since target is the report itself
    });

  // Audit log
  await createAuditLog({
    action: "report_dismissed",
    resource_type: "content_report",
    resource_id: reportId,
    details: { reason },
  });

  return data;
}

/**
 * Get report statistics for dashboard
 */
export async function getReportStats() {
  await requireAdminRole("moderator");
  
  const admin = getSupabaseAdmin();
  
  const { data, error } = await admin.rpc("get_report_stats");

  if (error) {
    throw new Error(`Failed to get report stats: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error("No report statistics available");
  }
  
  return data[0];}

/**
 * Bulk action: Update multiple reports
 */
export async function bulkUpdateReports(
  reportIds: string[],
  action: "dismiss" | "escalate",
  reason: string
) {
  const adminUser = await requireAdminRole("moderator");
  const admin = getSupabaseAdmin();

  const status = action === "dismiss" ? "dismissed" : "escalated";
  const resolutionAction: ResolutionAction = action === "dismiss" ? "no_action" : "escalated_to_legal";

  const { data, error } = await admin
    .from("content_reports")
    .update({
      status,
      resolution: reason,
      resolution_action: resolutionAction,
      reviewed_by: adminUser.id,
      reviewed_at: new Date().toISOString(),
    })
    .in("id", reportIds)
    .select();

  if (error) {
    throw new Error(`Failed to bulk update reports: ${error.message}`);
  }

  // Audit log
  await createAuditLog({
    action: "bulk_report_update",
    resource_type: "content_report",
    resource_id: reportIds.join(","),
    details: { action, reason, count: reportIds.length },
  });

  return { updated: data.length };
}
