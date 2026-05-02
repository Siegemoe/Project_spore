"use server";

import { prisma } from "@/lib/prisma";
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

  const row = await prisma.contentReport.create({
    data: {
      reporterId: userId,
      contentType: input.content_type,
      contentId: input.content_id,
      reason: input.reason,
      details: input.details,
    },
  });

  return {
    id: row.id,
    reporter_id: row.reporterId,
    content_type: row.contentType,
    content_id: row.contentId,
    reason: row.reason,
    details: row.details,
    status: row.status,
    severity: row.severity,
    reviewed_by: row.reviewedBy,
    reviewed_at: row.reviewedAt?.toISOString() ?? null,
    resolution: row.resolution,
    resolution_action: row.resolutionAction,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  } as ContentReport;
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

  const where: any = {};
  if (params.status) where.status = params.status;
  if (params.content_type) where.contentType = params.content_type;
  if (params.severity) where.severity = params.severity;

  const limit = params.limit || 50;
  const offset = params.offset || 0;

  const [rows, count] = await Promise.all([
    prisma.contentReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      include: {
        reporter: {
          select: { id: true, handle: true, displayName: true, avatarUrl: true },
        },
        reviewer: {
          select: {
            id: true,
            role: true,
            user: { select: { handle: true, displayName: true } },
          },
        },
      },
    }),
    prisma.contentReport.count({ where }),
  ]);

  return {
    reports: rows.map((row) => ({
      id: row.id,
      reporter_id: row.reporterId,
      content_type: row.contentType,
      content_id: row.contentId,
      reason: row.reason,
      details: row.details,
      status: row.status,
      severity: row.severity,
      reviewed_by: row.reviewedBy,
      reviewed_at: row.reviewedAt?.toISOString() ?? null,
      resolution: row.resolution,
      resolution_action: row.resolutionAction,
      created_at: row.createdAt.toISOString(),
      updated_at: row.updatedAt.toISOString(),
      reporter: {
        id: row.reporter.id,
        handle: row.reporter.handle,
        display_name: row.reporter.displayName,
        avatar_url: row.reporter.avatarUrl,
      },
      reviewer: row.reviewer
        ? {
            id: row.reviewer.id,
            role: row.reviewer.role,
            user: row.reviewer.user
              ? {
                  handle: row.reviewer.user.handle,
                  display_name: row.reviewer.user.displayName,
                }
              : undefined,
          }
        : undefined,
    })),
    total: count,
  };
}

/**
 * Get a single report with full details
 */
export async function getReport(reportId: string) {
  await requireAdminRole("moderator");

  const row = await prisma.contentReport.findUnique({
    where: { id: reportId },
    include: {
      reporter: {
        select: { id: true, handle: true, displayName: true, avatarUrl: true, email: true },
      },
      reviewer: {
        select: {
          id: true,
          role: true,
          user: { select: { handle: true, displayName: true } },
        },
      },
    },
  });

  if (!row) {
    throw new Error("Report not found");
  }

  return row;
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

  const updateData: any = {
    status,
    reviewedBy: adminUser.id,
    reviewedAt: new Date(),
  };

  if (resolution) {
    updateData.resolution = resolution;
  }

  const row = await prisma.contentReport.update({
    where: { id: reportId },
    data: updateData,
  });

  // Audit log
  await createAuditLog({
    action: "report_status_updated",
    resource_type: "content_report",
    resource_id: reportId,
    details: { status, resolution },
  });

  return row;
}

/**
 * Remove content (post or comment)
 * Uses Prisma transaction to ensure consistency across all DB operations
 */
