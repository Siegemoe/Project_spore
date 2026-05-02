"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "./auth";
import { headers } from "next/headers";

export interface AuditLogEntry {
  id: string;
  admin_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogEntryWithAdmin extends AuditLogEntry {
  admin: {
    id: string;
    role: string;
    user: {
      handle: string | null;
      display_name: string | null;
      avatar_url?: string | null;
    };
  };
}

export interface CreateAuditLogInput {
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, any>;
}

/**
 * Create an audit log entry for an admin action
 * Automatically captures admin ID, IP address, and user agent
 */
export async function createAuditLog(input: CreateAuditLogInput): Promise<void> {
  try {
    const adminUser = await getCurrentAdmin();

    if (!adminUser) {
      // eslint-disable-next-line no-console
      console.warn("Attempted to create audit log without admin context");
      return;
    }

    // Get request headers for IP and user agent
    const headersList = headers();
    const ip_address = headersList.get("x-forwarded-for") ||
                       headersList.get("x-real-ip") ||
                       null;
    const user_agent = headersList.get("user-agent") || null;

    await prisma.adminAuditLog.create({
      data: {
        adminId: adminUser.id,
        action: input.action,
        resourceType: input.resource_type,
        resourceId: input.resource_id || null,
        details: input.details,
        ipAddress: ip_address,
        userAgent: user_agent,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error creating audit log:", err);
  }
}

/**
 * Query audit logs with filters
 */
export interface QueryAuditLogsParams {
  admin_id?: string;
  action?: string;
  resource_type?: string;
  resource_id?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export async function queryAuditLogs(params: QueryAuditLogsParams = {}) {
  await getCurrentAdmin(); // Require admin access

  const where: any = {};
  if (params.admin_id) where.adminId = params.admin_id;
  if (params.action) where.action = params.action;
  if (params.resource_type) where.resourceType = params.resource_type;
  if (params.resource_id) where.resourceId = params.resource_id;
  if (params.start_date || params.end_date) {
    where.createdAt = {};
    if (params.start_date) where.createdAt.gte = new Date(params.start_date);
    if (params.end_date) where.createdAt.lte = new Date(params.end_date);
  }

  const limit = params.limit || 50;
  const offset = params.offset || 0;

  const [rows, count] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      include: {
        admin: {
          select: {
            id: true,
            role: true,
            user: {
              select: {
                handle: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    }),
    prisma.adminAuditLog.count({ where }),
  ]);

  const logs: AuditLogEntryWithAdmin[] = rows.map((row) => ({
    id: row.id,
    admin_id: row.adminId,
    action: row.action,
    resource_type: row.resourceType,
    resource_id: row.resourceId,
    details: row.details as Record<string, any> | null,
    ip_address: row.ipAddress,
    user_agent: row.userAgent,
    created_at: row.createdAt.toISOString(),
    admin: {
      id: row.admin.id,
      role: row.admin.role,
      user: {
        handle: row.admin.user.handle ?? null,
        display_name: row.admin.user.displayName ?? null,
        avatar_url: row.admin.user.avatarUrl ?? null,
      },
    },
  }));

  return {
    logs,
    total: count,
  };
}

/**
 * Get audit logs for a specific resource
 */
export async function getResourceAuditHistory(
  resource_type: string,
  resource_id: string
): Promise<AuditLogEntryWithAdmin[]> {
  await getCurrentAdmin(); // Require admin access

  const rows = await prisma.adminAuditLog.findMany({
    where: { resourceType: resource_type, resourceId: resource_id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      admin: {
        select: {
          id: true,
          role: true,
          user: {
            select: {
              handle: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    admin_id: row.adminId,
    action: row.action,
    resource_type: row.resourceType,
    resource_id: row.resourceId,
    details: row.details as Record<string, any> | null,
    ip_address: row.ipAddress,
    user_agent: row.userAgent,
    created_at: row.createdAt.toISOString(),
    admin: {
      id: row.admin.id,
      role: row.admin.role,
      user: {
        handle: row.admin.user.handle ?? null,
        display_name: row.admin.user.displayName ?? null,
        avatar_url: row.admin.user.avatarUrl ?? null,
      },
    },
  }));
}

/**
 * Get audit log statistics
 */
export async function getAuditLogStats(days: number = 30) {
  await getCurrentAdmin(); // Require admin access

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const rows = await prisma.adminAuditLog.findMany({
    where: { createdAt: { gte: startDate } },
    select: {
      action: true,
      resourceType: true,
      adminId: true,
      createdAt: true,
    },
  });

  // Calculate statistics
  const stats = {
    total_actions: rows.length,
    actions_by_type: {} as Record<string, number>,
    actions_by_resource: {} as Record<string, number>,
    actions_by_admin: {} as Record<string, number>,
    daily_counts: {} as Record<string, number>,
  };

  rows.forEach((log) => {
    // Count by action type
    stats.actions_by_type[log.action] = (stats.actions_by_type[log.action] || 0) + 1;

    // Count by resource type
    stats.actions_by_resource[log.resourceType] = (stats.actions_by_resource[log.resourceType] || 0) + 1;

    // Count by admin
    stats.actions_by_admin[log.adminId] = (stats.actions_by_admin[log.adminId] || 0) + 1;

    // Count by day
    const date = log.createdAt.toISOString().split("T")[0];
    stats.daily_counts[date] = (stats.daily_counts[date] || 0) + 1;
  });

  return stats;
}

/**
 * Export audit logs to CSV (for compliance)
 */
export async function exportAuditLogs(params: QueryAuditLogsParams = {}) {
  await getCurrentAdmin(); // Require admin access

  // Get all matching logs (no limit for export)
  const { logs } = await queryAuditLogs({ ...params, limit: 10000 });

  // Convert to CSV format
  const headers = [
    "Timestamp",
    "Admin ID",
    "Admin Handle",
    "Action",
    "Resource Type",
    "Resource ID",
    "IP Address",
    "Details"
  ];

  const rows = logs.map((log: any) => [
    log.created_at,
    log.admin_id,
    log.admin?.user?.handle || "N/A",
    log.action,
    log.resource_type,
    log.resource_id || "",
    log.ip_address || "",
    JSON.stringify(log.details || {})
  ]);

  const csv = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
  ].join("\n");

  return csv;
}

/**
 * Convenience functions for common audit actions
 */

export async function auditUserAction(action: string, userId: string, details?: Record<string, any>) {
  await createAuditLog({
    action,
    resource_type: "user",
    resource_id: userId,
    details,
  });
}

export async function auditPostAction(action: string, postId: string, details?: Record<string, any>) {
  await createAuditLog({
    action,
    resource_type: "post",
    resource_id: postId,
    details,
  });
}

export async function auditCommentAction(action: string, commentId: string, details?: Record<string, any>) {
  await createAuditLog({
    action,
    resource_type: "comment",
    resource_id: commentId,
    details,
  });
}

export async function auditSystemAction(action: string, details?: Record<string, any>) {
  await createAuditLog({
    action,
    resource_type: "system",
    details,
  });
}
