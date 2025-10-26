-- Migration: 0013_atomic_user_warning.sql
-- Description: Add atomic transaction function for warning users
-- This fixes the race condition in warnUser by using a single INSERT...ON CONFLICT statement

-- Create function for atomic user warning transaction
CREATE OR REPLACE FUNCTION warn_user_transaction(
  p_user_id UUID,
  p_admin_id UUID,
  p_report_id UUID,
  p_reason TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_new_warning_count INTEGER;
BEGIN
  -- Step 1: Atomically increment warning count using INSERT...ON CONFLICT
  -- This handles both creating new records and updating existing ones in a single operation
  INSERT INTO user_moderation_status (
    user_id,
    warning_count,
    last_warning_at
  ) VALUES (
    p_user_id,
    1,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    warning_count = user_moderation_status.warning_count + 1,
    last_warning_at = NOW()
  RETURNING warning_count INTO v_new_warning_count;

  -- Step 2: Record moderation action
  INSERT INTO moderation_actions (
    admin_id,
    action_type,
    target_type,
    target_id,
    reason,
    report_id
  ) VALUES (
    p_admin_id,
    'user_warned',
    'user',
    p_user_id,
    p_reason,
    p_report_id
  );

  -- Step 3: Update content report
  UPDATE content_reports
  SET
    status = 'resolved',
    resolution_action = 'warning_sent',
    resolution = p_reason,
    reviewed_by = p_admin_id,
    reviewed_at = NOW()
  WHERE id = p_report_id;

  -- Verify the report was updated
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Content report not found: %', p_report_id;
  END IF;

  -- Step 4: Create audit log entry (keeping it atomic)
  INSERT INTO audit_logs (
    admin_id,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    p_admin_id,
    'user_warned',
    'user',
    p_user_id,
    jsonb_build_object(
      'reason', p_reason,
      'report_id', p_report_id,
      'new_warning_count', v_new_warning_count
    )
  );

  -- Build success response
  v_result := json_build_object(
    'success', true,
    'user_id', p_user_id,
    'warning_count', v_new_warning_count,
    'report_id', p_report_id
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- On any error, the entire transaction will roll back automatically
    -- Re-raise the exception with context
    RAISE EXCEPTION 'warn_user_transaction failed: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users (will still check admin role in app)
GRANT EXECUTE ON FUNCTION warn_user_transaction TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION warn_user_transaction IS 
'Atomically warns a user by incrementing their warning count, recording the moderation action, updating the report, and logging the audit entry. Uses INSERT...ON CONFLICT to prevent race conditions when multiple warnings occur concurrently. All operations succeed or fail together to maintain consistency.';
