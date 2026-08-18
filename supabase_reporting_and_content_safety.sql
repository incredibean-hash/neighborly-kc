-- NeighborlyKC post reporting and basic server-side text safety.
-- Run once in Supabase SQL Editor after supabase_moderation_fix.sql.

create table if not exists public.post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in (
    'Harassment or bullying','Hate or abusive language','Threats or violence',
    'Sexual or inappropriate content','Spam or scam','Private information','Other'
  )),
  details text check (details is null or char_length(details) <= 500),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(post_id,reporter_id)
);

create index if not exists post_reports_status_idx on public.post_reports(status,created_at desc);
create index if not exists post_reports_post_idx on public.post_reports(post_id,created_at desc);
alter table public.post_reports enable row level security;

drop policy if exists "members submit post reports" on public.post_reports;
create policy "members submit post reports" on public.post_reports
for insert to authenticated
with check (reporter_id=auth.uid() and not public.is_neighborly_admin());

drop policy if exists "members read own post reports" on public.post_reports;
create policy "members read own post reports" on public.post_reports
for select to authenticated
using (reporter_id=auth.uid() or public.is_neighborly_admin());

drop policy if exists "admins update post reports" on public.post_reports;
create policy "admins update post reports" on public.post_reports
for update to authenticated
using (public.is_neighborly_admin())
with check (public.is_neighborly_admin());

-- Conservative phrase filter. This is a backstop, not a replacement for reports
-- and moderator review. It runs in Supabase so it cannot be bypassed in the browser.
create or replace function public.reject_neighborly_unsafe_text()
returns trigger language plpgsql set search_path=public
as $$
declare content_text text;
begin
  content_text := lower(coalesce(new.body,'') || ' ' || coalesce(new.content,''));
  if content_text ~ '(kill[[:space:]]+yourself|i[[:space:]]+will[[:space:]]+kill[[:space:]]+you|child[[:space:]-]*porn|rape[[:space:]]+you)' then
    raise exception 'This text cannot be posted under the NeighborlyKC community standards.';
  end if;
  return new;
end;
$$;

drop trigger if exists reject_unsafe_post_text on public.posts;
create trigger reject_unsafe_post_text
before insert or update of body,content on public.posts
for each row execute function public.reject_neighborly_unsafe_text();

drop trigger if exists reject_unsafe_comment_text on public.comments;
create trigger reject_unsafe_comment_text
before insert or update of body,content on public.comments
for each row execute function public.reject_neighborly_unsafe_text();

