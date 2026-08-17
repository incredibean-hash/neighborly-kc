-- Neighborly KC: canonical production fix migration
-- Run this file ONCE, by itself, in Supabase SQL Editor.
-- It is intentionally additive/idempotent for the existing production schema.
-- Do NOT run supabase_phase3.sql or the older connection-trigger snippets first.

-- This migration is designed for the database as it exists now.
-- It ADDS missing columns to existing tables instead of relying on
-- "create table if not exists", which does not modify an existing table.
--
-- Run this file by itself in Supabase SQL Editor.

create extension if not exists pgcrypto;

-- ============================================================
-- PROFILES: connect the existing profile rows to Supabase Auth
-- ============================================================
alter table public.profiles
  add column if not exists auth_user_id uuid references auth.users(id) on delete cascade;

create unique index if not exists profiles_auth_user_id_key
  on public.profiles(auth_user_id)
  where auth_user_id is not null;

-- If the old uid column already contains UUID strings, safely backfill it.
update public.profiles
set auth_user_id = uid::uuid
where auth_user_id is null
  and uid is not null
  and uid ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

alter table public.profiles
  add column if not exists is_admin boolean default false;

-- VERIFIED BADGE COMPATIBILITY
-- Some production databases use the legacy `verified` column while the app
-- uses `is_verified`. Add the app column and backfill it when `verified` exists.
alter table public.profiles
  add column if not exists is_verified boolean default false;

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='profiles' and column_name='verified') then
    execute 'update public.profiles set is_verified = coalesce(verified,false) where is_verified is distinct from coalesce(verified,false)';
  end if;
end $$;

-- ============================================================
-- DMs: keep the old text columns, add real auth UUID columns
-- ============================================================
alter table public.dms
  add column if not exists from_user_id uuid references auth.users(id) on delete cascade;

alter table public.dms
  add column if not exists to_user_id uuid references auth.users(id) on delete cascade;

create index if not exists dms_from_user_id_idx
  on public.dms(from_user_id, created_at desc);

create index if not exists dms_to_user_id_idx
  on public.dms(to_user_id, created_at desc);

-- Backfill only when the legacy text value is a UUID.
update public.dms
set from_user_id = from_user::uuid
where from_user_id is null
  and from_user is not null
  and from_user ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

update public.dms
set to_user_id = to_user::uuid
where to_user_id is null
  and to_user is not null
  and to_user ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

-- ============================================================
-- CONNECTIONS: your existing table only had id + created_at.
-- Add the columns the People/Connections app already expects.
-- ============================================================
alter table public.connections
  add column if not exists requester_id uuid references auth.users(id) on delete cascade;

alter table public.connections
  add column if not exists addressee_id uuid references auth.users(id) on delete cascade;

alter table public.connections
  add column if not exists status text default 'pending';

alter table public.connections
  add column if not exists updated_at timestamptz default now();

update public.connections
set status = 'pending'
where status is null;

create index if not exists connections_requester_idx
  on public.connections(requester_id, status);

create index if not exists connections_addressee_idx
  on public.connections(addressee_id, status);

create unique index if not exists connections_unique_undirected_pair_idx
  on public.connections (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
  )
  where requester_id is not null and addressee_id is not null;

do $$
begin
  begin
    alter table public.connections
      add constraint connections_status_check
      check (status in ('pending','accepted','declined'));
  exception when duplicate_object then null;
  end;
end $$;

-- ============================================================
-- POSTS / COMMENTS / LIKES: auth ownership columns
-- ============================================================
alter table public.posts
  add column if not exists user_id uuid references auth.users(id) on delete set null;

alter table public.comments
  add column if not exists author_id uuid references auth.users(id) on delete set null;

alter table public.likes
  add column if not exists author_id uuid references auth.users(id) on delete set null;

create index if not exists posts_user_id_idx on public.posts(user_id);
create index if not exists comments_author_id_idx on public.comments(author_id);
create index if not exists likes_author_id_idx on public.likes(author_id);

-- Remove duplicate authenticated likes before unique indexes.
delete from public.likes a
using public.likes b
where a.id > b.id
  and a.author_id is not null
  and a.post_id is not null
  and a.author_id = b.author_id
  and a.post_id = b.post_id;

