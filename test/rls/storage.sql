-- Storage RLS smoke tests
-- Run in Supabase SQL editor (or psql) as the storage owner role.
-- These statements exercise the policies installed via db/policies/phase1/0004_storage_policies_install.sql.

-- Helpers -------------------------------------------------------------------

-- Reset session to unauthenticated (simulate anon)
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', null, true);

-- Public read should succeed (even if result is zero rows)
select count(*) as anon_media_public_rows
from storage.objects
where bucket_id = 'media-public';

-- Authenticated user (Alice) -------------------------------------------------

select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

-- Alice can upload into her own prefix
insert into storage.objects (bucket_id, name, owner, metadata)
values (
  'media-public',
  '11111111-1111-1111-1111-111111111111/storage-smoke-alice.txt',
  '11111111-1111-1111-1111-111111111111',
  '{"mimeType":"text/plain"}'::jsonb
)
returning id;

-- Alice cannot upload into Bob's prefix (should ERROR with RLS violation)
-- insert into storage.objects (bucket_id, name, owner)
-- values (
--   'media-public',
--   '22222222-2222-2222-2222-222222222222/illegal.txt',
--   '11111111-1111-1111-1111-111111111111'
-- );

-- Alice can update her own object metadata
update storage.objects
set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('touched_by', 'alice')
where bucket_id = 'media-public'
  and name = '11111111-1111-1111-1111-111111111111/storage-smoke-alice.txt'
returning id;

-- Alice cannot delete Bob's objects (should affect 0 rows)
delete from storage.objects
where bucket_id = 'media-public'
  and name like '22222222-2222-2222-2222-222222222222/%';

-- Cleanup Alice's smoke object so the script is idempotent
delete from storage.objects
where bucket_id = 'media-public'
  and name = '11111111-1111-1111-1111-111111111111/storage-smoke-alice.txt';

-- Authenticated user (Bob) ---------------------------------------------------

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);

-- Bob can insert under his prefix
insert into storage.objects (bucket_id, name, owner)
values (
  'media-public',
  '22222222-2222-2222-2222-222222222222/storage-smoke-bob.txt',
  '22222222-2222-2222-2222-222222222222'
)
returning id;

-- Bob cannot update Alice's objects (should affect 0 rows)
update storage.objects
set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('touched_by', 'bob_illegal')
where bucket_id = 'media-public'
  and name like '11111111-1111-1111-1111-111111111111/%';

-- Cleanup Bob's smoke object
delete from storage.objects
where bucket_id = 'media-public'
  and name = '22222222-2222-2222-2222-222222222222/storage-smoke-bob.txt';
