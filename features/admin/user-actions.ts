"use server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminRole } from "@/lib/admin/auth";
import { createAuditLog } from "@/lib/admin/audit";

export interface UserProfile {
  id: string;
  handle: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  email: string;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  last_sign_in_at: string | null;
  github_username: string | null;
}

export interface UserStats {
  post_count: number;
  comment_count: number;
  follower_count: number;
  following_count: number;
}

export interface UserModerationInfo {
  warning_count: number;
  is_suspended: boolean;
  suspension_ends_at: string | null;
  is_banned: boolean;
  ban_reason: string | null;
  last_warning_at: string | null;
}

/**
 * Search users with advanced filtering
 */
export async function searchUsers(params: {
  query?: string;
  email?: string;
  status?: "active" | "suspended" | "banned";
  verified?: boolean;
  has_github?: boolean;
  created_after?: string;
  created_before?: string;
  limit?: number;
  offset?: number;
}) {
  await requireAdminRole("support");
  
  const admin = getSupabaseAdmin();
  
  let query = admin
    .from("users")
    .select(`
      *,
      moderation:user_moderation_status(*)
    `, { count: "exact" })
    .order("created_at", { ascending: false });

  // Text search (handle, display_name, email)
  if (params.query) {
    query = query.or(`handle.ilike.%${params.query}%,display_name.ilike.%${params.query}%,email.ilike.%${params.query}%`);
  }

  // Email filter
  if (params.email) {
    query = query.ilike("email", `%${params.email}%`);
  }

  // GitHub connection filter
  if (params.has_github !== undefined) {
    if (params.has_github) {
      query = query.not("github_username", "is", null);
    } else {
      query = query.is("github_username", null);
    }
  }

  // Email verification filter
  if (params.verified !== undefined) {
    query = query.eq("email_verified", params.verified);
  }

  // Date range filters
  if (params.created_after) {
    query = query.gte("created_at", params.created_after);
  }
  if (params.created_before) {
    query = query.lte("created_at", params.created_before);
  }

  // Pagination
  const limit = params.limit || 50;
  const offset = params.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to search users: ${error.message}`);
  }

  // Filter by moderation status if requested
  let filteredData = data;
  if (params.status) {
    filteredData = data?.filter((user: any) => {
      const mod = user.moderation;
      if (params.status === "banned") return mod?.is_banned;
      if (params.status === "suspended") return mod?.is_suspended;
      if (params.status === "active") return !mod?.is_banned && !mod?.is_suspended;
      return true;
    });
  }

  return {
    users: filteredData || [],
    total: count || 0,
  };
}

/**
 * Get detailed user information
 */
export async function getUserDetails(userId: string) {
  await requireAdminRole("support");
  
  const admin = getSupabaseAdmin();

  // Get user profile
  const { data: user, error: userError } = await admin
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (userError || !user) {
    throw new Error("User not found");
  }

  // Get moderation status
  const { data: modStatus } = await admin
    .from("user_moderation_status")
    .select("*")
    .eq("user_id", userId)
    .single();

  // Get stats
  const [postsCount, commentsCount, followersCount, followingCount] = await Promise.all([
    admin.from("posts").select("id", { count: "exact", head: true }).eq("user_id", userId),
    admin.from("comments").select("id", { count: "exact", head: true }).eq("user_id", userId),
    admin.from("follows").select("id", { count: "exact", head: true }).eq("followee_id", userId),
    admin.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", userId),
  ]);

  const stats: UserStats = {
    post_count: postsCount.count || 0,
    comment_count: commentsCount.count || 0,
    follower_count: followersCount.count || 0,
    following_count: followingCount.count || 0,
  };

  // Get recent activity (posts & comments)
  const { data: recentPosts } = await admin
    .from("posts")
    .select("id, caption, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: recentComments } = await admin
    .from("comments")
    .select("id, body, created_at, post_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  // Get moderation history
  const { data: moderationHistory } = await admin
    .from("moderation_actions")
    .select(`
      *,
      admin:admins!moderation_actions_admin_id_fkey(
        role,
        user:users!admins_user_id_fkey(handle, display_name)
      )
    `)
    .eq("target_type", "user")
    .eq("target_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  return {
    user: user as UserProfile,
    moderation: modStatus as UserModerationInfo | null,
    stats,
    recent_posts: recentPosts || [],
    recent_comments: recentComments || [],
    moderation_history: moderationHistory || [],
  };
}

/**
 * Suspend user (admin action)
 */
export async function adminSuspendUser(
  userId: string,
  reason: string,
  durationDays: number
) {
  const adminUser = await requireAdminRole("moderator");
  const admin = getSupabaseAdmin();

  const suspensionEnds = new Date();
  suspensionEnds.setDate(suspensionEnds.getDate() + durationDays);

  // Update or create moderation status
  await admin
    .from("user_moderation_status")
    .upsert({
      user_id: userId,
      is_suspended: true,
      suspension_ends_at: suspensionEnds.toISOString(),
      suspended_by: adminUser.id,
      suspended_at: new Date().toISOString(),
      suspension_reason: reason,
    });

  // Record action
  await admin
    .from("moderation_actions")
    .insert({
      admin_id: adminUser.id,
      action_type: "user_suspended",
      target_type: "user",
      target_id: userId,
      reason,
      duration_days: durationDays,
    });

  // Audit log
  await createAuditLog({
    action: "user_suspended",
    resource_type: "user",
    resource_id: userId,
    details: { reason, duration_days: durationDays },
  });

  return { success: true };
}

/**
 * Unsuspend user
 */
export async function adminUnsuspendUser(userId: string, reason: string) {
  const adminUser = await requireAdminRole("moderator");
  const admin = getSupabaseAdmin();

  await admin
    .from("user_moderation_status")
    .update({
      is_suspended: false,
      suspension_ends_at: null,
    })
    .eq("user_id", userId);

  // Record action
  await admin
    .from("moderation_actions")
    .insert({
      admin_id: adminUser.id,
      action_type: "user_unsuspended",
      target_type: "user",
      target_id: userId,
      reason,
    });

  // Audit log
  await createAuditLog({
    action: "user_unsuspended",
    resource_type: "user",
    resource_id: userId,
    details: { reason },
  });

  return { success: true };
}

/**
 * Ban user permanently
 */
export async function adminBanUser(userId: string, reason: string) {
  const adminUser = await requireAdminRole("moderator");
  const admin = getSupabaseAdmin();

  await admin
    .from("user_moderation_status")
    .upsert({
      user_id: userId,
      is_banned: true,
      banned_by: adminUser.id,
      banned_at: new Date().toISOString(),
      ban_reason: reason,
    });

  // Record action
  await admin
    .from("moderation_actions")
    .insert({
      admin_id: adminUser.id,
      action_type: "user_banned",
      target_type: "user",
      target_id: userId,
      reason,
    });

  // Audit log
  await createAuditLog({
    action: "user_banned",
    resource_type: "user",
    resource_id: userId,
    details: { reason },
  });

  return { success: true };
}

/**
 * Unban user
 */
export async function adminUnbanUser(userId: string, reason: string) {
  const adminUser = await requireAdminRole("super_admin");
  const admin = getSupabaseAdmin();

  await admin
    .from("user_moderation_status")
    .update({
      is_banned: false,
      ban_reason: null,
    })
    .eq("user_id", userId);

  // Record action
  await admin
    .from("moderation_actions")
    .insert({
      admin_id: adminUser.id,
      action_type: "user_unbanned",
      target_type: "user",
      target_id: userId,
      reason,
    });

  // Audit log
  await createAuditLog({
    action: "user_unbanned",
    resource_type: "user",
    resource_id: userId,
    details: { reason },
  });

  return { success: true };
}

/**
 * Send password reset email
 */
export async function adminResetUserPassword(userId: string, email: string) {
  await requireAdminRole("support");
  const admin = getSupabaseAdmin();

  const { error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
  });

  if (error) {
    throw new Error(`Failed to generate reset link: ${error.message}`);
  }

  // Audit log
  await createAuditLog({
    action: "password_reset_sent",
    resource_type: "user",
    resource_id: userId,
    details: { email },
  });

  return { success: true };
}

/**
 * Get user session information
 */
export async function getUserSessions(userId: string) {
  await requireAdminRole("support");
  const admin = getSupabaseAdmin();

  // Note: Supabase doesn't directly expose session info via admin API
  // This would need to be tracked separately if needed
  // For now, return basic auth metadata
  
  const { data: user } = await admin.auth.admin.getUserById(userId);

  return {
    sessions: [], // Would need custom session tracking
    last_sign_in_at: user.user?.last_sign_in_at,
    email_confirmed_at: user.user?.email_confirmed_at,
  };
}

/**
 * Delete user account (super_admin only)
 */
export async function adminDeleteUser(userId: string, reason: string) {
  const adminUser = await requireAdminRole("super_admin");
  const admin = getSupabaseAdmin();

  // Delete from auth
  const { error: authError } = await admin.auth.admin.deleteUser(userId);
  
  if (authError) {
    throw new Error(`Failed to delete user: ${authError.message}`);
  }

  // User data will cascade delete due to foreign key constraints

  // Audit log
  await createAuditLog({
    action: "user_deleted",
    resource_type: "user",
    resource_id: userId,
    details: { reason },
  });

  return { success: true };
}
