-- RLS smoke tests for posts
-- Run in Supabase SQL editor. It simulates auth via request.jwt.claim.sub

-- As Alice
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', true);

-- Alice can see own posts
select count(*) as alice_own_posts
from public.posts
where user_id = '11111111-1111-1111-1111-111111111111';

-- Alice can see followees' posts (expects Bob's posts because Alice follows Bob in seeds)
select count(*) as alice_followees_posts
from public.posts p
where exists (
  select 1 from public.follows f
  where f.follower_id = '11111111-1111-1111-1111-111111111111'
    and f.followee_id = p.user_id
);

-- Alice can insert her own post (should succeed)
insert into public.posts (user_id, caption) values
('11111111-1111-1111-1111-111111111111', 'alice smoke insert')
returning id;

-- Alice cannot update Bob's post (should affect 0 rows)
update public.posts
set caption = 'illegal edit by alice'
where user_id = '22222222-2222-2222-2222-222222222222';

-- As Bob
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222', true);

-- Bob cannot update Alice's post (should affect 0 rows)
update public.posts
set caption = 'illegal edit by bob'
where user_id = '11111111-1111-1111-1111-111111111111';
