-- Enhanced Session Management and Auth Security
-- Implements session tracking, login attempts, and account lockout

-- ============================================================================
-- USER SESSIONS TABLE
-- ============================================================================
-- Tracks active user sessions across devices

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

-- Indexes for session queries
CREATE INDEX idx_sessions_user ON user_sessions(user_id, revoked) WHERE revoked = false;
CREATE INDEX idx_sessions_token ON user_sessions(session_token) WHERE revoked = false;
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at) WHERE revoked = false;
CREATE INDEX idx_sessions_active ON user_sessions(last_active DESC) WHERE revoked = false;

-- ============================================================================
-- LOGIN ATTEMPTS TABLE
-- ============================================================================
-- Tracks all login attempts for security monitoring

CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  ip_address INET NOT NULL,
  success BOOLEAN NOT NULL,
  failed_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for login attempt queries
CREATE INDEX idx_login_attempts_email ON login_attempts(user_email, created_at DESC);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address, created_at DESC);
CREATE INDEX idx_login_attempts_failed ON login_attempts(success, created_at DESC) WHERE success = false;
CREATE INDEX idx_login_attempts_recent ON login_attempts(created_at DESC);

-- ============================================================================
-- ACCOUNT LOCKS TABLE
-- ============================================================================
-- Tracks temporarily locked accounts due to failed login attempts

CREATE TABLE IF NOT EXISTS account_locks (
  user_email TEXT PRIMARY KEY,
  locked_until TIMESTAMPTZ NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for checking active locks (without NOW() predicate - use in queries instead)
CREATE INDEX idx_account_locks_locked ON account_locks(locked_until);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on user_sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own sessions
CREATE POLICY sessions_view_own_policy ON user_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can revoke their own sessions
CREATE POLICY sessions_revoke_own_policy ON user_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Admins can view all sessions
CREATE POLICY sessions_view_admin_policy ON user_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.revoked_at IS NULL
    )
  );

-- Policy: System can manage sessions
CREATE POLICY sessions_system_policy ON user_sessions
  FOR ALL
  WITH CHECK (true);

-- Enable RLS on login_attempts
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view login attempts
CREATE POLICY login_attempts_view_policy ON login_attempts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.revoked_at IS NULL
    )
  );

-- Policy: System can insert login attempts
CREATE POLICY login_attempts_insert_policy ON login_attempts
  FOR INSERT
  WITH CHECK (true);

-- Enable RLS on account_locks
ALTER TABLE account_locks ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view locks
CREATE POLICY account_locks_view_policy ON account_locks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.revoked_at IS NULL
    )
  );

-- Policy: System can manage locks
CREATE POLICY account_locks_manage_policy ON account_locks
  FOR ALL
  WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if account is currently locked
CREATE OR REPLACE FUNCTION is_account_locked(check_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM account_locks
    WHERE user_email = LOWER(check_email)
    AND locked_until > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to count active sessions for a user
CREATE OR REPLACE FUNCTION count_active_sessions(check_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM user_sessions
    WHERE user_id = check_user_id
    AND revoked = false
    AND expires_at > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean expired sessions (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM user_sessions
    WHERE expires_at < NOW()
    OR (revoked = true AND created_at < NOW() - INTERVAL '7 days')
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean old login attempts (keep 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM login_attempts
    WHERE created_at < NOW() - INTERVAL '30 days'
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE user_sessions IS 'Tracks active user sessions across devices';
COMMENT ON TABLE login_attempts IS 'Login attempt history for security monitoring';
COMMENT ON TABLE account_locks IS 'Temporarily locked accounts due to failed login attempts';
COMMENT ON FUNCTION is_account_locked IS 'Check if an account is currently locked';
COMMENT ON FUNCTION count_active_sessions IS 'Count active sessions for a user';
COMMENT ON FUNCTION cleanup_expired_sessions IS 'Remove expired and old revoked sessions';
COMMENT ON FUNCTION cleanup_old_login_attempts IS 'Remove login attempts older than 30 days';
