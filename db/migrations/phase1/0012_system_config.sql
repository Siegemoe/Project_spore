-- System Configuration Management
-- Allows super admins to configure global platform settings

-- ============================================================================
-- SYSTEM CONFIG TABLE
-- ============================================================================
-- Stores configuration as key-value pairs with JSON values

CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('limits', 'moderation', 'features', 'rate_limits')),
  updated_by UUID REFERENCES admins(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying by category
CREATE INDEX idx_system_config_category ON system_config(category);

-- ============================================================================
-- DEFAULT CONFIGURATION
-- ============================================================================
-- Insert sensible defaults

INSERT INTO system_config (key, value, description, category) VALUES
  -- Character Limits
  ('character_limits', '{
    "post_caption": 2000,
    "comment_body": 1000,
    "bio": 500,
    "display_name": 50,
    "handle": 30
  }'::jsonb, 'Character limits for user-generated content', 'limits'),
  
  -- Moderation Thresholds
  ('moderation_thresholds', '{
    "auto_flag_dislikes": -10,
    "auto_hide_reports": 5,
    "spam_threshold": 3
  }'::jsonb, 'Automatic moderation thresholds', 'moderation'),
  
  -- Feature Toggles
  ('feature_flags', '{
    "likes_enabled": true,
    "dislikes_enabled": true,
    "dm_enabled": false,
    "projects_enabled": false,
    "notifications_enabled": false
  }'::jsonb, 'Feature flag toggles', 'features'),
  
  -- Rate Limits
  ('rate_limits', '{
    "posts_per_hour": 20,
    "comments_per_hour": 50,
    "follows_per_hour": 30,
    "likes_per_hour": 100
  }'::jsonb, 'Rate limiting thresholds per user', 'rate_limits')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read config
CREATE POLICY config_read_policy ON system_config
  FOR SELECT
  USING (true);

-- Policy: Only super admins can update
CREATE POLICY config_update_policy ON system_config
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.role = 'super_admin'
      AND admins.revoked_at IS NULL
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get config value
CREATE OR REPLACE FUNCTION get_config(config_key TEXT)
RETURNS JSONB AS $
DECLARE
  config_value JSONB;
BEGIN
  SELECT value INTO config_value
  FROM system_config
  WHERE key = config_key;
  
  RETURN config_value;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Function to get character limit for a field
CREATE OR REPLACE FUNCTION get_char_limit(field_name TEXT)
RETURNS INTEGER AS $
DECLARE
  limits JSONB;
BEGIN
  SELECT value INTO limits
  FROM system_config
  WHERE key = 'character_limits';
  
  RETURN (limits->>field_name)::INTEGER;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Function to check if feature is enabled
CREATE OR REPLACE FUNCTION is_feature_enabled(feature_name TEXT)
RETURNS BOOLEAN AS $
DECLARE
  flags JSONB;
BEGIN
  SELECT value INTO flags
  FROM system_config
  WHERE key = 'feature_flags';
  
  RETURN COALESCE((flags->>feature_name)::BOOLEAN, false);
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
COMMENT ON TABLE system_config IS 'Global platform configuration managed by super admins';
COMMENT ON FUNCTION get_config IS 'Get configuration value by key';
COMMENT ON FUNCTION get_char_limit IS 'Get character limit for a specific field';
COMMENT ON FUNCTION is_feature_enabled IS 'Check if a feature is enabled';
