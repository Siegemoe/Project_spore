"use server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
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
  
  const admin = getSupabaseAdmin();

  // Get active users for different time windows
  const [
    active_5min,
    active_15min,
    active_1hr,
    totalUsers,
    posts24h,
    comments24h,
  ] = await Promise.all([
    admin.rpc("count_active_users", { minutes: 5 }),
    admin.rpc("count_active_users", { minutes: 15 }),
    admin.rpc("count_active_users", { minutes: 60 }),
    admin.from("users").select("id", { count: "exact", head: true }),
    admin.from("posts").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    admin.from("comments").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ]);

  // Get API performance metrics
  const { data: apiPerf } = await admin.rpc("get_api_performance", { hours: 1 });
  const avgResponseTime = apiPerf && apiPerf.length > 0 
    ? Math.round(apiPerf.reduce((acc: number, curr: any) => acc + (curr.avg_response_time || 0), 0) / apiPerf.length)
    : 0;
  
  const errorRate = apiPerf && apiPerf.length > 0
    ? apiPerf.reduce((acc: number, curr: any) => acc + (curr.error_rate || 0), 0) / apiPerf.length
    : 0;

  return {
    active_users_5min: active_5min.data || 0,
    active_users_15min: active_15min.data || 0,
    active_users_1hr: active_1hr.data || 0,
    total_users: totalUsers.count || 0,
    total_posts_24h: posts24h.count || 0,
    total_comments_24h: comments24h.count || 0,
    avg_response_time: avgResponseTime,
    error_rate: errorRate,
  };
}

/**
 * Get system health summary
 */
export async function getSystemHealth(): Promise<ComponentHealth[]> {
  await requireAdminRole("analyst");
  
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("get_health_summary");

  if (error) {
    throw new Error(`Failed to get health summary: ${error.message}`);
  }

  return data || [];
}

/**
 * Get API performance for all endpoints
 */
export async function getAPIPerformance(hours: number = 1) {
  await requireAdminRole("analyst");
  
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("get_api_performance", { hours });

  if (error) {
    throw new Error(`Failed to get API performance: ${error.message}`);
  }

  return data || [];
}

/**
 * Get error rate trends
 */
export async function getErrorRateTrends(hours: number = 24) {
  await requireAdminRole("analyst");
  
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("get_error_rate", { hours });

  if (error) {
    throw new Error(`Failed to get error rate: ${error.message}`);
  }

  return data || [];
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
  const admin = getSupabaseAdmin();

  const { error } = await admin
    .from("api_metrics")
    .insert({
      endpoint: input.endpoint,
      method: input.method,
      status_code: input.status_code,
      response_time_ms: input.response_time_ms,
      user_id: input.user_id || null,
      error_message: input.error_message || null,
    });

  if (error) {
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
  const admin = getSupabaseAdmin();

  const { error } = await admin
    .from("system_health")
    .insert({
      component: input.component,
      status: input.status,
      response_time_ms: input.response_time_ms || null,
      error_message: input.error_message || null,
      details: input.details || null,
    });

  if (error) {
    console.error("Failed to record health check:", error);
  }
}

/**
 * Update active user timestamp
 */
export async function updateActiveUser(userId: string) {
  const admin = getSupabaseAdmin();

  const { error } = await admin
    .from("active_users")
    .upsert({
      user_id: userId,
      last_seen: new Date().toISOString(),
    });

  if (error) {
    console.error("Failed to update active user:", error);
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  await requireAdminRole("analyst");
  
  const admin = getSupabaseAdmin();

  // Get table sizes
  const [users, posts, comments, follows] = await Promise.all([
    admin.from("users").select("id", { count: "exact", head: true }),
    admin.from("posts").select("id", { count: "exact", head: true }),
    admin.from("comments").select("id", { count: "exact", head: true }),
    admin.from("follows").select("id", { count: "exact", head: true }),
  ]);

  return {
    users_count: users.count || 0,
    posts_count: posts.count || 0,
    comments_count: comments.count || 0,
    follows_count: follows.count || 0,
  };
}
