-- Phase 1 RLS policies (minimal, idempotent)

-- Enable RLS
alter table public.users enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.git_accounts enable row level security;
alter table public.repos enable row level security;
alter table public.notifications enable row level security;

-- USERS
drop policy if exists users_select on public.users;
create policy users_select on public.users
  for select using (
    is_public = true or id = auth.uid()
  );

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
  for update using (id = auth.uid());

-- POSTS
drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts
  for select using (
    -- own posts
    user_id = auth.uid()
    or
    -- posts by followees
    exists (
      select 1 from public.follows f
      where f.follower_id = auth.uid() and f.followee_id = posts.user_id
    )
    or
    -- public authors
    exists (
      select 1 from public.users u
      where u.id = posts.user_id and u.is_public = true
    )
  );

drop policy if exists posts_insert_self on public.posts;
create policy posts_insert_self on public.posts
  for insert with check (user_id = auth.uid());

drop policy if exists posts_update_self on public.posts;
create policy posts_update_self on public.posts
  for update using (user_id = auth.uid());

-- COMMENTS
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments
  for select using (
    -- allowed if parent post is visible by posts_select logic
    exists (
      select 1
      from public.posts p
      join public.users u on u.id = p.user_id
      where p.id = comments.post_id
        and (
          p.user_id = auth.uid()
          or exists (
            select 1 from public.follows f
            where f.follower_id = auth.uid() and f.followee_id = p.user_id
          )
          or u.is_public = true
        )
    )
  );

drop policy if exists comments_insert_self on public.comments;
create policy comments_insert_self on public.comments
  for insert with check (user_id = auth.uid());

drop policy if exists comments_update_self on public.comments;
create policy comments_update_self on public.comments
  for update using (user_id = auth.uid());

-- FOLLOWS
drop policy if exists follows_select on public.follows;
create policy follows_select on public.follows
  for select using (
    follower_id = auth.uid() or followee_id = auth.uid()
  );

drop policy if exists follows_insert_self on public.follows;
create policy follows_insert_self on public.follows
  for insert with check (follower_id = auth.uid());

drop policy if exists follows_delete_self on public.follows;
create policy follows_delete_self on public.follows
  for delete using (follower_id = auth.uid());

-- GIT ACCOUNTS
drop policy if exists git_accounts_select on public.git_accounts;
create policy git_accounts_select on public.git_accounts
  for select using (user_id = auth.uid());

drop policy if exists git_accounts_insert_self on public.git_accounts;
create policy git_accounts_insert_self on public.git_accounts
  for insert with check (user_id = auth.uid());

-- REPOS
drop policy if exists repos_select on public.repos;
create policy repos_select on public.repos
  for select using (user_id = auth.uid());

drop policy if exists repos_insert_self on public.repos;
create policy repos_insert_self on public.repos
  for insert with check (user_id = auth.uid());

-- NOTIFICATIONS
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists notifications_insert_self on public.notifications;
create policy notifications_insert_self on public.notifications
  for insert with check (user_id = auth.uid());
