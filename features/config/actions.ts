"use server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
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
  const admin = getSupabaseAdmin();
  
  const { data, error } = await admin
    .from("system_config")
    .select("value")
    .eq("key", key)
    .single();

  if (error) {
    throw new Error(`Failed to get config: ${error.message}`);
  }

  return data.value;
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
  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from("system_config")
    .update({
      value,
      updated_by: adminUser.id,
      updated_at: new Date().toISOString(),
    })
    .eq("key", key)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update config: ${error.message}`);
  }

  // Audit log
  await createAuditLog({
    action: "system_config_updated",
    resource_type: "system_config",
    resource_id: key,
    details: { new_value: value },
  });

  return data;
}

/**
 * Get character limits
 */
export async function getCharacterLimits(): Promise<CharacterLimits> {
  const limits = await getSystemConfig("character_limits");
  return limits as CharacterLimits;
}

/**
 * Get moderation thresholds
 */
export async function getModerationThresholds(): Promise<ModerationThresholds> {
  const thresholds = await getSystemConfig("moderation_thresholds");
  return thresholds as ModerationThresholds;
}

/**
 * Get feature flags
 */
export async function getFeatureFlags(): Promise<FeatureFlags> {
  const flags = await getSystemConfig("feature_flags");
  return flags as FeatureFlags;
}

/**
 * Get rate limits
 */
export async function getRateLimits(): Promise<RateLimits> {
  const limits = await getSystemConfig("rate_limits");
  return limits as RateLimits;
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
  
  const admin = getSupabaseAdmin();
  
  const { data, error } = await admin
    .from("system_config")
    .select("*")
    .order("category");

  if (error) {
    throw new Error(`Failed to get all config: ${error.message}`);
  }

  return data;
}