export async function removeContent(
  reportId: string,
  contentType: "post" | "comment",
  contentId: string,
  reason: string
) {
  const adminUser = await requireAdminRole("moderator");

  await prisma.$transaction(async (tx) => {
    // Delete content
    if (contentType === "post") {
      await tx.post.delete({ where: { id: contentId } });
    } else {
      await tx.comment.delete({ where: { id: contentId } });
    }

    // Record moderation action
    await tx.moderationAction.create({
      data: {
        adminId: adminUser.id,
        actionType: "content_removed",
        targetType: contentType,
        targetId: contentId,
        reason,
        reportId,
      },
    });

    // Update report
    await tx.contentReport.update({
      where: { id: reportId },
      data: {
        status: "resolved",
        resolutionAction: "content_removed",
        resolution: reason,
        reviewedBy: adminUser.id,
        reviewedAt: new Date(),
      },
    });
  });

  // Audit log (outside transaction since it's best-effort)
  await createAuditLog({
    action: "content_removed",
    resource_type: contentType,
    resource_id: contentId,
    details: { reason, report_id: reportId },
  });

  return { success: true };
}

/**
 * Warn a user
 * Uses Prisma transaction to prevent race conditions when multiple warnings occur concurrently
 */
export async function warnUser(
  reportId: string,
  userId: string,
  reason: string
) {
  const adminUser = await requireAdminRole("moderator");

  const result = await prisma.$transaction(async (tx) => {
    // Upsert moderation status and increment warning count
    const modStatus = await tx.userModerationStatus.upsert({
      where: { userId },
      update: {
        warningCount: { increment: 1 },
        lastWarningAt: new Date(),
      },
      create: {
        userId,
        warningCount: 1,
        lastWarningAt: new Date(),
      },
    });

    // Record moderation action
    await tx.moderationAction.create({
      data: {
        adminId: adminUser.id,
        actionType: "user_warned",
        targetType: "user",
        targetId: userId,
        reason,
        reportId,
      },
    });

    // Update report
    await tx.contentReport.update({
      where: { id: reportId },
      data: {
        status: "resolved",
        resolutionAction: "warning_sent",
        resolution: reason,
        reviewedBy: adminUser.id,
        reviewedAt: new Date(),
      },
    });

    return { warning_count: modStatus.warningCount };
  });

  // Audit log
  await createAuditLog({
    action: "user_warned",
    resource_type: "user",
    resource_id: userId,
    details: { reason, report_id: reportId },
  });

  return { success: true, warning_count: result.warning_count };
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

  const suspensionEnds = new Date();
  suspensionEnds.setDate(suspensionEnds.getDate() + durationDays);

  await prisma.$transaction(async (tx) => {
    // Update or create moderation status
    await tx.userModerationStatus.upsert({
      where: { userId },
      update: {
        isSuspended: true,
        suspensionEndsAt: suspensionEnds,
        suspendedBy: adminUser.id,
        suspendedAt: new Date(),
        suspensionReason: reason,
      },
      create: {
        userId,
        isSuspended: true,
        suspensionEndsAt: suspensionEnds,
        suspendedBy: adminUser.id,
        suspendedAt: new Date(),
        suspensionReason: reason,
        warningCount: 0,
      },
    });

    // Record moderation action
    await tx.moderationAction.create({
      data: {
        adminId: adminUser.id,
        actionType: "user_suspended",
        targetType: "user",
        targetId: userId,
        reason,
        durationDays,
        reportId,
      },
    });

    // Update report
    await tx.contentReport.update({
      where: { id: reportId },
      data: {
        status: "resolved",
        resolutionAction: "user_suspended",
        resolution: `${reason} (${durationDays} days)`,
        reviewedBy: adminUser.id,
        reviewedAt: new Date(),
      },
    });
  });

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

  await prisma.$transaction(async (tx) => {
    // Update or create moderation status
    await tx.userModerationStatus.upsert({
      where: { userId },
      update: {
        isBanned: true,
        bannedBy: adminUser.id,
        bannedAt: new Date(),
        banReason: reason,
      },
      create: {
        userId,
        isBanned: true,
        bannedBy: adminUser.id,
        bannedAt: new Date(),
        banReason: reason,
        warningCount: 0,
      },
    });

    // Record moderation action
    await tx.moderationAction.create({
      data: {
        adminId: adminUser.id,
        actionType: "user_banned",
        targetType: "user",
        targetId: userId,
        reason,
        reportId,
      },
    });

    // Update report
    await tx.contentReport.update({
      where: { id: reportId },
      data: {
        status: "resolved",
        resolutionAction: "user_banned",
        resolution: reason,
        reviewedBy: adminUser.id,
        reviewedAt: new Date(),
      },
    });
  });

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

  const row = await prisma.contentReport.update({
    where: { id: reportId },
    data: {
      status: "dismissed",
      resolutionAction: "no_action",
      resolution: reason,
      reviewedBy: adminUser.id,
      reviewedAt: new Date(),
    },
  });

  // Record moderation action
  await prisma.moderationAction.create({
    data: {
      adminId: adminUser.id,
      actionType: "report_dismissed",
      targetType: "report",
      targetId: reportId,
      reason,
      reportId: null,
    },
  });

  // Audit log
  await createAuditLog({
    action: "report_dismissed",
    resource_type: "content_report",
    resource_id: reportId,
    details: { reason },
  });

  return row;
}

