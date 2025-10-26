"use server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
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

    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from("admin_audit_log")
      .insert({
        admin_id: adminUser.id,
        action: input.action,
        resource_type: input.resource_type,
        resource_id: input.resource_id || null,
        details: input.details || null,
        ip_address,
        user_agent,
      });

    if (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to create audit log:", error);
    }
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
  
  const admin = getSupabaseAdmin();
  
  let query = admin
    .from("admin_audit_log")
    .select(`
      *,
      admin:admins!admin_audit_log_admin_id_fkey(
        id,
        role,
        user:users!admins_user_id_fkey(handle, display_name, avatar_url)
      )
    `, { count: "exact" })
    .order("created_at", { ascending: false });

  // Apply filters
  if (params.admin_id) {
    query = query.eq("admin_id", params.admin_id);
  }
  
  if (params.action) {
    query = query.eq("action", params.action);
  }
  
  if (params.resource_type) {
    query = query.eq("resource_type", params.resource_type);
  }
  
  if (params.resource_id) {
    query = query.eq("resource_id", params.resource_id);
  }
  
  if (params.start_date) {
    query = query.gte("created_at", params.start_date);
  }
  
  if (params.end_date) {
    query = query.lte("created_at", params.end_date);
  }
  
  // Pagination
  const limit = params.limit || 50;
  const offset = params.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to query audit logs: ${error.message}`);
  }

  return {
    logs: data as AuditLogEntryWithAdmin[],
    total: count || 0,
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
  
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("admin_audit_log")
    .select(`
      *,
      admin:admins!admin_audit_log_admin_id_fkey(
        id,
        role,
        user:users!admins_user_id_fkey(handle, display_name, avatar_url)
      )
    `)
    .eq("resource_type", resource_type)
    .eq("resource_id", resource_id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(`Failed to get resource audit history: ${error.message}`);
  }

  return data as AuditLogEntryWithAdmin[];
}

/**
 * Get audit log statistics
 */
export async function getAuditLogStats(days: number = 30) {
  await getCurrentAdmin(); // Require admin access
  
  const admin = getSupabaseAdmin();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await admin
    .from("admin_audit_log")
    .select("action, resource_type, admin_id, created_at")
    .gte("created_at", startDate.toISOString());

  if (error) {
    throw new Error(`Failed to get audit log stats: ${error.message}`);
  }

  // Calculate statistics
  const stats = {
    total_actions: data.length,
    actions_by_type: {} as Record<string, number>,
    actions_by_resource: {} as Record<string, number>,
    actions_by_admin: {} as Record<string, number>,
    daily_counts: {} as Record<string, number>,
  };

  data.forEach((log: any) => {
    // Count by action type
    stats.actions_by_type[log.action] = (stats.actions_by_type[log.action] || 0) + 1;
    
    // Count by resource type
    stats.actions_by_resource[log.resource_type] = (stats.actions_by_resource[log.resource_type] || 0) + 1;
    
    // Count by admin
    stats.actions_by_admin[log.admin_id] = (stats.actions_by_admin[log.admin_id] || 0) + 1;
    
    // Count by day
    const date = new Date(log.created_at).toISOString().split("T")[0];
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
