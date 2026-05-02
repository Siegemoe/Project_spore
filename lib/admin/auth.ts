"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
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

function toAdminUser(row: {
  id: string;
  userId: string;
  role: string;
  grantedBy: string | null;
  grantedAt: Date;
  revokedAt: Date | null;
  notes: string | null;
}): AdminUser {
  return {
    id: row.id,
    user_id: row.userId,
    role: row.role as AdminRole,
    granted_by: row.grantedBy,
    granted_at: row.grantedAt.toISOString(),
    revoked_at: row.revokedAt?.toISOString() ?? null,
    notes: row.notes,
  };
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
    const session = await auth();

    if (!session?.user?.id) {
      return null;
    }
    const userId = session.user.id;

    const row = await prisma.admin.findFirst({
      where: { userId, revokedAt: null },
    });

    if (!row) {
      return null;
    }

    return toAdminUser(row);
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

  const rows = await prisma.admin.findMany({
    where: { revokedAt: null },
    orderBy: { grantedAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          handle: true,
          displayName: true,
          avatarUrl: true,
          email: true,
        },
      },
      grantedByAdmin: {
        select: {
          userId: true,
          role: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    ...toAdminUser(row),
    user: row.user,
    granted_by_admin: row.grantedByAdmin,
  }));
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

  // Check if user already has an active admin role
  const existing = await prisma.admin.findFirst({
    where: { userId, revokedAt: null },
  });

  if (existing) {
    throw new Error("User already has an active admin role");
  }

  const row = await prisma.admin.create({
    data: {
      userId,
      role,
      grantedBy: currentAdmin.id,
      notes: notes ?? null,
    },
  });

  return toAdminUser(row);
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

  await prisma.admin.update({
    where: { id: adminId },
    data: { revokedAt: new Date() },
  });
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

  const data: { role: AdminRole; notes?: string | null } = { role: newRole };
  if (notes !== undefined) {
    data.notes = notes;
  }

  await prisma.admin.updateMany({
    where: { id: adminId, revokedAt: null },
    data,
  });
}
