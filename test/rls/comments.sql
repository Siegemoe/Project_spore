-- RLS smoke tests for comments
-- Run in Supabase SQL editor; simulate auth via request.jwt.claim.sub

-- As Alice
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', true);

-- Alice can read comments on posts she can see (includes Bob's first post)
select count(*) as alice_visible_comments
from public.comments c
join public.posts p on p.id = c.post_id
where
  p.user_id = '11111111-1111-1111-1111-111111111111'
  or exists (
    select 1 from public.follows f
    where f.follower_id = '11111111-1111-1111-1111-111111111111'
      and f.followee_id = p.user_id
  )
  or exists (
    select 1 from public.users u
    where u.id = p.user_id and u.is_public = true
  );

-- Alice can insert a comment as herself on Bob's post (visible via follow)
insert into public.comments (post_id, user_id, body) values
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1','11111111-1111-1111-1111-111111111111','alice comment smoke')
returning id;

-- Alice cannot update Bob's comment (should affect 0 rows)
update public.comments
set body = 'illegal edit by alice'
where user_id = '22222222-2222-2222-2222-222222222222';

-- As Bob
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222', true);

-- Bob cannot update Alice's comment (should affect 0 rows)
update public.comments
set body = 'illegal edit by bob'
where user_id = '11111111-1111-1111-1111-111111111111';
