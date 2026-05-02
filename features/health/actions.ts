"use server";

import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/admin/auth";

export interface HealthMetrics {
  active_users_5min: number;
  active_users_15min: number;
  active_users_1hr: number;
  total_users: number;
  total_posts_24h: number;
  total_comments_24h: number;
  avg_response_time: number;
  error_rate: number;
}

export interface ComponentHealth {
  component: string;
  status: "healthy" | "degraded" | "down";
  last_check: string;
}

/**
 * Get platform health metrics
 */
export async function getHealthMetrics(): Promise<HealthMetrics> {
  await requireAdminRole("analyst");

  const now = new Date();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneHourAgoForMetrics = new Date(now.getTime() - 60 * 60 * 1000);

  // Get active users for different time windows
  const [
    active5min,
    active15min,
    active1hr,
    totalUsers,
    posts24h,
    comments24h,
    apiMetrics,
  ] = await Promise.all([
    prisma.activeUser.count({ where: { lastSeen: { gte: fiveMinAgo } } }),
    prisma.activeUser.count({ where: { lastSeen: { gte: fifteenMinAgo } } }),
    prisma.activeUser.count({ where: { lastSeen: { gte: oneHourAgo } } }),
    prisma.user.count(),
    prisma.post.count({ where: { createdAt: { gte: twentyFourHoursAgo } } }),
    prisma.comment.count({ where: { createdAt: { gte: twentyFourHoursAgo } } }),
    prisma.apiMetric.findMany({
      where: { createdAt: { gte: oneHourAgoForMetrics } },
      select: { responseTimeMs: true, statusCode: true },
    }),
  ]);

  // Calculate avg response time and error rate from raw metrics
  const avgResponseTime = apiMetrics.length > 0
    ? Math.round(apiMetrics.reduce((acc, m) => acc + m.responseTimeMs, 0) / apiMetrics.length)
    : 0;

  const errorCount = apiMetrics.filter(m => m.statusCode >= 400).length;
  const errorRate = apiMetrics.length > 0
    ? errorCount / apiMetrics.length
    : 0;

  return {
    active_users_5min: active5min,
    active_users_15min: active15min,
    active_users_1hr: active1hr,
    total_users: totalUsers,
    total_posts_24h: posts24h,
    total_comments_24h: comments24h,
    avg_response_time: avgResponseTime,
    error_rate: errorRate,
  };
}

/**
 * Get system health summary
 */
export async function getSystemHealth(): Promise<ComponentHealth[]> {
  await requireAdminRole("analyst");

  // Get latest health check per component
  const components = ["database", "storage", "auth", "api", "cache"] as const;

  const results = await Promise.all(
    components.map(async (component) => {
      const row = await prisma.systemHealth.findFirst({
        where: { component },
        orderBy: { createdAt: "desc" },
        select: { status: true, createdAt: true },
      });

      return {
        component,
        status: (row?.status ?? "down") as ComponentHealth["status"],
        last_check: row?.createdAt.toISOString() ?? new Date().toISOString(),
      };
    })
  );

  return results;
}

/**
 * Get API performance for all endpoints
 */
export async function getAPIPerformance(hours: number = 1) {
  await requireAdminRole("analyst");

  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const metrics = await prisma.apiMetric.findMany({
    where: { createdAt: { gte: since } },
    select: { endpoint: true, method: true, responseTimeMs: true, statusCode: true },
  });

  // Group by endpoint+method
  const grouped = new Map<string, { endpoint: string; method: string; total_time: number; count: number; errors: number }>();

  for (const m of metrics) {
    const key = `${m.method} ${m.endpoint}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.total_time += m.responseTimeMs;
      existing.count += 1;
      if (m.statusCode >= 400) existing.errors += 1;
    } else {
      grouped.set(key, {
        endpoint: m.endpoint,
        method: m.method,
        total_time: m.responseTimeMs,
        count: 1,
        errors: m.statusCode >= 400 ? 1 : 0,
      });
    }
  }

  return Array.from(grouped.values()).map((g) => ({
    endpoint: g.endpoint,
    method: g.method,
    avg_response_time: Math.round(g.total_time / g.count),
    total_requests: g.count,
    error_rate: g.count > 0 ? g.errors / g.count : 0,
  }));
}

/**
 * Get error rate trends
 */
export async function getErrorRateTrends(hours: number = 24) {
  await requireAdminRole("analyst");

  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const metrics = await prisma.apiMetric.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true, statusCode: true },
  });

  // Group by hour
  const hourly = new Map<string, { total: number; errors: number }>();

  for (const m of metrics) {
    const hourKey = m.createdAt.toISOString().slice(0, 13) + ":00:00Z"; // Round to hour
    const existing = hourly.get(hourKey);
    if (existing) {
      existing.total += 1;
      if (m.statusCode >= 400) existing.errors += 1;
    } else {
      hourly.set(hourKey, { total: 1, errors: m.statusCode >= 400 ? 1 : 0 });
    }
  }

  return Array.from(hourly.entries())
    .map(([hour, data]) => ({
      hour,
      error_rate: data.total > 0 ? data.errors / data.total : 0,
      total_requests: data.total,
    }))
    .sort((a, b) => a.hour.localeCompare(b.hour));
}

/**
 * Log an API metric (called from API routes)
 */
export async function logAPIMetric(input: {
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  user_id?: string;
  error_message?: string;
}) {
  try {
    await prisma.apiMetric.create({
      data: {
        endpoint: input.endpoint,
        method: input.method as any,
        statusCode: input.status_code,
        responseTimeMs: input.response_time_ms,
        userId: input.user_id || null,
        errorMessage: input.error_message || null,
      },
    });
  } catch (error) {
    console.error("Failed to log API metric:", error);
  }
}

/**
 * Record system health check
 */
export async function recordHealthCheck(input: {
  component: "database" | "storage" | "auth" | "api" | "cache";
  status: "healthy" | "degraded" | "down";
  response_time_ms?: number;
  error_message?: string;
  details?: Record<string, any>;
}) {
  try {
    await prisma.systemHealth.create({
      data: {
        component: input.component as any,
        status: input.status as any,
        responseTimeMs: input.response_time_ms ?? null,
        errorMessage: input.error_message ?? null,
        details: input.details,
      },
    });
  } catch (error) {
    console.error("Failed to record health check:", error);
  }
}

/**
 * Update active user timestamp
 */
export async function updateActiveUser(userId: string) {
  try {
    await prisma.activeUser.upsert({
      where: { userId },
      update: { lastSeen: new Date() },
      create: { userId, lastSeen: new Date() },
    });
  } catch (error) {
    console.error("Failed to update active user:", error);
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  await requireAdminRole("analyst");

  const [users, posts, comments, follows] = await Promise.all([
    prisma.user.count(),
    prisma.post.count(),
    prisma.comment.count(),
    prisma.follow.count(),
  ]);

  return {
    users_count: users,
    posts_count: posts,
    comments_count: comments,
    follows_count: follows,
  };
}
