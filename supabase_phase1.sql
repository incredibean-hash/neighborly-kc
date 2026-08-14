
-- Neighborly KC Phase 1: community identity, DMs, notifications, profiles
-- Run this in Supabase SQL Editor AFTER the original supabase.sql.

create extension if not exists pgcrypto;

alter table profiles
  add column if not exists auth_user_id uuid references auth.users(id) on delete cascade;
create unique index if not exists profiles_auth_user_id_key on profiles(auth_user_id);

alter table posts
  add column if not exists user_id uuid references auth.users(id) on delete set null;

alter table comments
  add column if not exists author_id uuid references auth.users(id) on delete set null;

alter table likes
  add column if not exists author_id uuid references auth.users(id) on delete set null;

alter table dms
  add column if not exists from_user_id uuid references auth.users(id) on delete cascade;
alter table dms
  add column if not exists to_user_id uuid references auth.users(id) on delete cascade;

create index if not exists dms_from_user_id_idx on dms(from_user_id, created_at desc);
create index if not exists dms_to_user_id_idx on dms(to_user_id, created_at desc);
create index if not exists posts_user_id_idx on posts(user_id);
create index if not exists comments_author_id_idx on comments(author_id);
create index if not exists likes_author_id_idx on likes(author_id);

create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  type text not null,
  post_id uuid references posts(id) on delete cascade,
  comment_id uuid references comments(id) on delete cascade,
  dm_id uuid references dms(id) on delete cascade,
  message text not null,
  read_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists notifications_user_created_idx
  on notifications(user_id, created_at desc);

-- Profiles: public directory, but only owners can create/update their own profile.
alter table profiles enable row level security;
drop policy if exists "profiles public read" on profiles;
create policy "profiles public read" on profiles for select using (true);
drop policy if exists "profiles own insert" on profiles;
create policy "profiles own insert" on profiles for insert with check (auth.uid() = auth_user_id);
drop policy if exists "profiles own update" on profiles;
create policy "profiles own update" on profiles for update using (auth.uid() = auth_user_id) with check (auth.uid() = auth_user_id);

-- DMs: only participants can read/write.
alter table dms enable row level security;
drop policy if exists "dm participants read" on dms;
create policy "dm participants read" on dms for select
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);
drop policy if exists "dm sender insert" on dms;
create policy "dm sender insert" on dms for insert
  with check (auth.uid() = from_user_id);

-- Notifications: recipients can read/update; server/database triggers create them.
alter table notifications enable row level security;
drop policy if exists "notification own read" on notifications;
create policy "notification own read" on notifications for select using (auth.uid() = user_id);
drop policy if exists "notification own update" on notifications;
create policy "notification own update" on notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Enable realtime for the tables used by the app. If a table is already in the
-- publication, the DO blocks avoid failing the migration.
do $$
begin
  begin alter publication supabase_realtime add table dms; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table notifications; exception when duplicate_object then null; end;
end $$;

-- Notification trigger for new DMs.
create or replace function notify_new_dm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_name text;
begin
  select full_name into sender_name from profiles where auth_user_id = new.from_user_id limit 1;
  insert into notifications(user_id, actor_id, type, dm_id, message)
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

drop trigger if exists trg_notify_new_dm on dms;
create trigger trg_notify_new_dm
after insert on dms
for each row execute function notify_new_dm();

-- Notification trigger for comments.
create or replace function notify_new_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_owner uuid;
  commenter text;
begin
  select user_id into post_owner from posts where id = new.post_id limit 1;
  if post_owner is not null and post_owner <> new.author_id then
    select full_name into commenter from profiles where auth_user_id = new.author_id limit 1;
    insert into notifications(user_id, actor_id, type, post_id, comment_id, message)
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

drop trigger if exists trg_notify_new_comment on comments;
create trigger trg_notify_new_comment
after insert on comments
for each row execute function notify_new_comment();

-- Notification trigger for likes.
create or replace function notify_new_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_owner uuid;
  liker text;
begin
  if new.post_id is null then return new; end if;
  select user_id into post_owner from posts where id = new.post_id limit 1;
  if post_owner is not null and post_owner <> new.author_id then
    select full_name into liker from profiles where auth_user_id = new.author_id limit 1;
    insert into notifications(user_id, actor_id, type, post_id, message)
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

drop trigger if exists trg_notify_new_like on likes;
create trigger trg_notify_new_like
after insert on likes
for each row execute function notify_new_like();
