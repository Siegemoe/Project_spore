-- Profile Enhancements
-- Adds multi-website support and email visibility control

-- ============================================================================
-- PROFILE COLUMNS
-- ============================================================================

-- Add websites array (max 5)
ALTER TABLE users ADD COLUMN IF NOT EXISTS websites JSONB DEFAULT '[]';

-- Add email visibility toggle
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_public BOOLEAN DEFAULT false;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for finding users with public emails
CREATE INDEX IF NOT EXISTS idx_users_email_public ON users(email_public) WHERE email_public = true;

-- ============================================================================
-- VALIDATION
-- ============================================================================

-- Add check constraint for websites array length (if not already exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_websites_max_5'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_websites_max_5
      CHECK (jsonb_array_length(websites) <= 5);
  END IF;
END $$;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to validate website URL
CREATE OR REPLACE FUNCTION is_valid_website_url(url TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN url ~ '^https?://[a-zA-Z0-9]';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON COLUMN users.websites IS 'Array of website URLs (max 5)';
COMMENT ON COLUMN users.email_public IS 'Whether to show email in public profile';
COMMENT ON FUNCTION is_valid_website_url IS 'Validate website URL format';
