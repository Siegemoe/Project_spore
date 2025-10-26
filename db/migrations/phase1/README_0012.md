# Migration 0012: Atomic Content Removal Transaction

## Overview
This migration introduces an atomic transaction for content removal operations, ensuring database consistency by preventing partial updates if any operation fails.

## Problem Solved
Previously, the `removeContent` function in `features/moderation/actions.ts` performed three separate database operations:
1. Delete content (post or comment)
2. Insert moderation action record
3. Update content report

If any operation failed, the database could be left in an inconsistent state (e.g., content deleted but no moderation record, or moderation record created but report not updated).

## Solution
Created a PostgreSQL stored procedure `remove_content_transaction` that executes all operations atomically within a single transaction:
1. Validates content_type parameter
2. Deletes content from appropriate table (posts or comments)
3. Inserts moderation_action record
4. Updates content_report with resolution
5. Creates audit_log entry

All operations succeed together or fail together with automatic rollback.

## Files Changed

### New Files
- `db/migrations/phase1/0012_moderation_transaction.sql` - PostgreSQL stored procedure

### Modified Files
- `features/moderation/actions.ts` - Updated `removeContent` function to use RPC call

## Key Features

### Stored Procedure
- **Function name**: `remove_content_transaction`
- **Parameters**:
  - `p_content_type`: 'post' or 'comment'
  - `p_content_id`: UUID of content to remove
  - `p_admin_id`: UUID of admin performing action
  - `p_report_id`: UUID of associated report
  - `p_reason`: Text description of reason for removal
- **Returns**: JSON object with success status and details
- **Security**: `SECURITY DEFINER` ensures proper permissions
- **Error handling**: Comprehensive validation and error messages

### Transaction Guarantees
- **Atomicity**: All operations complete or none do
- **Consistency**: Database constraints enforced
- **Isolation**: Operations isolated from concurrent transactions
- **Durability**: Changes persisted once committed

## Deployment Instructions

### 1. Apply Migration
Run the migration file against your Supabase database:

```bash
# Using Supabase CLI
supabase db push

# Or apply directly via SQL editor in Supabase Dashboard
# Copy contents of 0012_moderation_transaction.sql and execute
```

### 2. Verify Installation
Test that the function was created successfully:

```sql
-- Check function exists
SELECT proname, proargnames 
FROM pg_proc 
WHERE proname = 'remove_content_transaction';

-- Test function permissions
SELECT has_function_privilege('authenticated', 'remove_content_transaction(text, uuid, uuid, uuid, text)', 'EXECUTE');
```

### 3. Test the Function
You can test the function directly:

```sql
-- Example test (replace with actual IDs from your database)
SELECT remove_content_transaction(
  'post'::text,
  'content-uuid-here'::uuid,
  'admin-uuid-here'::uuid,
  'report-uuid-here'::uuid,
  'Test removal reason'::text
);
```

### 4. Deploy Application Code
Deploy the updated `features/moderation/actions.ts` file to your application.

## Benefits

1. **Data Integrity**: No partial updates possible
2. **Audit Trail**: Audit logs are included in transaction
3. **Error Clarity**: Detailed error messages for debugging
4. **Performance**: Single round-trip to database
5. **Maintainability**: Business logic in single location

## Rollback Plan

If issues occur, you can rollback by:

1. Reverting application code changes:
```typescript
// Restore previous separate operations in removeContent function
```

2. Optionally drop the function (not required, but for cleanliness):
```sql
DROP FUNCTION IF EXISTS remove_content_transaction(text, uuid, uuid, uuid, text);
```

## Testing Checklist

- [ ] Migration applied successfully
- [ ] Function exists and has correct permissions
- [ ] Application can call RPC function
- [ ] Content removal works correctly
- [ ] Moderation actions are recorded
- [ ] Reports are updated properly
- [ ] Audit logs are created
- [ ] Error handling works (try with invalid IDs)
- [ ] Transaction rollback works on errors

## Notes

- The stored procedure uses `SECURITY DEFINER` to run with the privileges of the function owner
- Authorization is still checked in the application layer via `requireAdminRole("moderator")`
- The function validates that content_type is either 'post' or 'comment'
- All timestamp fields use PostgreSQL's `NOW()` function for consistency
- The function returns JSON for easy parsing in TypeScript

## Support

If you encounter issues:
1. Check PostgreSQL logs for detailed error messages
2. Verify all table structures match expected schema
3. Ensure admin user has proper role assignments
4. Test with valid UUIDs that exist in the database