delete from public.likes a
using public.likes b
where a.id > b.id
  and a.author_id is not null
  and a.comment_id is not null
  and a.author_id = b.author_id
  and a.comment_id = b.comment_id;

create unique index if not exists likes_one_post_like_per_user
  on public.likes(author_id, post_id)
  where author_id is not null and post_id is not null;

create unique index if not exists likes_one_comment_like_per_user
  on public.likes(author_id, comment_id)
  where author_id is not null and comment_id is not null;

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  type text not null,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  dm_id uuid references public.dms(id) on delete cascade,
  message text not null,
  read_at timestamptz,
  created_at timestamptz default now()
);

alter table public.notifications
  add column if not exists actor_id uuid references auth.users(id) on delete set null;
alter table public.notifications
  add column if not exists type text;
alter table public.notifications
  add column if not exists post_id uuid references public.posts(id) on delete cascade;
alter table public.notifications
  add column if not exists comment_id uuid references public.comments(id) on delete cascade;
alter table public.notifications
  add column if not exists dm_id uuid references public.dms(id) on delete cascade;
alter table public.notifications
  add column if not exists message text;
alter table public.notifications
  add column if not exists read_at timestamptz;
alter table public.notifications
  add column if not exists created_at timestamptz default now();

create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);

-- ============================================================
-- RLS
-- ============================================================
alter table public.profiles enable row level security;
drop policy if exists "profiles public read" on public.profiles;
create policy "profiles public read" on public.profiles for select using (true);

drop policy if exists "profiles own insert" on public.profiles;
create policy "profiles own insert" on public.profiles
  for insert with check (auth.uid() = auth_user_id);

drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update" on public.profiles
  for update using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

alter table public.likes enable row level security;
drop policy if exists "likes public read" on public.likes;
create policy "likes public read" on public.likes for select using (true);

drop policy if exists "likes own insert" on public.likes;
create policy "likes own insert" on public.likes
  for insert with check (auth.uid() = author_id);

drop policy if exists "likes own delete" on public.likes;
create policy "likes own delete" on public.likes
  for delete using (auth.uid() = author_id);

alter table public.dms enable row level security;
drop policy if exists "dm participants read" on public.dms;
create policy "dm participants read" on public.dms for select
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

drop policy if exists "dm sender insert" on public.dms;
create policy "dm sender insert" on public.dms for insert
  with check (auth.uid() = from_user_id);

alter table public.connections enable row level security;
drop policy if exists "connections participants read" on public.connections;
create policy "connections participants read" on public.connections
  for select using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "connections requester insert" on public.connections;
create policy "connections requester insert" on public.connections
  for insert with check (auth.uid() = requester_id);

