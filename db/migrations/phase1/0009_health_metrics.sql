-- Platform Health Metrics System
-- Stores performance metrics and health indicators

-- ============================================================================
-- API METRICS TABLE
-- ============================================================================
-- Stores API endpoint performance metrics

CREATE TABLE IF NOT EXISTS api_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance analysis
CREATE INDEX idx_api_metrics_endpoint ON api_metrics(endpoint, created_at DESC);
CREATE INDEX idx_api_metrics_status ON api_metrics(status_code, created_at DESC);
CREATE INDEX idx_api_metrics_created ON api_metrics(created_at DESC);
CREATE INDEX idx_api_metrics_errors ON api_metrics(error_message) WHERE error_message IS NOT NULL;

-- ============================================================================
-- SYSTEM HEALTH TABLE
-- ============================================================================
-- Stores periodic health check results

CREATE TABLE IF NOT EXISTS system_health (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  component TEXT NOT NULL CHECK (component IN (
    'database',
    'storage',
    'auth',
    'api',
    'cache'
  )),
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  response_time_ms INTEGER,
  error_message TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for health monitoring
CREATE INDEX idx_health_component ON system_health(component, created_at DESC);
CREATE INDEX idx_health_status ON system_health(status, created_at DESC);
CREATE INDEX idx_health_created ON system_health(created_at DESC);

-- ============================================================================
-- ACTIVE USERS TABLE
-- ============================================================================
-- Tracks active user sessions for analytics

CREATE TABLE IF NOT EXISTS active_users (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  PRIMARY KEY (user_id)
);

-- Index for active user queries
CREATE INDEX idx_active_users_last_seen ON active_users(last_seen DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on api_metrics
ALTER TABLE api_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view metrics
CREATE POLICY api_metrics_view_policy ON api_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.revoked_at IS NULL
    )
  );

-- Policy: System can insert metrics (via service role)
CREATE POLICY api_metrics_insert_policy ON api_metrics
  FOR INSERT
  WITH CHECK (true);

-- Enable RLS on system_health
ALTER TABLE system_health ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view health
CREATE POLICY health_view_policy ON system_health
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.revoked_at IS NULL
    )
  );

-- Policy: System can insert health checks
CREATE POLICY health_insert_policy ON system_health
  FOR INSERT
  WITH CHECK (true);

-- Enable RLS on active_users
ALTER TABLE active_users ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view active users
CREATE POLICY active_users_view_policy ON active_users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.revoked_at IS NULL
    )
  );

-- Policy: System can update active users
CREATE POLICY active_users_upsert_policy ON active_users
  FOR ALL
  WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get API performance metrics
CREATE OR REPLACE FUNCTION get_api_performance(hours INTEGER DEFAULT 1)
RETURNS TABLE(
  endpoint TEXT,
  total_requests BIGINT,
  avg_response_time NUMERIC,
  p95_response_time NUMERIC,
  error_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.endpoint,
    COUNT(*) as total_requests,
    AVG(m.response_time_ms)::NUMERIC as avg_response_time,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY m.response_time_ms)::NUMERIC as p95_response_time,
    (COUNT(*) FILTER (WHERE m.status_code >= 500)::NUMERIC / NULLIF(COUNT(*), 0) * 100) as error_rate
  FROM api_metrics m
  WHERE m.created_at > NOW() - (hours || ' hours')::INTERVAL
  GROUP BY m.endpoint
  ORDER BY total_requests DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to count active users
CREATE OR REPLACE FUNCTION count_active_users(minutes INTEGER DEFAULT 5)
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM active_users
    WHERE last_seen > NOW() - (minutes || ' minutes')::INTERVAL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get system health summary
CREATE OR REPLACE FUNCTION get_health_summary()
RETURNS TABLE(
  component TEXT,
  status TEXT,
  last_check TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (h.component)
    h.component,
    h.status,
    h.created_at as last_check
  FROM system_health h
  ORDER BY h.component, h.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get error rate over time
CREATE OR REPLACE FUNCTION get_error_rate(hours INTEGER DEFAULT 24)
RETURNS TABLE(
  hour_bucket TIMESTAMPTZ,
  total_requests BIGINT,
  error_count BIGINT,
  error_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    date_trunc('hour', created_at) as hour_bucket,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE status_code >= 500) as error_count,
    (COUNT(*) FILTER (WHERE status_code >= 500)::NUMERIC / NULLIF(COUNT(*), 0) * 100) as error_rate
  FROM api_metrics
  WHERE created_at > NOW() - (hours || ' hours')::INTERVAL
  GROUP BY hour_bucket
  ORDER BY hour_bucket DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean old metrics (retention policy)
CREATE OR REPLACE FUNCTION clean_old_metrics()
RETURNS void AS $$
BEGIN
  -- Keep only last 7 days of API metrics
  DELETE FROM api_metrics WHERE created_at < NOW() - INTERVAL '7 days';
  
  -- Keep only last 30 days of health checks
  DELETE FROM system_health WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Remove inactive users (not seen in 24 hours)
  DELETE FROM active_users WHERE last_seen < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE api_metrics IS 'API endpoint performance metrics';
COMMENT ON TABLE system_health IS 'System component health check results';
COMMENT ON TABLE active_users IS 'Active user session tracking';
COMMENT ON FUNCTION get_api_performance IS 'Get API performance stats for endpoints';
COMMENT ON FUNCTION count_active_users IS 'Count users active within specified minutes';
COMMENT ON FUNCTION get_health_summary IS 'Get latest health status for all components';
COMMENT ON FUNCTION get_error_rate IS 'Get error rate trends over time';
COMMENT ON FUNCTION clean_old_metrics IS 'Clean up old metrics (run via cron)';
