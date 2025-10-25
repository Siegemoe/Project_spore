"use server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";

/**
 * Session configuration
 */
export const SESSION_CONFIG = {
  IDLE_TIMEOUT_DAYS: 30,      // Session expires after 30 days of inactivity
  ABSOLUTE_TIMEOUT_DAYS: 90,   // Session must be refreshed after 90 days
  MAX_CONCURRENT_SESSIONS: 5,  // Maximum active sessions per user
  FAILED_LOGIN_LIMIT: 5,       // Account locks after 5 failed attempts
  LOCKOUT_DURATION_MINUTES: 30, // Account locked for 30 minutes
} as const;

export interface SessionInfo {
  id: string;
  user_id: string;
  device_fingerprint: string | null;
  ip_address: string | null;
  user_agent: string | null;
  last_active: string;
  created_at: string;
  expires_at: string;
}

export interface LoginAttempt {
  user_email: string;
  ip_address: string;
  success: boolean;
  failed_reason: string | null;
  created_at: string;
}

/**
 * Create user sessions table (add to migration later)
 */
const CREATE_SESSIONS_TABLE = `
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  device_fingerprint TEXT,
  ip_address INET,
  user_agent TEXT,
  last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_sessions_user ON user_sessions(user_id, revoked) WHERE revoked = false;
CREATE INDEX idx_sessions_token ON user_sessions(session_token) WHERE revoked = false;
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at) WHERE revoked = false;
`;

const CREATE_LOGIN_ATTEMPTS_TABLE = `
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  ip_address INET NOT NULL,
  success BOOLEAN NOT NULL,
  failed_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_login_attempts_email ON login_attempts(user_email, created_at DESC);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address, created_at DESC);
CREATE INDEX idx_login_attempts_failed ON login_attempts(success, created_at DESC) WHERE success = false;
`;

const CREATE_ACCOUNT_LOCKS_TABLE = `
CREATE TABLE IF NOT EXISTS account_locks (
  user_email TEXT PRIMARY KEY,
  locked_until TIMESTAMPTZ NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_account_locks_locked ON account_locks(locked_until) WHERE locked_until > NOW();
`;

/**
 * Check if account is locked
 */
export async function isAccountLocked(email: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  
  const { data } = await admin
    .from("account_locks")
    .select("locked_until")
    .eq("user_email", email.toLowerCase())
    .gte("locked_until", new Date().toISOString())
    .single();
  
  return Boolean(data);
}

/**
 * Record login attempt
 */
export async function recordLoginAttempt(input: {
  email: string;
  success: boolean;
  failedReason?: string;
  ip_address: string;
}): Promise<void> {
  const admin = getSupabaseAdmin();
  
  // Record attempt
  await admin
    .from("login_attempts")
    .insert({
      user_email: input.email.toLowerCase(),
      ip_address: input.ip_address,
      success: input.success,
      failed_reason: input.failedReason || null,
    });
  
  // If failed, increment counter and check for lockout
  if (!input.success) {
    await handleFailedLogin(input.email, input.ip_address);
  } else {
    // On success, clear any lockout
    await admin
      .from("account_locks")
      .delete()
      .eq("user_email", input.email.toLowerCase());
  }
}

/**
 * Handle failed login - increment counter and lock if needed
 */
async function handleFailedLogin(email: string, ipAddress: string): Promise<void> {
  const admin = getSupabaseAdmin();
  
  // Get recent failed attempts (last 15 minutes)
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  
  const { data: recentAttempts } = await admin
    .from("login_attempts")
    .select("id")
    .eq("user_email", email.toLowerCase())
    .eq("success", false)
    .gte("created_at", fifteenMinutesAgo.toISOString());
  
  const failedCount = (recentAttempts?.length || 0) + 1;
  
  // Lock account if threshold exceeded
  if (failedCount >= SESSION_CONFIG.FAILED_LOGIN_LIMIT) {
    const lockedUntil = new Date(Date.now() + SESSION_CONFIG.LOCKOUT_DURATION_MINUTES * 60 * 1000);
    
    await admin
      .from("account_locks")
      .upsert({
        user_email: email.toLowerCase(),
        locked_until: lockedUntil.toISOString(),
        failed_attempts: failedCount,
        last_attempt: new Date().toISOString(),
      });
    
    // Log security event
    const { logSecurityEvent } = await import("@/features/security/actions");
    await logSecurityEvent({
      event_type: "account_takeover_attempt",
      severity: "high",
      details: {
        email,
        ip_address: ipAddress,
        failed_attempts: failedCount,
        locked_until: lockedUntil.toISOString(),
      },
    });
  }
}

/**
 * Get active sessions for a user
 */
export async function getUserSessions(userId: string): Promise<SessionInfo[]> {
  const admin = getSupabaseAdmin();
  
  const { data } = await admin
    .from("user_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("revoked", false)
    .gte("expires_at", new Date().toISOString())
    .order("last_active", { ascending: false });
  
  return (data || []) as SessionInfo[];
}

/**
 * Revoke a session
 */
export async function revokeSession(sessionId: string, userId: string): Promise<void> {
  const admin = getSupabaseAdmin();
  
  await admin
    .from("user_sessions")
    .update({ revoked: true })
    .eq("id", sessionId)
    .eq("user_id", userId);
}

/**
 * Revoke all sessions except current
 */
export async function revokeAllOtherSessions(userId: string, currentSessionId: string): Promise<void> {
  const admin = getSupabaseAdmin();
  
  await admin
    .from("user_sessions")
    .update({ revoked: true })
    .eq("user_id", userId)
    .neq("id", currentSessionId);
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const admin = getSupabaseAdmin();
  
  const { data } = await admin
    .from("user_sessions")
    .delete()
    .lt("expires_at", new Date().toISOString())
    .select();
  
  return data?.length || 0;
}

/**
 * Enforce concurrent session limit
 * Revokes oldest sessions if limit exceeded
 */
export async function enforceSessionLimit(userId: string): Promise<void> {
  const sessions = await getUserSessions(userId);
  
  if (sessions.length >= SESSION_CONFIG.MAX_CONCURRENT_SESSIONS) {
    // Revoke oldest sessions
    const toRevoke = sessions.slice(SESSION_CONFIG.MAX_CONCURRENT_SESSIONS - 1);
    const admin = getSupabaseAdmin();
    
    await admin
      .from("user_sessions")
      .update({ revoked: true })
      .in("id", toRevoke.map(s => s.id));
  }
}

/**
 * Get login attempt history for a user
 */
export async function getLoginHistory(
  email: string,
  limit: number = 10
): Promise<LoginAttempt[]> {
  const admin = getSupabaseAdmin();
  
  const { data } = await admin
    .from("login_attempts")
    .select("*")
    .eq("user_email", email.toLowerCase())
    .order("created_at", { ascending: false })
    .limit(limit);
  
  return (data || []) as LoginAttempt[];
}
