"use server";

import { prisma } from "@/lib/prisma";
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

  const where: any = {};

  // Text search (handle, display_name, email)
  if (params.query) {
    where.OR = [
      { handle: { contains: params.query, mode: "insensitive" } },
      { displayName: { contains: params.query, mode: "insensitive" } },
      { email: { contains: params.query, mode: "insensitive" } },
    ];
  }

  // Email filter
  if (params.email) {
    where.email = { contains: params.email, mode: "insensitive" };
  }

  // GitHub connection filter
  if (params.has_github !== undefined) {
    if (params.has_github) {
      where.githubUsername = { not: null };
    } else {
      where.githubUsername = null;
    }
  }

  // Email verification filter
  if (params.verified !== undefined) {
    where.emailVerified = params.verified ? { not: null } : null;
  }

  // Date range filters
  if (params.created_after) {
    where.createdAt = { ...(where.createdAt || {}), gte: new Date(params.created_after) };
  }
  if (params.created_before) {
    where.createdAt = { ...(where.createdAt || {}), lte: new Date(params.created_before) };
  }

  const limit = params.limit || 50;
  const offset = params.offset || 0;

  const [rows, count] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      include: {
        moderationStatus: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  // Filter by moderation status if requested
  let filteredData = rows;
  if (params.status) {
    filteredData = rows.filter((user: any) => {
      const mod = user.moderationStatus;
      if (params.status === "banned") return mod?.isBanned;
      if (params.status === "suspended") return mod?.isSuspended;
      if (params.status === "active") return !mod?.isBanned && !mod?.isSuspended;
      return true;
    });
  }

  // Transform to snake_case for component compatibility
  const transformedUsers = filteredData.map((user: any) => ({
    id: user.id,
    handle: user.handle,
    display_name: user.displayName,
    email: user.email,
    email_verified: user.emailVerified != null,
    avatar_url: user.avatarUrl,
    created_at: user.createdAt.toISOString(),
    github_username: user.githubHandle,
    moderation: user.moderationStatus
      ? {
          is_suspended: user.moderationStatus.isSuspended,
          is_banned: user.moderationStatus.isBanned,
          warning_count: user.moderationStatus.warningCount,
        }
      : null,
  }));

  return {
    users: transformedUsers,
    total: count,
  };
}

/**
 * Get detailed user information
 */
export async function getUserDetails(userId: string) {
  await requireAdminRole("support");

  // Get user profile
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Get moderation status
  const modStatus = await prisma.userModerationStatus.findUnique({
    where: { userId },
  });

  // Get stats
  const [postsCount, commentsCount, followersCount, followingCount] = await Promise.all([
    prisma.post.count({ where: { userId } }),
    prisma.comment.count({ where: { userId } }),
    prisma.follow.count({ where: { followeeId: userId } }),
    prisma.follow.count({ where: { followerId: userId } }),
  ]);

  const stats: UserStats = {
    post_count: postsCount,
    comment_count: commentsCount,
    follower_count: followersCount,
    following_count: followingCount,
  };

  // Get recent activity (posts & comments)
  const recentPosts = await prisma.post.findMany({
    where: { userId },
    select: { id: true, caption: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const recentComments = await prisma.comment.findMany({
    where: { userId },
    select: { id: true, body: true, createdAt: true, postId: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // Get moderation history
  const moderationHistory = await prisma.moderationAction.findMany({
    where: { targetType: "user", targetId: userId },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      admin: {
        select: {
          role: true,
          user: { select: { handle: true, displayName: true } },
        },
      },
    },
  });

  const userProfile: UserProfile = user
    ? {
        id: user.id,
        handle: user.handle,
        display_name: user.displayName,
        bio: user.bio,
        avatar_url: user.avatarUrl,
        email: user.email,
        email_verified: user.emailVerified != null,
        created_at: user.createdAt.toISOString(),
        updated_at: user.updatedAt.toISOString(),
        last_sign_in_at: null,
        github_username: user.githubHandle,
      }
    : (null as unknown as UserProfile);

  const moderationInfo: UserModerationInfo | null = modStatus
    ? {
        warning_count: modStatus.warningCount,
        is_suspended: modStatus.isSuspended,
        suspension_ends_at: modStatus.suspensionEndsAt?.toISOString() ?? null,
        is_banned: modStatus.isBanned,
        ban_reason: modStatus.banReason,
        last_warning_at: modStatus.lastWarningAt?.toISOString() ?? null,
      }
    : null;

  return {
    user: userProfile,
    moderation: moderationInfo,
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

  const suspensionEnds = new Date();
  suspensionEnds.setDate(suspensionEnds.getDate() + durationDays);

  // Update or create moderation status
  await prisma.userModerationStatus.upsert({
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
    },
  });

  // Record action
  await prisma.moderationAction.create({
    data: {
      adminId: adminUser.id,
      actionType: "user_suspended",
      targetType: "user",
      targetId: userId,
      reason,
      durationDays,
    },
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

  await prisma.userModerationStatus.update({
    where: { userId },
    data: {
      isSuspended: false,
      suspensionEndsAt: null,
    },
  });

  // Record action
  await prisma.moderationAction.create({
    data: {
      adminId: adminUser.id,
      actionType: "user_unsuspended",
      targetType: "user",
      targetId: userId,
      reason,
    },
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

  await prisma.userModerationStatus.upsert({
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
    },
  });

  // Record action
  await prisma.moderationAction.create({
    data: {
      adminId: adminUser.id,
      actionType: "user_banned",
      targetType: "user",
      targetId: userId,
      reason,
    },
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

  await prisma.userModerationStatus.update({
    where: { userId },
    data: {
      isBanned: false,
      banReason: null,
    },
  });

  // Record action
  await prisma.moderationAction.create({
    data: {
      adminId: adminUser.id,
      actionType: "user_unbanned",
      targetType: "user",
      targetId: userId,
      reason,
    },
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
 * Note: Not applicable for OAuth-only authentication (Auth.js + GitHub)
 */
export async function adminResetUserPassword(_userId: string, _email: string) {
  await requireAdminRole("support");

  throw new Error(
    "Password reset is not available for OAuth-only authentication. Users sign in via GitHub."
  );
}

/**
 * Get user session information
 * Note: Auth.js sessions are stored in the database but not directly queryable via an admin API
 */
export async function getUserSessions(userId: string) {
  await requireAdminRole("support");

  const sessions = await prisma.session.findMany({
    where: { userId },
    select: { id: true, expires: true, sessionToken: true },
    orderBy: { expires: "desc" },
  });

  return {
    sessions: sessions.map((s) => ({
      id: s.id,
      session_token: s.sessionToken,
      expires_at: s.expires.toISOString(),
    })),
    last_sign_in_at: sessions.length > 0 ? sessions[0].expires.toISOString() : null,
    email_confirmed_at: null,
  };
}

/**
 * Delete user account (super_admin only)
 */
export async function adminDeleteUser(userId: string, reason: string) {
  const adminUser = await requireAdminRole("super_admin");

  // Delete user from database (cascades to related records due to foreign key constraints)
  await prisma.user.delete({ where: { id: userId } });

  // Audit log
  await createAuditLog({
    action: "user_deleted",
    resource_type: "user",
    resource_id: userId,
    details: { reason },
  });

  return { success: true };
}
