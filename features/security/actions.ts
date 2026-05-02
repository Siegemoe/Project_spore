"use server";

import { prisma } from "@/lib/prisma";
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
  // Get IP and user agent from headers
  const headersList = headers();
  const ip_address = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || null;
  const user_agent = headersList.get("user-agent") || null;

  try {
    const row = await prisma.securityEvent.create({
      data: {
        eventType: input.event_type,
        severity: input.severity,
        userId: input.user_id || null,
        ipAddress: ip_address,
        userAgent: user_agent,
        details: input.details,
      },
    });

    return {
      id: row.id,
      event_type: row.eventType,
      severity: row.severity,
      user_id: row.userId,
      ip_address: row.ipAddress,
      user_agent: row.userAgent,
      details: row.details as Record<string, any> | null,
      resolved: row.resolved,
      resolved_by: row.resolvedBy,
      resolved_at: row.resolvedAt?.toISOString() ?? null,
      resolution_notes: row.resolutionNotes,
      created_at: row.createdAt.toISOString(),
    } as SecurityEvent;
  } catch (error) {
    console.error("Failed to log security event:", error);
    return null;
  }
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

  const where: any = {};
  if (params.event_type) where.eventType = params.event_type;
  if (params.severity) where.severity = params.severity;
  if (params.resolved !== undefined) where.resolved = params.resolved;
  if (params.user_id) where.userId = params.user_id;
  if (params.ip_address) where.ipAddress = params.ip_address;

  const limit = params.limit || 50;
  const offset = params.offset || 0;

  const [rows, count] = await Promise.all([
    prisma.securityEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      include: {
        user: {
          select: { id: true, handle: true, displayName: true, avatarUrl: true },
        },
        resolver: {
          select: {
            id: true,
            role: true,
            user: { select: { handle: true, displayName: true } },
          },
        },
      },
    }),
    prisma.securityEvent.count({ where }),
  ]);

  return {
    events: rows.map((row) => ({
      id: row.id,
      event_type: row.eventType,
      severity: row.severity,
      user_id: row.userId ?? undefined,
      ip_address: row.ipAddress ?? undefined,
      user_agent: row.userAgent ?? undefined,
      details: row.details as Record<string, any> | undefined,
      resolved: row.resolved,
      resolved_by: row.resolvedBy ?? undefined,
      resolved_at: row.resolvedAt?.toISOString() ?? undefined,
      resolution_notes: row.resolutionNotes ?? undefined,
      created_at: row.createdAt.toISOString(),
      user: row.user
        ? {
            id: row.user.id,
            handle: row.user.handle ?? undefined,
            display_name: row.user.displayName ?? undefined,
            avatar_url: row.user.avatarUrl ?? undefined,
          }
        : undefined,
      resolver: row.resolver
        ? {
            id: row.resolver.id,
            role: row.resolver.role,
            user: row.resolver.user
              ? {
                  handle: row.resolver.user.handle ?? undefined,
                  display_name: row.resolver.user.displayName ?? undefined,
                }
              : undefined,
          }
        : undefined,
    })),
    total: count,
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

  const row = await prisma.securityEvent.update({
    where: { id: eventId },
    data: {
      resolved: true,
      resolvedBy: adminUser.id,
      resolvedAt: new Date(),
      resolutionNotes: notes,
    },
  });

  await createAuditLog({
    action: "security_event_resolved",
    resource_type: "security_event",
    resource_id: eventId,
    details: { notes },
  });

  return row;
}

/**
 * Get security statistics
 */
export async function getSecurityStats(days: number = 7) {
  await requireAdminRole("moderator");

  const since = new Date();
  since.setDate(since.getDate() - days);

  const [totalEvents, bySeverity, byType, unresolvedHigh, unresolvedAll, recentIPs] = await Promise.all([
    prisma.securityEvent.count({ where: { createdAt: { gte: since } } }),
    prisma.securityEvent.groupBy({
      by: ["severity"],
      where: { createdAt: { gte: since } },
      _count: { severity: true },
    }),
    prisma.securityEvent.groupBy({
      by: ["eventType"],
      where: { createdAt: { gte: since } },
      _count: { eventType: true },
    }),
    prisma.securityEvent.count({
      where: {
        createdAt: { gte: since },
        resolved: false,
        severity: { in: ["high", "critical"] },
      },
    }),
    prisma.securityEvent.count({
      where: { createdAt: { gte: since }, resolved: false },
    }),
    prisma.securityEvent.groupBy({
      by: ["ipAddress"],
      where: { createdAt: { gte: since }, ipAddress: { not: null } },
      _count: { ipAddress: true },
      orderBy: { _count: { ipAddress: "desc" } },
      take: 10,
    }),
  ]);

  const criticalEvents = bySeverity.find((s) => s.severity === "critical")?._count.severity ?? 0;

  return {
    total_events: totalEvents,
    critical_events: criticalEvents,
    unresolved_events: unresolvedAll,
    events_by_severity: Object.fromEntries(bySeverity.map((s) => [s.severity, s._count.severity])),
    events_by_type: Object.fromEntries(byType.map((t) => [t.eventType, t._count.eventType])),
    unresolved_high_risk: unresolvedHigh,
    top_source_ips: recentIPs.map((ip) => ({
      ip: ip.ipAddress,
      count: ip._count.ipAddress,
    })),
  };
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

  let expiresAt = null;
  if (durationHours) {
    const expires = new Date();
    expires.setHours(expires.getHours() + durationHours);
    expiresAt = expires;
  }

  const row = await prisma.ipBlocklist.create({
    data: {
      ipAddress,
      reason,
      blockedBy: adminUser.id,
      expiresAt,
    },
  });

  await createAuditLog({
    action: "ip_blocked",
    resource_type: "ip_address",
    resource_id: ipAddress,
    details: { reason, duration_hours: durationHours },
  });

  return row;
}

