-- Introspection helper: returns RLS status and policies for storage.objects
-- Safe to run multiple times (CREATE OR REPLACE).

create or replace function public.debug_storage_policies()
returns jsonb
language sql
security definer
set search_path = pg_catalog, public
as $$
  with obj as (
    select c.relrowsecurity as rls_enabled, c.oid as relid
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'storage' and c.relname = 'objects'
    limit 1
  ),
  pol as (
    select
      p.polname,
      p.polcmd,
      pg_get_expr(p.polqual, p.polrelid)       as using_expr,
      pg_get_expr(p.polwithcheck, p.polrelid)  as with_check_expr,
      (select jsonb_agg(r.rolname order by r.rolname)
         from pg_authid r
        where r.oid = any(p.polroles))         as roles
    from pg_policy p
    join obj o on o.relid = p.polrelid
  )
  select jsonb_build_object(
    'rls_enabled', coalesce((select rls_enabled from obj), false),
    'policies',    coalesce((select jsonb_agg(jsonb_build_object(
                      'name', polname,
                      'command', polcmd,
                      'using', using_expr,
                      'with_check', with_check_expr,
                      'roles', roles
                    ) order by polname) from pol), '[]'::jsonb)
  );
$$;

-- Allow calling from app server or locally; read-only metadata
grant execute on function public.debug_storage_policies() to anon, authenticated, service_role;
