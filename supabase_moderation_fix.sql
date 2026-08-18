-- NeighborlyKC moderation system
-- Run once in Supabase SQL Editor before using the new admin menu.

alter table public.posts
  add column if not exists comments_locked boolean not null default false,
  add column if not exists is_pinned boolean not null default false,
  add column if not exists moderator_edited_at timestamptz,
  add column if not exists moderator_edited_by uuid references auth.users(id) on delete set null;

alter table public.profiles
  add column if not exists moderation_status text not null default 'active',
  add column if not exists muted_until timestamptz,
  add column if not exists banned_at timestamptz,
  add column if not exists warning_count integer not null default 0;

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid not null references auth.users(id) on delete restrict,
  target_user_id uuid references auth.users(id) on delete set null,
  post_id uuid references public.posts(id) on delete set null,
  action text not null,
  reason text not null check (char_length(trim(reason)) between 2 and 500),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists moderation_actions_target_idx on public.moderation_actions(target_user_id,created_at desc);
create index if not exists moderation_actions_post_idx on public.moderation_actions(post_id,created_at desc);
alter table public.moderation_actions enable row level security;

create or replace function public.is_neighborly_admin(check_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public
as $$
  select exists (
    select 1 from public.profiles p
    where p.auth_user_id=check_user
      and (coalesce(p.is_admin,false) or coalesce(p.is_founder,false))
  );
$$;

drop policy if exists "admins read moderation actions" on public.moderation_actions;
create policy "admins read moderation actions" on public.moderation_actions
for select to authenticated using (public.is_neighborly_admin());

drop policy if exists "admins create moderation actions" on public.moderation_actions;
create policy "admins create moderation actions" on public.moderation_actions
for insert to authenticated with check (public.is_neighborly_admin() and moderator_id=auth.uid());

drop policy if exists "admins update member moderation" on public.profiles;
create policy "admins update member moderation" on public.profiles
for update to authenticated using (public.is_neighborly_admin()) with check (public.is_neighborly_admin());

create or replace function public.apply_neighborly_moderation_action()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  if new.target_user_id is null then return new; end if;
  if new.action='warn' then
    update public.profiles set warning_count=coalesce(warning_count,0)+1 where auth_user_id=new.target_user_id;
  elsif new.action='mute' then
    update public.profiles set moderation_status='muted', muted_until=coalesce(new.expires_at,now()+interval '24 hours') where auth_user_id=new.target_user_id;
  elsif new.action='ban' then
    update public.profiles set moderation_status='banned', banned_at=now(), muted_until=null where auth_user_id=new.target_user_id;
  elsif new.action='unban' then
    update public.profiles set moderation_status='active', banned_at=null, muted_until=null where auth_user_id=new.target_user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists apply_neighborly_moderation_action on public.moderation_actions;
create trigger apply_neighborly_moderation_action
after insert on public.moderation_actions
for each row execute function public.apply_neighborly_moderation_action();

create or replace function public.enforce_neighborly_participation()
returns trigger language plpgsql security definer set search_path=public
as $$
declare member public.profiles%rowtype;
begin
  if public.is_neighborly_admin() then return new; end if;
  select * into member from public.profiles where auth_user_id=auth.uid() limit 1;
  if member.moderation_status='banned' then raise exception 'This account is banned from participating.'; end if;
  if member.muted_until is not null and member.muted_until>now() then raise exception 'This account is muted until %.',member.muted_until; end if;
  if tg_table_name='comments' and exists(select 1 from public.posts where id=new.post_id and comments_locked) then
    raise exception 'Comments are locked on this post.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_post_participation on public.posts;
create trigger enforce_post_participation before insert on public.posts
for each row execute function public.enforce_neighborly_participation();

drop trigger if exists enforce_comment_participation on public.comments;
create trigger enforce_comment_participation before insert on public.comments
for each row execute function public.enforce_neighborly_participation();

-- Admin/founder post updates and deletes (including pin and lock controls).
drop policy if exists "posts owner update" on public.posts;
create policy "posts owner update" on public.posts for update to authenticated
using (auth.uid()=user_id or public.is_neighborly_admin())
with check (auth.uid()=user_id or public.is_neighborly_admin());

drop policy if exists "posts owner delete" on public.posts;
create policy "posts owner delete" on public.posts for delete to authenticated
using (auth.uid()=user_id or public.is_neighborly_admin());
