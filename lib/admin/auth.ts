"use server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSupabase } from "@/lib/supabaseServer";
import { UnauthorizedError } from "@/lib/errors";

/**
 * Admin role types with hierarchy
 * super_admin > moderator > analyst > support
 */
export type AdminRole = "super_admin" | "moderator" | "analyst" | "support";

export interface AdminUser {
  id: string;
  user_id: string;
  role: AdminRole;
  granted_by: string | null;
  granted_at: string;
  revoked_at: string | null;
  notes: string | null;
}

/**
 * Role hierarchy for permission checks
 * Higher number = more permissions
 */
const ROLE_HIERARCHY: Record<AdminRole, number> = {
  super_admin: 4,
  moderator: 3,
  analyst: 2,
  support: 1,
};

/**
 * Get the current user's admin record if they have one
 * Returns null if user is not an admin or not authenticated
 */
export async function getCurrentAdmin(): Promise<AdminUser | null> {
  try {
    const supabase = getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("admins")
      .select("*")
      .eq("user_id", user.id)
      .is("revoked_at", null)
      .single();

    if (error || !data) {
      return null;
    }

    return data as AdminUser;
  } catch {
    return null;
  }
}

/**
 * Require that the current user is an admin
 * Throws UnauthorizedError if not
 */
export async function requireAdmin(): Promise<AdminUser> {
  const adminUser = await getCurrentAdmin();
  
  if (!adminUser) {
    throw new UnauthorizedError(
      "Admin access required. You must be an administrator to perform this action."
    );
  }
  
  return adminUser;
}

/**
 * Require that the current user has a specific admin role or higher
 * Throws UnauthorizedError if user doesn't have sufficient permissions
 */
export async function requireAdminRole(requiredRole: AdminRole): Promise<AdminUser> {
  const adminUser = await requireAdmin();
  
  const userLevel = ROLE_HIERARCHY[adminUser.role];
  const requiredLevel = ROLE_HIERARCHY[requiredRole];
  
  if (userLevel < requiredLevel) {
    throw new UnauthorizedError(
      `Insufficient permissions. Required role: ${requiredRole}, your role: ${adminUser.role}`
    );
  }
  
  return adminUser;
}

/**
 * Check if current user is an admin (without throwing)
 */
export async function isAdmin(): Promise<boolean> {
  const adminUser = await getCurrentAdmin();
  return adminUser !== null;
}

/**
 * Check if current user has a specific role or higher (without throwing)
 */
export async function hasAdminRole(requiredRole: AdminRole): Promise<boolean> {
  const adminUser = await getCurrentAdmin();
  
  if (!adminUser) {
    return false;
  }
  
  const userLevel = ROLE_HIERARCHY[adminUser.role];
  const requiredLevel = ROLE_HIERARCHY[requiredRole];
  
  return userLevel >= requiredLevel;
}

/**
 * Get all admins (super_admin only)
 */
export async function listAdmins() {
  await requireAdminRole("super_admin");
  
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("admins")
    .select(`
      *,
      user:users!admins_user_id_fkey(id, handle, display_name, avatar_url, email),
      granted_by_admin:admins!admins_granted_by_fkey(user_id, role)
    `)
    .order("granted_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list admins: ${error.message}`);
  }

  return data;
}

/**
 * Grant admin role to a user (super_admin only)
 */
export async function grantAdminRole(
  userId: string,
  role: AdminRole,
  notes?: string
): Promise<AdminUser> {
  const currentAdmin = await requireAdminRole("super_admin");
  
  const admin = getSupabaseAdmin();
  
  // Check if user already has an active admin role
  const { data: existing } = await admin
    .from("admins")
    .select("*")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .single();
  
  if (existing) {
    throw new Error("User already has an active admin role");
  }
  
  const { data, error } = await admin
    .from("admins")
    .insert({
      user_id: userId,
      role,
      granted_by: currentAdmin.id,
      notes,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to grant admin role: ${error.message}`);
  }

  return data as AdminUser;
}

/**
 * Revoke admin role from a user (super_admin only)
 */
export async function revokeAdminRole(adminId: string): Promise<void> {
  const currentAdmin = await requireAdminRole("super_admin");
  
  // Prevent self-revocation
  if (adminId === currentAdmin.id) {
    throw new Error("Cannot revoke your own admin role");
  }
  
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("admins")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", adminId);

  if (error) {
    throw new Error(`Failed to revoke admin role: ${error.message}`);
  }
}

/**
 * Update admin role (super_admin only)
 */
export async function updateAdminRole(
  adminId: string,
  newRole: AdminRole,
  notes?: string
): Promise<void> {
  const currentAdmin = await requireAdminRole("super_admin");
  
  // Prevent self-modification
  if (adminId === currentAdmin.id) {
    throw new Error("Cannot modify your own admin role");
  }
  
  const admin = getSupabaseAdmin();
  const updateData: any = { role: newRole };
  if (notes !== undefined) {
    updateData.notes = notes;
  }
  
  const { error } = await admin
    .from("admins")
    .update(updateData)
    .eq("id", adminId)
    .is("revoked_at", null);

  if (error) {
    throw new Error(`Failed to update admin role: ${error.message}`);
  }
}
