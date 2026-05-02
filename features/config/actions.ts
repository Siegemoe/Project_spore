"use server";

import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/admin/auth";
import { createAuditLog } from "@/lib/admin/audit";

export interface CharacterLimits {
  post_caption: number;
  comment_body: number;
  bio: number;
  display_name: number;
  handle: number;
}

export interface ModerationThresholds {
  auto_flag_dislikes: number;
  auto_hide_reports: number;
  spam_threshold: number;
}

export interface FeatureFlags {
  likes_enabled: boolean;
  dislikes_enabled: boolean;
  dm_enabled: boolean;
  projects_enabled: boolean;
  notifications_enabled: boolean;
}

export interface RateLimits {
  posts_per_hour: number;
  comments_per_hour: number;
  follows_per_hour: number;
  likes_per_hour: number;
}

/**
 * Get system configuration by key
 */
export async function getSystemConfig(key: string) {
  const row = await prisma.systemConfig.findUnique({
    where: { key },
    select: { value: true },
  });

  if (!row) {
    throw new Error(`Config key not found: ${key}`);
  }

  return row.value;
}

/**
 * Update system configuration
 * Super admin only
 */
export async function updateSystemConfig(
  key: string,
  value: any
) {
  const adminUser = await requireAdminRole("super_admin");

  const row = await prisma.systemConfig.update({
    where: { key },
    data: {
      value,
      updatedBy: adminUser.id,
      updatedAt: new Date(),
    },
  });

  // Audit log
  await createAuditLog({
    action: "system_config_updated",
    resource_type: "system_config",
    resource_id: key,
    details: { new_value: value },
  });

  return row;
}

/**
 * Get character limits
 */
export async function getCharacterLimits(): Promise<CharacterLimits> {
  const limits = await getSystemConfig("character_limits");
  return limits as unknown as CharacterLimits;
}

/**
 * Get moderation thresholds
 */
export async function getModerationThresholds(): Promise<ModerationThresholds> {
  const thresholds = await getSystemConfig("moderation_thresholds");
  return thresholds as unknown as ModerationThresholds;
}

/**
 * Get feature flags
 */
export async function getFeatureFlags(): Promise<FeatureFlags> {
  const flags = await getSystemConfig("feature_flags");
  return flags as unknown as FeatureFlags;
}

/**
 * Get rate limits
 */
export async function getRateLimits(): Promise<RateLimits> {
  const limits = await getSystemConfig("rate_limits");
  return limits as unknown as RateLimits;
}

/**
 * Check if feature is enabled
 */
export async function isFeatureEnabled(feature: keyof FeatureFlags): Promise<boolean> {
  const flags = await getFeatureFlags();
  return flags[feature] || false;
}

/**
 * Get all configuration (for admin config page)
 */
export async function getAllConfig() {
  await requireAdminRole("super_admin");

  const rows = await prisma.systemConfig.findMany({
    orderBy: { category: "asc" },
  });

  return rows;
}