/**
 * Unblock an IP address
 */
export async function unblockIP(ipAddress: string, reason: string) {
  const adminUser = await requireAdminRole("moderator");

  const row = await prisma.ipBlocklist.updateMany({
    where: { ipAddress },
    data: { active: false },
  });

  await createAuditLog({
    action: "ip_unblocked",
    resource_type: "ip_address",
    resource_id: ipAddress,
    details: { reason },
  });

  return { updated: row.count };
}

/**
 * List blocked IPs
 */
export async function listBlockedIPs(activeOnly: boolean = true) {
  await requireAdminRole("moderator");

  const where: any = {};
  if (activeOnly) where.active = true;

  const rows = await prisma.ipBlocklist.findMany({
    where,
    orderBy: { blockedAt: "desc" },
    include: {
      admin: {
        select: {
          id: true,
          role: true,
          user: { select: { handle: true, displayName: true } },
        },
      },
    },
  });

  return rows.map((row) => ({
    ...row,
    blocked_by: row.blockedBy,
    blocked_at: row.blockedAt.toISOString(),
    expires_at: row.expiresAt?.toISOString() ?? null,
    ip_address: row.ipAddress,
    blocker: row.admin,
  }));
}

/**
 * Get threat score for user or IP
 */
export async function getThreatScore(entityType: "user" | "ip", entityId: string) {
  await requireAdminRole("moderator");

  const existing = await prisma.threatScore.findUnique({
    where: { entityType_entityId: { entityType, entityId } },
  });

  if (existing) {
    return existing;
  }

  // Calculate a basic threat score from security events
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const events = await prisma.securityEvent.findMany({
    where: {
      createdAt: { gte: since },
      ...(entityType === "user" ? { userId: entityId } : { ipAddress: entityId }),
    },
    select: { severity: true },
  });

  let score = 0;
  for (const event of events) {
    switch (event.severity) {
      case "low": score += 5; break;
      case "medium": score += 15; break;
      case "high": score += 30; break;
      case "critical": score += 50; break;
    }
  }
  score = Math.min(score, 100);

  const riskLevel =
    score >= 75 ? "critical" :
    score >= 50 ? "high" :
    score >= 25 ? "medium" : "low";

  const created = await prisma.threatScore.create({
    data: {
      entityType,
      entityId,
      score,
      riskLevel: riskLevel as any,
    },
  });

  return created;
}

/**
 * Get recent high-risk alerts
 */
export async function getHighRiskAlerts(limit: number = 20) {
  await requireAdminRole("moderator");

  const rows = await prisma.securityEvent.findMany({
    where: {
      resolved: false,
      severity: { in: ["high", "critical"] },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: {
        select: { id: true, handle: true, displayName: true, avatarUrl: true },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    event_type: row.eventType,
    severity: row.severity,
    user_id: row.userId ?? undefined,
    ip_address: row.ipAddress ?? undefined,
    user_agent: row.userAgent ?? undefined,
    details: row.details as Record<string, any> | undefined,
    resolved: row.resolved,
    resolved_by: row.resolvedBy ?? undefined,
    resolved_at: row.resolvedAt?.toISOString() ?? undefined,
    resolution_notes: row.resolutionNotes ?? undefined,
    created_at: row.createdAt.toISOString(),
    user: row.user
      ? {
          id: row.user.id,
          handle: row.user.handle ?? undefined,
          display_name: row.user.displayName ?? undefined,
          avatar_url: row.user.avatarUrl ?? undefined,
        }
      : undefined,
  }));
}