/**
 * Get report statistics for dashboard
 */
export async function getReportStats() {
  await requireAdminRole("moderator");

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    total,
    pending,
    reviewing,
    resolved,
    dismissed,
    escalated,
    resolvedToday,
    byReason,
    bySeverity,
    byContentType,
    resolvedWithTime,
  ] = await Promise.all([
    prisma.contentReport.count(),
    prisma.contentReport.count({ where: { status: "pending" } }),
    prisma.contentReport.count({ where: { status: "reviewing" } }),
    prisma.contentReport.count({ where: { status: "resolved" } }),
    prisma.contentReport.count({ where: { status: "dismissed" } }),
    prisma.contentReport.count({ where: { status: "escalated" } }),
    prisma.contentReport.count({
      where: { status: "resolved", reviewedAt: { gte: todayStart } },
    }),
    prisma.contentReport.groupBy({ by: ["reason"], _count: { reason: true } }),
    prisma.contentReport.groupBy({ by: ["severity"], _count: { severity: true } }),
    prisma.contentReport.groupBy({ by: ["contentType"], _count: { contentType: true } }),
    prisma.contentReport.findMany({
      where: { status: "resolved", reviewedAt: { not: null } },
      select: { createdAt: true, reviewedAt: true },
    }),
  ]);

  // Calculate avg resolution time in hours
  let avg_resolution_time_hours: number | null = null;
  if (resolvedWithTime.length > 0) {
    const totalHours = resolvedWithTime.reduce((acc, r) => {
      const created = new Date(r.createdAt).getTime();
      const reviewed = new Date(r.reviewedAt!).getTime();
      return acc + (reviewed - created) / (1000 * 60 * 60);
    }, 0);
    avg_resolution_time_hours = totalHours / resolvedWithTime.length;
  }

  return {
    total,
    total_pending: pending,
    total_reviewing: reviewing,
    total_resolved_today: resolvedToday,
    avg_resolution_time_hours,
    pending,
    reviewing,
    resolved,
    dismissed,
    escalated,
    by_reason: Object.fromEntries(byReason.map((r) => [r.reason, r._count.reason])),
    by_severity: Object.fromEntries(bySeverity.map((s) => [s.severity ?? "unspecified", s._count.severity])),
    by_content_type: Object.fromEntries(byContentType.map((c) => [c.contentType, c._count.contentType])),
  };
}

/**
 * Bulk action: Update multiple reports
 */
export async function bulkUpdateReports(
  reportIds: string[],
  action: "dismiss" | "escalate",
  reason: string
) {
  const adminUser = await requireAdminRole("moderator");

  const status = action === "dismiss" ? "dismissed" : "escalated";
  const resolutionAction: ResolutionAction = action === "dismiss" ? "no_action" : "escalated_to_legal";

  const result = await prisma.contentReport.updateMany({
    where: { id: { in: reportIds } },
    data: {
      status,
      resolution: reason,
      resolutionAction,
      reviewedBy: adminUser.id,
      reviewedAt: new Date(),
    },
  });

  // Audit log
  await createAuditLog({
    action: "bulk_report_update",
    resource_type: "content_report",
    resource_id: reportIds.join(","),
    details: { action, reason, count: reportIds.length },
  });

  return { updated: result.count };
}
