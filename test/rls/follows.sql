-- RLS smoke tests for follows
-- Run in Supabase SQL editor; simulate auth via request.jwt.claim.sub

-- As Alice
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', true);

-- Alice can see rows where she is follower or followee
select count(*) as alice_visible_follows
from public.follows f
where f.follower_id = '11111111-1111-1111-1111-111111111111'
   or f.followee_id = '11111111-1111-1111-1111-111111111111';

-- Alice can follow Bob (idempotent)
insert into public.follows (follower_id, followee_id)
values ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222')
on conflict do nothing;

-- Alice cannot create a follow on behalf of Bob (should fail with policy)
insert into public.follows (follower_id, followee_id)
values ('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111');

-- As Bob
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222', true);

-- Bob can delete follows where he is follower (may affect 0..1 rows)
delete from public.follows
where follower_id = '22222222-2222-2222-2222-222222222222'
  and followee_id = '11111111-1111-1111-1111-111111111111';
