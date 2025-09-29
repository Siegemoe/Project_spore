-- RUN AS OWNER (postgres/supabase_admin) IN SUPABASE SQL EDITOR
-- Purpose: Create RLS policies on storage.objects for public read and user-scoped writes.
-- Idempotent via DROP ... IF EXISTS + CREATE.

-- Ensure RLS is enabled on storage.objects
alter table if exists storage.objects enable row level security;

-- Public READ for media-public bucket
drop policy if exists storage_media_public_read on storage.objects;
create policy storage_media_public_read
  on storage.objects
  for select
  using (bucket_id = 'media-public');

-- Authenticated INSERT limited to own prefix: {auth.uid()}/...
drop policy if exists storage_media_user_insert on storage.objects;
create policy storage_media_user_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'media-public'
    and position((auth.uid()::text || '/') in name) = 1
  );

-- Authenticated UPDATE limited to own prefix
drop policy if exists storage_media_user_update on storage.objects;
create policy storage_media_user_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'media-public'
    and position((auth.uid()::text || '/') in name) = 1
  );

-- Authenticated DELETE limited to own prefix
drop policy if exists storage_media_user_delete on storage.objects;
create policy storage_media_user_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'media-public'
    and position((auth.uid()::text || '/') in name) = 1
  );

-- Verification: after running this file, call our API endpoint:
--   GET /api/storage/debug
-- It should return:
--   { "rls_enabled": true, "policies": [ ... four policies above ... ] }
