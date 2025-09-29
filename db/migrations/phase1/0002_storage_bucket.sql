-- Phase 1: Ensure media-public storage bucket exists (idempotent)
-- This creates a public bucket used for user-uploaded media.
-- Safe to run multiple times.

insert into storage.buckets (id, name, public)
select 'media-public', 'media-public', true
where not exists (select 1 from storage.buckets where id = 'media-public');
