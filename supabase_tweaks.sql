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

-- Admin user blocking
create table if not exists public.user_blocks (
  id uuid default gen_random_uuid() primary key,
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  constraint user_blocks_no_self check (blocker_id <> blocked_id)
);
create unique index if not exists user_blocks_pair_idx on public.user_blocks(blocker_id, blocked_id);
alter table public.user_blocks enable row level security;
drop policy if exists "blocks own read" on public.user_blocks;
create policy "blocks own read" on public.user_blocks for select to authenticated using (auth.uid() = blocker_id);
drop policy if exists "admin blocks insert" on public.user_blocks;
create policy "admin blocks insert" on public.user_blocks for insert to authenticated with check (
  auth.uid() = blocker_id and exists (select 1 from public.profiles p where p.auth_user_id=auth.uid() and (coalesce(p.is_admin,false) or coalesce(p.is_founder,false)))
);
drop policy if exists "admin blocks delete" on public.user_blocks;
create policy "admin blocks delete" on public.user_blocks for delete to authenticated using (
  auth.uid() = blocker_id and exists (select 1 from public.profiles p where p.auth_user_id=auth.uid() and (coalesce(p.is_admin,false) or coalesce(p.is_founder,false)))
);
