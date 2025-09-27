-- Phase 1 Core Schema (idempotent)
-- Safe to apply multiple times

-- Extensions
create extension if not exists citext;
create extension if not exists pgcrypto;

-- users (app profile, separate from auth.users)
create table if not exists public.users (
  id uuid primary key, -- equals auth.users.id
  handle citext unique,
  display_name text,
  avatar_url text,
  bio text,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

-- posts
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  caption text,
  media_url text,
  media_type text check (media_type in ('image','video')),
  created_at timestamptz not null default now()
);

-- comments
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- follows
create table if not exists public.follows (
  follower_id uuid not null references public.users(id) on delete cascade,
  followee_id uuid not null references public.users(id) on delete cascade,
  is_accepted boolean not null default true,
  created_at timestamptz not null default now(),
  constraint follows_pk primary key (follower_id, followee_id),
  constraint follows_no_self_follow check (follower_id <> followee_id)
);

-- git_accounts
create table if not exists public.git_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  github_login text,
  github_user_id text,
  connected_at timestamptz not null default now()
);

-- repos
create table if not exists public.repos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider text not null check (provider in ('github')),
  repo_full_name text not null,
  visibility text not null check (visibility in ('public','private')),
  connected_at timestamptz not null default now()
);

-- notifications (minimal)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  payload_json jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

-- Indexes
create index if not exists idx_posts_user_created_at on public.posts (user_id, created_at desc);
create index if not exists idx_comments_post_created_at on public.comments (post_id, created_at asc);
create index if not exists idx_repos_user on public.repos (user_id);
-- follows already has PK (follower_id, followee_id)

-- Publication for realtime (no-op if already present)
do $$
begin
  -- add tables to supabase_realtime publication if exists
  perform 1 from pg_publication where pubname = 'supabase_realtime';
  if found then
    begin
      execute 'alter publication supabase_realtime add table public.posts';
    exception when others then
      -- ignore if already added
      null;
    end;
    begin
      execute 'alter publication supabase_realtime add table public.comments';
    exception when others then
      null;
    end;
  end if;
end$$;
