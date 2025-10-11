"use server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminRole } from "@/lib/admin/auth";
import { createAuditLog } from "@/lib/admin/audit";
import { headers } from "next/headers";

export type SecurityEventType = 
  | "failed_login"
  | "rate_limit_exceeded"
  | "suspicious_activity"
  | "csrf_failure"
  | "invalid_token"
  | "account_takeover_attempt"
  | "mass_action_detected"
  | "geographic_anomaly"
  | "bot_detected"
  | "malicious_upload"
  | "sql_injection_attempt"
  | "xss_attempt";

export type SecuritySeverity = "low" | "medium" | "high" | "critical";

export interface SecurityEvent {
  id: string;
  event_type: SecurityEventType;
  severity: SecuritySeverity;
  user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  details: Record<string, any> | null;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
}

/**
 * Log a security event
 */
export async function logSecurityEvent(input: {
  event_type: SecurityEventType;
  severity: SecuritySeverity;
  user_id?: string;
  details?: Record<string, any>;
}) {
  const admin = getSupabaseAdmin();
  
  // Get IP and user agent from headers
  const headersList = headers();
  const ip_address = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || null;
  const user_agent = headersList.get("user-agent") || null;

  const { data, error } = await admin
    .from("security_events")
    .insert({
      event_type: input.event_type,
      severity: input.severity,
      user_id: input.user_id || null,
      ip_address,
      user_agent,
      details: input.details || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to log security event:", error);
    return null;
  }

  return data as SecurityEvent;
}

/**
 * List security events with filtering
 */
export async function listSecurityEvents(params: {
  event_type?: SecurityEventType;
  severity?: SecuritySeverity;
  resolved?: boolean;
  user_id?: string;
  ip_address?: string;
  limit?: number;
  offset?: number;
} = {}) {
  await requireAdminRole("moderator");
  
  const admin = getSupabaseAdmin();
  
  let query = admin
    .from("security_events")
    .select(`
      *,
      user:users(id, handle, display_name, email),
      resolver:admins!security_events_resolved_by_fkey(
        id,
        role,
        user:users!admins_user_id_fkey(handle, display_name)
      )
    `, { count: "exact" })
    .order("created_at", { ascending: false });

  // Apply filters
  if (params.event_type) {
    query = query.eq("event_type", params.event_type);
  }
  
  if (params.severity) {
    query = query.eq("severity", params.severity);
  }
  
  if (params.resolved !== undefined) {
    query = query.eq("resolved", params.resolved);
  }
  
  if (params.user_id) {
    query = query.eq("user_id", params.user_id);
  }
  
  if (params.ip_address) {
    query = query.eq("ip_address", params.ip_address);
  }

  // Pagination
  const limit = params.limit || 50;
  const offset = params.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list security events: ${error.message}`);
  }

  return {
    events: data as any[],
    total: count || 0,
  };
}

/**
 * Resolve a security event
 */
export async function resolveSecurityEvent(
  eventId: string,
  notes: string
) {
  const adminUser = await requireAdminRole("moderator");
  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from("security_events")
    .update({
      resolved: true,
      resolved_by: adminUser.id,
      resolved_at: new Date().toISOString(),
      resolution_notes: notes,
    })
    .eq("id", eventId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to resolve event: ${error.message}`);
  }

  await createAuditLog({
    action: "security_event_resolved",
    resource_type: "security_event",
    resource_id: eventId,
    details: { notes },
  });

  return data;
}

/**
 * Get security statistics
 */
export async function getSecurityStats(days: number = 7) {
  await requireAdminRole("moderator");
  
  const admin = getSupabaseAdmin();
  const { data, error} = await admin.rpc("get_security_stats", { days });

  if (error) {
    throw new Error(`Failed to get security stats: ${error.message}`);
  }

  return data[0];
}

/**
 * Block an IP address
 */
export async function blockIP(
  ipAddress: string,
  reason: string,
  durationHours?: number
) {
  const adminUser = await requireAdminRole("moderator");
  const admin = getSupabaseAdmin();

  let expiresAt = null;
  if (durationHours) {
    const expires = new Date();
    expires.setHours(expires.getHours() + durationHours);
    expiresAt = expires.toISOString();
  }

  const { data, error } = await admin
    .from("ip_blocklist")
    .insert({
      ip_address: ipAddress,
      reason,
      blocked_by: adminUser.id,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to block IP: ${error.message}`);
  }

  await createAuditLog({
    action: "ip_blocked",
    resource_type: "ip_address",
    resource_id: ipAddress,
    details: { reason, duration_hours: durationHours },
  });

  return data;
}

/**
 * Unblock an IP address
 */
export async function unblockIP(ipAddress: string, reason: string) {
  const adminUser = await requireAdminRole("moderator");
  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from("ip_blocklist")
    .update({ active: false })
    .eq("ip_address", ipAddress)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to unblock IP: ${error.message}`);
  }

  await createAuditLog({
    action: "ip_unblocked",
    resource_type: "ip_address",
    resource_id: ipAddress,
    details: { reason },
  });

  return data;
}

/**
 * List blocked IPs
 */
export async function listBlockedIPs(activeOnly: boolean = true) {
  await requireAdminRole("moderator");
  
  const admin = getSupabaseAdmin();
  
  let query = admin
    .from("ip_blocklist")
    .select(`
      *,
      blocker:admins!ip_blocklist_blocked_by_fkey(
        id,
        role,
        user:users!admins_user_id_fkey(handle, display_name)
      )
    `)
    .order("blocked_at", { ascending: false });

  if (activeOnly) {
    query = query.eq("active", true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list blocked IPs: ${error.message}`);
  }

  return data || [];
}

/**
 * Get threat score for user or IP
 */
export async function getThreatScore(entityType: "user" | "ip", entityId: string) {
  await requireAdminRole("moderator");
  
  const admin = getSupabaseAdmin();
  
  const { data } = await admin
    .from("threat_scores")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .single();

  if (!data) {
    // Calculate and create if doesn't exist
    const score = await admin.rpc("calculate_threat_score", {
      check_entity_type: entityType,
      check_entity_id: entityId,
    });

    const riskLevel = 
      score.data >= 75 ? "critical" :
      score.data >= 50 ? "high" :
      score.data >= 25 ? "medium" : "low";

    const { data: created } = await admin
      .from("threat_scores")
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        score: score.data || 0,
        risk_level: riskLevel,
      })
      .select()
      .single();

    return created;
  }

  return data;
}

/**
 * Get recent high-risk alerts
 */
export async function getHighRiskAlerts(limit: number = 20) {
  await requireAdminRole("moderator");
  
  const admin = getSupabaseAdmin();
  
  const { data, error } = await admin
    .from("security_events")
    .select(`
      *,
      user:users(id, handle, display_name, avatar_url)
    `)
    .eq("resolved", false)
    .in("severity", ["high", "critical"])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get high-risk alerts: ${error.message}`);
  }

  return data || [];
}
