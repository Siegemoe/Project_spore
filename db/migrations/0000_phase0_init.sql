-- Phase 0 init: waitlist + base extensions
-- Safe to run multiple times on staging/dev

-- Required for case-insensitive text
create extension if not exists citext;

-- Required for gen_random_uuid()
create extension if not exists pgcrypto;

-- Waitlist signups table
create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  handle citext unique,
  publish_interest boolean not null default false,
  created_at timestamptz not null default now()
);

-- Enable RLS (no anon read). Inserts will be performed by service role via API.
alter table public.waitlist_signups enable row level security;

comment on table public.waitlist_signups is
  'Landing page waitlist. Inserted via server-side API using service role.';
comment on column public.waitlist_signups.publish_interest is
  'Whether the user indicated they want to publish MCPs.';
