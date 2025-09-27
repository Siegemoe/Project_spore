-- Storage RLS for media uploads (idempotent)
-- Allows public READ on media-public and authenticated users to WRITE
-- only under their own {auth.uid()}/... path.

-- Enable RLS (safe if already enabled)
alter table if exists storage.objects enable row level security;

-- Public READ for media-public
drop policy if exists storage_media_public_read on storage.objects;
create policy storage_media_public_read
  on storage.objects
  for select
  using (bucket_id = 'media-public');

-- Authenticated INSERT under user prefix
drop policy if exists storage_media_user_insert on storage.objects;
create policy storage_media_user_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'media-public'
    and position((auth.uid()::text || '/') in name) = 1
  );

-- Authenticated UPDATE limited to own objects
drop policy if exists storage_media_user_update on storage.objects;
create policy storage_media_user_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'media-public'
    and position((auth.uid()::text || '/') in name) = 1
  );

-- Authenticated DELETE limited to own objects
drop policy if exists storage_media_user_delete on storage.objects;
create policy storage_media_user_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'media-public'
    and position((auth.uid()::text || '/') in name) = 1
  );
