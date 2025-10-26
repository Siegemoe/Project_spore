# Migration 0013: Atomic User Warning Transaction

## Overview
This migration introduces an atomic database function to fix the race condition in user warning operations. The previous implementation used a read-then-update pattern that could result in lost warning counts when multiple warnings occurred concurrently.

## Problem Statement
The original `warnUser` function in `features/moderation/actions.ts` (lines 298-322) had a race condition:

```typescript
// Old implementation - RACE CONDITION
const { data: existing } = await admin
  .from("user_moderation_status")
  .select("*")
  .eq("user_id", userId)
  .single();

if (existing) {
  // Between SELECT and UPDATE, another warning could occur
  await admin
    .from("user_moderation_status")
    .update({
      warning_count: existing.warning_count + 1,
      last_warning_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}
```

**Race Condition Scenario:**
1. Admin A reads warning_count = 2
2. Admin B reads warning_count = 2
3. Admin A updates warning_count = 3
4. Admin B updates warning_count = 3 (should be 4!)

Result: Lost warning update - user has 3 warnings instead of 4.

## Solution
Uses PostgreSQL's `INSERT...ON CONFLICT` statement to atomically handle both:
- Creating new user moderation records (initial warning)
- Incrementing existing warning counts

This ensures the increment happens server-side in a single atomic operation.

## Database Function

### `warn_user_transaction(p_user_id, p_admin_id, p_report_id, p_reason)`

**Parameters:**
- `p_user_id` (UUID): User receiving the warning
- `p_admin_id` (UUID): Admin issuing the warning
- `p_report_id` (UUID): Related content report
- `p_reason` (TEXT): Reason for the warning

**Returns:**
```json
{
  "success": true,
  "user_id": "uuid",
  "warning_count": 3,
  "report_id": "uuid"
}
```

**Operations (all atomic):**
1. **Increment warning count** using `INSERT...ON CONFLICT`:
   ```sql
   INSERT INTO user_moderation_status (user_id, warning_count, last_warning_at)
   VALUES (p_user_id, 1, NOW())
   ON CONFLICT (user_id) DO UPDATE SET
     warning_count = user_moderation_status.warning_count + 1,
     last_warning_at = NOW()
   ```

2. **Record moderation action** in `moderation_actions` table

3. **Update content report** status to resolved with warning_sent action

4. **Create audit log** entry with the new warning count

## Benefits

### Atomicity
All operations succeed or fail together. No partial state updates.

### Race Condition Prevention
The `INSERT...ON CONFLICT` statement performs the read and increment in a single atomic operation at the database level, preventing concurrent updates from interfering with each other.

### Simplified Code
- **Before:** 40+ lines with complex read/check/update logic
- **After:** Single RPC call, database handles complexity

### Consistency
All related operations (warning increment, moderation action, report update, audit log) happen in one transaction.

## Usage

### Application Code
```typescript
// New implementation - NO RACE CONDITION
export async function warnUser(
  reportId: string,
  userId: string,
  reason: string
) {
  const adminUser = await requireAdminRole("moderator");
  const admin = getSupabaseAdmin();

  const { data, error } = await admin.rpc('warn_user_transaction', {
    p_user_id: userId,
    p_admin_id: adminUser.id,
    p_report_id: reportId,
    p_reason: reason
  });

  if (error) {
    throw new Error(`Failed to warn user atomically: ${error.message}`);
  }

  return { success: true, warning_count: data.warning_count };
}
```

## Testing Concurrent Warnings

To verify the race condition is fixed, you can test with concurrent warning operations:

```sql
-- Setup test user
INSERT INTO users (id, handle, email) 
VALUES ('test-user-id', 'testuser', 'test@example.com');

-- Simulate concurrent warnings (run these in parallel sessions)
-- Session 1:
SELECT warn_user_transaction(
  'test-user-id'::uuid,
  'admin-1-id'::uuid,
  'report-1-id'::uuid,
  'Spam content'
);

-- Session 2 (simultaneously):
SELECT warn_user_transaction(
  'test-user-id'::uuid,
  'admin-2-id'::uuid,
  'report-2-id'::uuid,
  'Inappropriate behavior'
);

-- Verify both warnings were counted
SELECT warning_count FROM user_moderation_status WHERE user_id = 'test-user-id';
-- Should show: 2 (not 1!)
```

## Migration Steps

1. **Apply migration:** Run `0013_atomic_user_warning.sql`
2. **Update code:** The `warnUser` function in `features/moderation/actions.ts` has been updated
3. **No downtime:** Old code continues working during deployment
4. **Deploy:** Deploy updated application code that uses the new RPC function

## Rollback Plan

If issues arise, you can rollback by:

1. Reverting the code changes to use the old SELECT/UPDATE pattern
2. Dropping the function:
   ```sql
   DROP FUNCTION IF EXISTS warn_user_transaction(UUID, UUID, UUID, TEXT);
   ```

Note: Any warnings issued while the new function was active will remain valid.

## Related Files
- `db/migrations/phase1/0013_atomic_user_warning.sql` - Migration file
- `features/moderation/actions.ts` - Updated warnUser function
- `db/migrations/phase1/0012_moderation_transaction.sql` - Similar pattern for content removal

## See Also
- PostgreSQL `INSERT...ON CONFLICT` documentation
- Migration 0012 for similar atomic transaction pattern
