/**
 * Shared type definitions across the application
 * Centralized types for better consistency and maintainability
 */

// ============================================================================
// USER TYPES
// ============================================================================

export interface User {
  id: string;
  handle: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfile extends User {
  follower_count?: number;
  following_count?: number;
  post_count?: number;
  comment_count?: number;
}

// ============================================================================
// POST TYPES
// ============================================================================

export interface Post {
  id: string;
  user_id: string;
  caption: string | null;
  media_url: string | null;
  media_type: "image" | "video" | null;
  created_at: string;
  updated_at: string;
}

export interface PostWithAuthor extends Post {
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface PostCardData extends PostWithAuthor {
  // Additional UI-specific data
}

// ============================================================================
// COMMENT TYPES
// ============================================================================

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface CommentWithAuthor extends Comment {
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

// ============================================================================
// FOLLOW TYPES
// ============================================================================

export interface Follow {
  id: string;
  follower_id: string;
  followee_id: string;
  created_at: string;
}

export interface FollowWithUser extends Follow {
  followee?: User;
  follower?: User;
}

// ============================================================================
// PAGINATION TYPES
// ============================================================================

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  total?: number;
}

export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface APIResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface APIError {
  error: string;
  message: string;
  code?: string;
  details?: any;
}

// ============================================================================
// ADMIN TYPES
// ============================================================================

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

export interface AuditLogEntry {
  id: string;
  admin_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ============================================================================
// MODERATION TYPES
// ============================================================================

export type ReportReason = 
  | "spam"
  | "harassment"
  | "hate_speech"
  | "violence"
  | "sexual_content"
  | "misinformation"
  | "copyright"
  | "impersonation"
  | "self_harm"
  | "other";

export type ReportStatus = "pending" | "reviewing" | "resolved" | "dismissed" | "escalated";

export interface ContentReport {
  id: string;
  reporter_id: string;
  content_type: "post" | "comment" | "profile" | "user";
  content_id: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  severity: "low" | "medium" | "high" | "critical" | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// SECURITY TYPES
// ============================================================================

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

export interface SecurityEvent {
  id: string;
  event_type: SecurityEventType;
  severity: "low" | "medium" | "high" | "critical";
  user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  details: Record<string, any> | null;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

// ============================================================================
// HEALTH METRICS TYPES
// ============================================================================

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
  component: "database" | "storage" | "auth" | "api" | "cache";
  status: "healthy" | "degraded" | "down";
  last_check: string;
  response_time_ms?: number;
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface FormState<T = any> {
  data: T;
  errors: Record<string, string>;
  isSubmitting: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================


export type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
