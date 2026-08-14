-- Neighborly KC UI + post editing security migration
-- Run once in the Supabase SQL editor after the existing auth/schema fixes.

-- Posts remain publicly readable, but only the authenticated owner (or an admin/founder)
-- may update or delete a post. This backs the Edit/Delete controls with database RLS.
alter table public.posts enable row level security;

drop policy if exists "posts public read" on public.posts;
create policy "posts public read" on public.posts
  for select using (true);

drop policy if exists "posts authenticated insert" on public.posts;
create policy "posts authenticated insert" on public.posts
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "posts owner update" on public.posts;
create policy "posts owner update" on public.posts
  for update to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.auth_user_id = auth.uid()
        and (coalesce(p.is_admin, false) or coalesce(p.is_founder, false))
    )
  )
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.auth_user_id = auth.uid()
        and (coalesce(p.is_admin, false) or coalesce(p.is_founder, false))
    )
  );

drop policy if exists "posts owner delete" on public.posts;
create policy "posts owner delete" on public.posts
  for delete to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.auth_user_id = auth.uid()
        and (coalesce(p.is_admin, false) or coalesce(p.is_founder, false))
    )
  );