drop policy if exists "connections participant update" on public.connections;
create policy "connections participant update" on public.connections
  for update using (auth.uid() = requester_id or auth.uid() = addressee_id)
  with check (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "connections participant delete" on public.connections;
create policy "connections participant delete" on public.connections
  for delete using (auth.uid() = requester_id or auth.uid() = addressee_id);

alter table public.notifications enable row level security;
drop policy if exists "notification own read" on public.notifications;
create policy "notification own read" on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists "notification own update" on public.notifications;
create policy "notification own update" on public.notifications
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- ADMIN / POST LIMIT
-- Admins and founders are unlimited. Everyone else: 5 / 24h.
-- ============================================================
create or replace function public.enforce_neighborly_post_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_user boolean := false;
  recent_posts integer := 0;
begin
  select coalesce(is_admin, false) or coalesce(is_founder, false)
    into admin_user
  from public.profiles
  where auth_user_id = auth.uid()
  limit 1;

  if admin_user then
    return new;
  end if;

  select count(*) into recent_posts
  from public.posts
  where user_id = auth.uid()
    and created_at >= now() - interval '24 hours';

  if recent_posts >= 5 then
    raise exception 'POST_LIMIT: You can make up to 5 posts in 24 hours.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_neighborly_post_limit on public.posts;
create trigger trg_neighborly_post_limit
before insert on public.posts
for each row execute function public.enforce_neighborly_post_limit();

-- ============================================================
-- Notification triggers
-- ============================================================
create or replace function public.notify_new_connection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requester_name text;
begin
  if new.requester_id is null or new.addressee_id is null then
    return new;
  end if;

  select full_name into requester_name
  from public.profiles
  where auth_user_id = new.requester_id
  limit 1;

  insert into public.notifications(user_id, actor_id, type, message)
  values (
    new.addressee_id,
    new.requester_id,
    'connection',
    coalesce(requester_name, 'A neighbor') || ' wants to connect with you'
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_new_connection on public.connections;
create trigger trg_notify_new_connection
after insert on public.connections
for each row execute function public.notify_new_connection();

create or replace function public.notify_new_dm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare sender_name text;
begin
  if new.from_user_id is null or new.to_user_id is null then
    return new;
  end if;

  select full_name into sender_name
  from public.profiles
  where auth_user_id = new.from_user_id
  limit 1;

  insert into public.notifications(user_id, actor_id, type, dm_id, message)
  values (
    new.to_user_id,
    new.from_user_id,
    'message',
    new.id,
    coalesce(sender_name, 'A neighbor') || ' sent you a message'
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_new_dm on public.dms;
create trigger trg_notify_new_dm
after insert on public.dms
for each row execute function public.notify_new_dm();

create or replace function public.notify_new_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare post_owner uuid; commenter text;
begin
  select user_id into post_owner from public.posts where id = new.post_id limit 1;
  if post_owner is not null and post_owner <> new.author_id then
    select full_name into commenter from public.profiles where auth_user_id = new.author_id limit 1;
    insert into public.notifications(user_id, actor_id, type, post_id, comment_id, message)
    values (
      post_owner,
      new.author_id,
      'comment',
      new.post_id,
      new.id,
      coalesce(commenter, 'A neighbor') || ' commented on your post'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_new_comment on public.comments;
create trigger trg_notify_new_comment
after insert on public.comments
for each row execute function public.notify_new_comment();

create or replace function public.notify_new_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare post_owner uuid; liker text;
begin
  if new.post_id is null then return new; end if;
  select user_id into post_owner from public.posts where id = new.post_id limit 1;
  if post_owner is not null and post_owner <> new.author_id then
    select full_name into liker from public.profiles where auth_user_id = new.author_id limit 1;
    insert into public.notifications(user_id, actor_id, type, post_id, message)
    values (
      post_owner,
      new.author_id,
      'like',
      new.post_id,
      coalesce(liker, 'A neighbor') || ' liked your post'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_new_like on public.likes;
create trigger trg_notify_new_like
after insert on public.likes
for each row execute function public.notify_new_like();

-- Realtime
do $$
begin
  begin alter publication supabase_realtime add table public.dms; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.notifications; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.connections; exception when duplicate_object then null; end;
end $$;

-- IMPORTANT:
-- If the account that should be unlimited is not already marked is_founder=true,
-- set is_admin=true for that profile using its Supabase Auth UUID:
-- update public.profiles set is_admin = true where auth_user_id = 'YOUR-AUTH-USER-UUID';

-- ============================================================
-- OPTIONAL: mark the admin account unlimited
-- Replace the UUID with the Supabase Auth user UUID for the admin.
-- ============================================================
-- update public.profiles
-- set is_admin = true
-- where auth_user_id = 'YOUR-AUTH-USER-UUID';

-- ============================================================
-- POST EDITING RLS (added with UI polish pass)
-- ============================================================
alter table public.posts enable row level security;
drop policy if exists "posts public read" on public.posts;
create policy "posts public read" on public.posts for select using (true);
drop policy if exists "posts authenticated insert" on public.posts;
create policy "posts authenticated insert" on public.posts for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "posts owner update" on public.posts;
create policy "posts owner update" on public.posts for update to authenticated
  using (auth.uid() = user_id or exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and (coalesce(p.is_admin,false) or coalesce(p.is_founder,false))))
  with check (auth.uid() = user_id or exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and (coalesce(p.is_admin,false) or coalesce(p.is_founder,false))));
drop policy if exists "posts owner delete" on public.posts;
create policy "posts owner delete" on public.posts for delete to authenticated
  using (auth.uid() = user_id or exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and (coalesce(p.is_admin,false) or coalesce(p.is_founder,false))));


-- ============================================================
-- ADMIN USER BLOCKING
-- ============================================================
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
