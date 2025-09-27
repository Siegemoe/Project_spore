-- Phase 1 Demo Seed (idempotent)
-- NOTE: Uses fixed UUIDs for repeatability. Safe to re-run.

-- Users
insert into public.users (id, handle, display_name, avatar_url, bio, is_public)
values 
  ('11111111-1111-1111-1111-111111111111', 'alice', 'Alice', null, null, true),
  ('22222222-2222-2222-2222-222222222222', 'bob',   'Bob',   null, null, true)
on conflict (id) do nothing;

-- Follows (alice follows bob)
insert into public.follows (follower_id, followee_id)
values ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
on conflict do nothing;

-- Posts (2 each)
insert into public.posts (id, user_id, caption, media_url, media_type)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1','11111111-1111-1111-1111-111111111111','hello from alice', null, null),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2','11111111-1111-1111-1111-111111111111','another from alice', null, null),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1','22222222-2222-2222-2222-222222222222','hello from bob', null, null),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2','22222222-2222-2222-2222-222222222222','another from bob', null, null)
on conflict (id) do nothing;

-- Comments (on first alice/bob posts)
insert into public.comments (id, post_id, user_id, body)
values
  ('cccccccc-cccc-cccc-cccc-ccccccccccc1','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1','11111111-1111-1111-1111-111111111111','alice self-comment'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc2','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1','11111111-1111-1111-1111-111111111111','alice to bob')
on conflict (id) do nothing;
