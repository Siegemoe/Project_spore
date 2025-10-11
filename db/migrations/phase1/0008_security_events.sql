-- Security Events and Alerts System
-- Tracks security-related events for monitoring and incident response

-- ============================================================================
-- SECURITY EVENTS TABLE
-- ============================================================================
-- Stores security-related events for monitoring and analysis

CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'failed_login',
    'rate_limit_exceeded',
    'suspicious_activity',
    'csrf_failure',
    'invalid_token',
    'account_takeover_attempt',
    'mass_action_detected',
    'geographic_anomaly',
    'bot_detected',
    'malicious_upload',
    'sql_injection_attempt',
    'xss_attempt'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_security_events_type ON security_events(event_type, created_at DESC);
CREATE INDEX idx_security_events_severity ON security_events(severity, created_at DESC);
CREATE INDEX idx_security_events_user ON security_events(user_id, created_at DESC);
CREATE INDEX idx_security_events_ip ON security_events(ip_address, created_at DESC);
CREATE INDEX idx_security_events_unresolved ON security_events(resolved, severity, created_at DESC) WHERE resolved = false;
CREATE INDEX idx_security_events_created ON security_events(created_at DESC);

-- ============================================================================
-- IP BLOCKLIST TABLE
-- ============================================================================
-- Stores blocked IP addresses

CREATE TABLE IF NOT EXISTS ip_blocklist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_address INET NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  blocked_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true
);

-- Indexes for IP blocking
CREATE INDEX idx_ip_blocklist_ip ON ip_blocklist(ip_address) WHERE active = true;
CREATE INDEX idx_ip_blocklist_active ON ip_blocklist(active, blocked_at DESC);
CREATE INDEX idx_ip_blocklist_expires ON ip_blocklist(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- THREAT SCORES TABLE
-- ============================================================================
-- Tracks threat scores for users and IP addresses

CREATE TABLE IF NOT EXISTS threat_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('user', 'ip')),
  entity_id TEXT NOT NULL, -- user_id or IP address
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  factors JSONB,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_type, entity_id)
);

-- Indexes for threat monitoring
CREATE INDEX idx_threat_scores_entity ON threat_scores(entity_type, entity_id);
CREATE INDEX idx_threat_scores_risk ON threat_scores(risk_level, score DESC);
CREATE INDEX idx_threat_scores_updated ON threat_scores(last_updated DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on security_events
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all security events
CREATE POLICY security_events_view_policy ON security_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.revoked_at IS NULL
    )
  );

-- Policy: System can insert security events (via service role)
CREATE POLICY security_events_insert_policy ON security_events
  FOR INSERT
  WITH CHECK (true);

-- Policy: Admins can update security events (to resolve them)
CREATE POLICY security_events_update_policy ON security_events
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.revoked_at IS NULL
    )
  );

-- Enable RLS on ip_blocklist
ALTER TABLE ip_blocklist ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view blocklist
CREATE POLICY ip_blocklist_view_policy ON ip_blocklist
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.revoked_at IS NULL
    )
  );

-- Policy: Moderators can manage blocklist
CREATE POLICY ip_blocklist_manage_policy ON ip_blocklist
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admins a
      WHERE a.user_id = auth.uid()
      AND a.role IN ('moderator', 'super_admin')
      AND a.revoked_at IS NULL
    )
  );

-- Enable RLS on threat_scores
ALTER TABLE threat_scores ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view threat scores
CREATE POLICY threat_scores_view_policy ON threat_scores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.revoked_at IS NULL
    )
  );

-- Policy: System can update threat scores (via service role)
CREATE POLICY threat_scores_upsert_policy ON threat_scores
  FOR ALL
  WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if IP is blocked
CREATE OR REPLACE FUNCTION is_ip_blocked(check_ip INET)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM ip_blocklist
    WHERE ip_address = check_ip
    AND active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get security event statistics
CREATE OR REPLACE FUNCTION get_security_stats(days INTEGER DEFAULT 7)
RETURNS TABLE(
  total_events BIGINT,
  critical_events BIGINT,
  unresolved_events BIGINT,
  top_event_type TEXT,
  top_event_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE severity = 'critical') as critical_events,
    COUNT(*) FILTER (WHERE resolved = false) as unresolved_events,
    (SELECT event_type FROM security_events 
     WHERE created_at > NOW() - (days || ' days')::INTERVAL
     GROUP BY event_type 
     ORDER BY COUNT(*) DESC 
     LIMIT 1) as top_event_type,
    (SELECT COUNT(*) FROM security_events 
     WHERE created_at > NOW() - (days || ' days')::INTERVAL
     GROUP BY event_type 
     ORDER BY COUNT(*) DESC 
     LIMIT 1) as top_event_count
  FROM security_events
  WHERE created_at > NOW() - (days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate threat score
CREATE OR REPLACE FUNCTION calculate_threat_score(
  check_entity_type TEXT,
  check_entity_id TEXT
)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
  event_count INTEGER;
  recent_critical INTEGER;
BEGIN
  -- Count recent security events (last 7 days)
  SELECT COUNT(*) INTO event_count
  FROM security_events
  WHERE created_at > NOW() - INTERVAL '7 days'
  AND (
    (check_entity_type = 'user' AND user_id::TEXT = check_entity_id) OR
    (check_entity_type = 'ip' AND ip_address::TEXT = check_entity_id)
  );
  
  -- Count critical events (last 24 hours)
  SELECT COUNT(*) INTO recent_critical
  FROM security_events
  WHERE created_at > NOW() - INTERVAL '24 hours'
  AND severity = 'critical'
  AND (
    (check_entity_type = 'user' AND user_id::TEXT = check_entity_id) OR
    (check_entity_type = 'ip' AND ip_address::TEXT = check_entity_id)
  );
  
  -- Calculate score
  score := LEAST(100, (event_count * 5) + (recent_critical * 20));
  
  RETURN score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE security_events IS 'Security-related events for monitoring and incident response';
COMMENT ON TABLE ip_blocklist IS 'Blocked IP addresses with expiration support';
COMMENT ON TABLE threat_scores IS 'Threat scores for users and IP addresses';
COMMENT ON FUNCTION is_ip_blocked IS 'Check if an IP address is currently blocked';
COMMENT ON FUNCTION get_security_stats IS 'Get security event statistics for dashboard';
COMMENT ON FUNCTION calculate_threat_score IS 'Calculate threat score based on recent security events';
