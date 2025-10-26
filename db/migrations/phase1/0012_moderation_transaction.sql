-- Migration: 0012_moderation_transaction.sql
-- Description: Add atomic transaction function for removing content with moderation actions
-- This ensures DB consistency when removing content, recording actions, and updating reports

-- Create function for atomic content removal transaction
CREATE OR REPLACE FUNCTION remove_content_transaction(
  p_content_type TEXT,
  p_content_id UUID,
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
  v_table_name TEXT;
  v_delete_count INTEGER;
BEGIN
  -- Validate content_type parameter
  IF p_content_type NOT IN ('post', 'comment') THEN
    RAISE EXCEPTION 'Invalid content_type: %. Must be "post" or "comment"', p_content_type;
  END IF;

  -- Determine table name based on content type
  v_table_name := CASE 
    WHEN p_content_type = 'post' THEN 'posts'
    WHEN p_content_type = 'comment' THEN 'comments'
  END;

  -- Step 1: Delete the content
  -- Using dynamic SQL to support both posts and comments tables
  EXECUTE format('DELETE FROM %I WHERE id = $1', v_table_name)
  USING p_content_id;
  
  GET DIAGNOSTICS v_delete_count = ROW_COUNT;
  
  -- If no rows were deleted, the content doesn't exist
  IF v_delete_count = 0 THEN
    RAISE EXCEPTION 'Content not found: % with id %', p_content_type, p_content_id;
  END IF;

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
    'content_removed',
    p_content_type,
    p_content_id,
    p_reason,
    p_report_id
  );

  -- Step 3: Update content report
  UPDATE content_reports
  SET
    status = 'resolved',
    resolution_action = 'content_removed',
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
    'content_removed',
    p_content_type,
    p_content_id,
    jsonb_build_object(
      'reason', p_reason,
      'report_id', p_report_id
    )
  );

  -- Build success response
  v_result := json_build_object(
    'success', true,
    'content_type', p_content_type,
    'content_id', p_content_id,
    'report_id', p_report_id,
    'deleted_count', v_delete_count
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- On any error, the entire transaction will roll back automatically
    -- Re-raise the exception with context
    RAISE EXCEPTION 'remove_content_transaction failed: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users (will still check admin role in app)
GRANT EXECUTE ON FUNCTION remove_content_transaction TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION remove_content_transaction IS 
'Atomically removes content (post or comment), records moderation action, updates report, and logs audit entry. All operations succeed or fail together to maintain consistency.';
