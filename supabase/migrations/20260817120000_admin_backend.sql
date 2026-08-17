-- ADMIN BACKEND ------------------------------------------------------------
-- 1) Admin-gated user listing (exposes id + email + roles from auth.users,
--    which PostgREST cannot read directly). Security definer runs as the table
--    owner (bypasses RLS) but only returns rows when the caller is an admin.
create or replace function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  created_at timestamptz,
  roles text[]
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.id, u.email, u.created_at,
         coalesce(array_agg(ur.role::text order by ur.role) filter (where ur.role is not null), '{}'::text[])
  from auth.users u
  left join public.user_roles ur on ur.user_id = u.id
  where exists (
    select 1 from public.user_roles r
    where r.user_id = auth.uid() and r.role = 'admin'
  )
  group by u.id, u.email, u.created_at
  order by u.created_at desc;
$$;

grant execute on function public.admin_list_users() to authenticated;

-- 2) Grant the admin role to the requested account. Idempotent: resolves the
--    uuid from auth.users by email and inserts the role if (and only if) the
--    account already exists.
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'janleoegamen6@gmail.com'
on conflict (user_id, role) do nothing;