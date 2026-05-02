-- Raw PostgreSQL indexes and constraints that Prisma cannot generate natively.
-- Apply this AFTER running `prisma migrate dev` for the baseline schema.
--
-- These cover:
-- - Partial indexes (WHERE clauses)
-- - Covering indexes (INCLUDE)
-- - Expression indexes (LOWER)
-- - EXCLUDE constraint alternative for admins

-- ============================================================================
-- USERS
-- ============================================================================

-- Expression index for case-insensitive handle lookups
CREATE INDEX IF NOT EXISTS idx_users_handle_lower ON users(LOWER(handle));

-- Partial index for users with display names
CREATE INDEX IF NOT EXISTS idx_users_display_name ON users(display_name) WHERE display_name IS NOT NULL;

-- ============================================================================
-- POSTS
-- ============================================================================

-- Partial index for media posts
CREATE INDEX IF NOT EXISTS idx_posts_media ON posts(media_type, created_at DESC) WHERE media_url IS NOT NULL;

-- Covering index for feed queries
CREATE INDEX IF NOT EXISTS idx_posts_feed_covering ON posts(created_at DESC, user_id, id)
  INCLUDE (caption, media_url, media_type);

-- ============================================================================
-- COMMENTS
-- ============================================================================

-- Covering index for comment queries
CREATE INDEX IF NOT EXISTS idx_comments_covering ON comments(post_id, created_at ASC)
  INCLUDE (user_id, body);

-- ============================================================================
-- FOLLOWS
-- ============================================================================

-- Covering indexes for follow count queries
CREATE INDEX IF NOT EXISTS idx_follows_count_follower ON follows(followee_id) INCLUDE (follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_count_following ON follows(follower_id) INCLUDE (followee_id);

-- ============================================================================
-- ADMINS
-- ============================================================================

-- Partial indexes for active admins
CREATE INDEX IF NOT EXISTS idx_admins_user_id ON admins(user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_admins_role ON admins(role) WHERE revoked_at IS NULL;

-- NOTE: Prisma does not support EXCLUDE constraints.
-- The "one active admin per user" rule is enforced in application code.
-- If you need DB-level enforcement, use the trigger below:

CREATE OR REPLACE FUNCTION enforce_single_active_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.revoked_at IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM admins
      WHERE user_id = NEW.user_id
      AND revoked_at IS NULL
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'User already has an active admin role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_single_active_admin_trigger ON admins;
CREATE TRIGGER enforce_single_active_admin_trigger
  BEFORE INSERT OR UPDATE ON admins
  FOR EACH ROW
  EXECUTE FUNCTION enforce_single_active_admin();

-- ============================================================================
-- MODERATION
-- ============================================================================

-- Partial index for pending/reviewing reports
CREATE INDEX IF NOT EXISTS idx_content_reports_severity_status ON content_reports(severity, status, created_at DESC)
  WHERE status IN ('pending', 'reviewing');

-- ============================================================================
-- SECURITY
-- ============================================================================

-- Partial index for unresolved security events
CREATE INDEX IF NOT EXISTS idx_security_events_unresolved ON security_events(resolved, severity, created_at DESC)
  WHERE resolved = false;

-- Partial index for active IP blocks
CREATE INDEX IF NOT EXISTS idx_ip_blocklist_ip ON ip_blocklist(ip_address) WHERE active = true;

-- Partial index for expiring blocks
CREATE INDEX IF NOT EXISTS idx_ip_blocklist_expires ON ip_blocklist(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- HEALTH & METRICS
-- ============================================================================

-- Partial index for API errors
CREATE INDEX IF NOT EXISTS idx_api_metrics_errors ON api_metrics(error_message) WHERE error_message IS NOT NULL;

-- ============================================================================
-- SESSION MANAGEMENT
-- ============================================================================

-- Partial indexes for active sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id, revoked) WHERE revoked = false;
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token, revoked) WHERE revoked = false;
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at, revoked) WHERE revoked = false;
CREATE INDEX IF NOT EXISTS idx_sessions_active ON user_sessions(last_active DESC) WHERE revoked = false;

-- Partial index for failed login attempts
CREATE INDEX IF NOT EXISTS idx_login_attempts_failed ON login_attempts(success, created_at DESC) WHERE success = false;

-- ============================================================================
-- ANALYZE
-- ============================================================================

ANALYZE users;
ANALYZE posts;
ANALYZE comments;
ANALYZE follows;
ANALYZE admins;
ANALYZE content_reports;
ANALYZE moderation_actions;
