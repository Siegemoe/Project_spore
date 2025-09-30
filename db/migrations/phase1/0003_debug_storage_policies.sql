-- Phase 1: install debug helper to inspect storage.objects RLS policies
-- Uses pg_policies (non-superuser) and pg_class to report status. Idempotent.
create or replace function public.debug_storage_policies()
returns jsonb
language sql
security definer
set search_path = public
as $$
  with obj as (
    select c.relrowsecurity as rls_enabled
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'storage' and c.relname = 'objects'
    limit 1
  ),
  pol as (
    select
      policyname as name,
      cmd        as command,
      qual       as using_expr,
      with_check as with_check_expr,
      roles
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
  )
  select jsonb_build_object(
    'rls_enabled', coalesce((select rls_enabled from obj), false),
    'policies',    coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', name,
        'command', command,
        'using', using_expr,
        'with_check', with_check_expr,
        'roles', roles
      ) order by name)
      from pol
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.debug_storage_policies() to anon, authenticated, service_role;
