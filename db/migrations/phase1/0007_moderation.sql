-- Content Moderation System
-- Creates tables for content reports and moderation actions

-- ============================================================================
-- CONTENT REPORTS TABLE
-- ============================================================================
-- Stores user-reported content with moderation workflow

CREATE TABLE IF NOT EXISTS content_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'comment', 'profile', 'user')),
  content_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN (
    'spam',
    'harassment',
    'hate_speech',
    'violence',
    'sexual_content',
    'misinformation',
    'copyright',
    'impersonation',
    'self_harm',
    'other'
  )),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'reviewing',
    'resolved',
    'dismissed',
    'escalated'
  )),
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  reviewed_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  resolution TEXT,
  resolution_action TEXT CHECK (resolution_action IN (
    'no_action',
    'warning_sent',
    'content_removed',
    'user_suspended',
    'user_banned',
    'escalated_to_legal'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_reports_status ON content_reports(status, created_at DESC);
CREATE INDEX idx_reports_content ON content_reports(content_type, content_id);
CREATE INDEX idx_reports_reporter ON content_reports(reporter_id);
CREATE INDEX idx_reports_reviewer ON content_reports(reviewed_by);
CREATE INDEX idx_reports_severity ON content_reports(severity, status, created_at DESC);
CREATE INDEX idx_reports_created ON content_reports(created_at DESC);

-- ============================================================================
-- MODERATION ACTIONS TABLE
-- ============================================================================
-- Tracks all moderation actions taken by admins

CREATE TABLE IF NOT EXISTS moderation_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'content_removed',
    'content_restored',
    'user_warned',
    'user_suspended',
    'user_unsuspended',
    'user_banned',
    'user_unbanned',
    'report_dismissed',
    'report_escalated'
  )),
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment', 'user', 'report')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  duration_days INTEGER, -- For suspensions
  notes TEXT,
  report_id UUID REFERENCES content_reports(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for action history
CREATE INDEX idx_actions_admin ON moderation_actions(admin_id, created_at DESC);
CREATE INDEX idx_actions_target ON moderation_actions(target_type, target_id, created_at DESC);
CREATE INDEX idx_actions_type ON moderation_actions(action_type, created_at DESC);
CREATE INDEX idx_actions_report ON moderation_actions(report_id);

-- ============================================================================
-- USER MODERATION STATUS TABLE
-- ============================================================================
-- Tracks moderation status of users (warnings, suspensions, bans)

CREATE TABLE IF NOT EXISTS user_moderation_status (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  warning_count INTEGER NOT NULL DEFAULT 0,
  is_suspended BOOLEAN NOT NULL DEFAULT false,
  suspension_ends_at TIMESTAMPTZ,
  suspended_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  suspended_at TIMESTAMPTZ,
  suspension_reason TEXT,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  banned_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  banned_at TIMESTAMPTZ,
  ban_reason TEXT,
  last_warning_at TIMESTAMPTZ,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for checking user status
CREATE INDEX idx_user_mod_suspended ON user_moderation_status(is_suspended, suspension_ends_at);
CREATE INDEX idx_user_mod_banned ON user_moderation_status(is_banned);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on content_reports
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can create reports
CREATE POLICY reports_create_policy ON content_reports
  FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Policy: Users can view their own reports
CREATE POLICY reports_view_own_policy ON content_reports
  FOR SELECT
  USING (auth.uid() = reporter_id);

-- Policy: Admins can view all reports
CREATE POLICY reports_view_admin_policy ON content_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.revoked_at IS NULL
    )
  );

-- Policy: Admins can update reports
CREATE POLICY reports_update_admin_policy ON content_reports
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.revoked_at IS NULL
    )
  );

-- Enable RLS on moderation_actions
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all actions
CREATE POLICY actions_view_admin_policy ON moderation_actions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.revoked_at IS NULL
    )
  );

-- Policy: Admins can create actions
CREATE POLICY actions_create_admin_policy ON moderation_actions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins a
      WHERE a.user_id = auth.uid()
      AND a.id = admin_id
      AND a.revoked_at IS NULL
    )
  );

-- Enable RLS on user_moderation_status
ALTER TABLE user_moderation_status ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all statuses
CREATE POLICY user_mod_view_admin_policy ON user_moderation_status
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.revoked_at IS NULL
    )
  );

-- Policy: Admins can update statuses
CREATE POLICY user_mod_update_admin_policy ON user_moderation_status
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.revoked_at IS NULL
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for content_reports
CREATE TRIGGER update_content_reports_updated_at
  BEFORE UPDATE ON content_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for user_moderation_status
CREATE TRIGGER update_user_moderation_status_updated_at
  BEFORE UPDATE ON user_moderation_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to check if user is suspended or banned
CREATE OR REPLACE FUNCTION is_user_moderated(check_user_id UUID)
RETURNS TABLE(
  is_suspended BOOLEAN,
  is_banned BOOLEAN,
  suspension_ends_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ums.is_suspended, false) as is_suspended,
    COALESCE(ums.is_banned, false) as is_banned,
    ums.suspension_ends_at
  FROM user_moderation_status ums
  WHERE ums.user_id = check_user_id;
  
  -- If no record exists, return defaults
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, false, NULL::TIMESTAMPTZ;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get report statistics
CREATE OR REPLACE FUNCTION get_report_stats()
RETURNS TABLE(
  total_pending INTEGER,
  total_reviewing INTEGER,
  total_resolved_today INTEGER,
  avg_resolution_time_hours NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE status = 'pending')::INTEGER as total_pending,
    COUNT(*) FILTER (WHERE status = 'reviewing')::INTEGER as total_reviewing,
    COUNT(*) FILTER (WHERE status = 'resolved' AND reviewed_at > NOW() - INTERVAL '24 hours')::INTEGER as total_resolved_today,
    AVG(EXTRACT(EPOCH FROM (reviewed_at - created_at))/3600) FILTER (WHERE reviewed_at IS NOT NULL) as avg_resolution_time_hours
  FROM content_reports;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE content_reports IS 'User-reported content with moderation workflow';
COMMENT ON TABLE moderation_actions IS 'Audit trail of all moderation actions';
COMMENT ON TABLE user_moderation_status IS 'Tracks moderation status of users';
COMMENT ON FUNCTION is_user_moderated IS 'Check if a user is suspended or banned';
COMMENT ON FUNCTION get_report_stats IS 'Get aggregate statistics for moderation dashboard';
