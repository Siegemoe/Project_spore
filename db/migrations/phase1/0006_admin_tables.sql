-- Admin Dashboard Foundation
-- Creates tables for admin users, roles, and audit logging

-- ============================================================================
-- ADMINS TABLE
-- ============================================================================
-- Stores admin users with role-based permissions
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'moderator', 'analyst', 'support')),
  granted_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(user_id),
  -- Only allow one active admin role per user
  CONSTRAINT active_admin_unique EXCLUDE (user_id WITH =) WHERE (revoked_at IS NULL)
);

-- Indexes for admin lookups
CREATE INDEX idx_admins_user_id ON admins(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_admins_role ON admins(role) WHERE revoked_at IS NULL;
CREATE INDEX idx_admins_granted_by ON admins(granted_by);

-- ============================================================================
-- ADMIN AUDIT LOG TABLE
-- ============================================================================
-- Comprehensive audit trail for all admin actions
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit log queries
CREATE INDEX idx_audit_admin ON admin_audit_log(admin_id, created_at DESC);
CREATE INDEX idx_audit_resource ON admin_audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_action ON admin_audit_log(action, created_at DESC);
CREATE INDEX idx_audit_created ON admin_audit_log(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on admins table
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can read all admin records
CREATE POLICY admins_read_policy ON admins
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins a
      WHERE a.user_id = auth.uid()
      AND a.revoked_at IS NULL
    )
  );

-- Policy: Only super_admins can insert new admins
CREATE POLICY admins_insert_policy ON admins
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins a
      WHERE a.user_id = auth.uid()
      AND a.role = 'super_admin'
      AND a.revoked_at IS NULL
    )
  );

-- Policy: Only super_admins can revoke admins
CREATE POLICY admins_update_policy ON admins
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admins a
      WHERE a.user_id = auth.uid()
      AND a.role = 'super_admin'
      AND a.revoked_at IS NULL
    )
  );

-- Enable RLS on audit log
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can read all audit logs
CREATE POLICY audit_read_policy ON admin_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins a
      WHERE a.user_id = auth.uid()
      AND a.revoked_at IS NULL
    )
  );

-- Policy: All admins can insert audit logs (system level)
CREATE POLICY audit_insert_policy ON admin_audit_log
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins a
      WHERE a.user_id = auth.uid()
      AND a.revoked_at IS NULL
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if a user is an admin
CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admins
    WHERE user_id = check_user_id
    AND revoked_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get admin role
CREATE OR REPLACE FUNCTION get_admin_role(check_user_id UUID DEFAULT auth.uid())
RETURNS TEXT AS $$
DECLARE
  admin_role TEXT;
BEGIN
  SELECT role INTO admin_role
  FROM admins
  WHERE user_id = check_user_id
  AND revoked_at IS NULL
  LIMIT 1;
  
  RETURN admin_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has specific role or higher
CREATE OR REPLACE FUNCTION has_admin_permission(
  required_role TEXT,
  check_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  role_hierarchy INTEGER;
BEGIN
  -- Get user's role
  user_role := get_admin_role(check_user_id);
  
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Define role hierarchy (higher number = more permissions)
  role_hierarchy := CASE user_role
    WHEN 'super_admin' THEN 4
    WHEN 'moderator' THEN 3
    WHEN 'analyst' THEN 2
    WHEN 'support' THEN 1
    ELSE 0
  END;
  
  -- Check if user has required role or higher
  RETURN role_hierarchy >= CASE required_role
    WHEN 'super_admin' THEN 4
    WHEN 'moderator' THEN 3
    WHEN 'analyst' THEN 2
    WHEN 'support' THEN 1
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SEED DATA (Optional - for development)
-- ============================================================================
-- Uncomment to create a super_admin for your user
-- Replace 'your-user-id-here' with actual UUID from users table
-- 
-- INSERT INTO admins (user_id, role, notes)
-- VALUES (
--   'your-user-id-here'::UUID,
--   'super_admin',
--   'Initial super admin - created by migration'
-- );

COMMENT ON TABLE admins IS 'Stores admin users with role-based access control';
COMMENT ON TABLE admin_audit_log IS 'Comprehensive audit trail for all admin actions';
COMMENT ON FUNCTION is_admin IS 'Check if a user has any active admin role';
COMMENT ON FUNCTION get_admin_role IS 'Get the admin role for a user';
COMMENT ON FUNCTION has_admin_permission IS 'Check if user has specific admin permission level';
