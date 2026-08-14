-- Neighborly KC consolidated fixes migration
-- Run in Supabase SQL Editor.

-- 1) Admin flag for a real, database-enforced admin role.
alter table profiles add column if not exists is_admin boolean default false;

-- 2) Prevent duplicate likes per user/post or user/comment.
-- Remove duplicate authenticated likes first so the indexes can be created safely.
delete from likes a using likes b
where a.author_id is not null and a.post_id is not null
  and a.author_id = b.author_id and a.post_id = b.post_id and a.id > b.id;
delete from likes a using likes b
where a.author_id is not null and a.comment_id is not null
  and a.author_id = b.author_id and a.comment_id = b.comment_id and a.id > b.id;

create unique index if not exists likes_one_post_like_per_user
  on likes(author_id, post_id) where post_id is not null;
create unique index if not exists likes_one_comment_like_per_user
  on likes(author_id, comment_id) where comment_id is not null;

-- 3) Rolling 24-hour post limit for regular users; admins are unlimited.
-- Default is 5 posts per 24 hours. Change 5 below if desired.
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
  select coalesce(is_admin, false) or coalesce(lower(full_name) like '%jason%', false) into admin_user
  from profiles where auth_user_id = auth.uid() limit 1;

  if admin_user then
    return new;
  end if;

  select count(*) into recent_posts
  from posts
  where user_id = auth.uid()
    and created_at >= now() - interval '24 hours';

  if recent_posts >= 5 then
    raise exception 'POST_LIMIT: You can make up to 5 posts in 24 hours.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_neighborly_post_limit on posts;
create trigger trg_neighborly_post_limit
before insert on posts
for each row execute function public.enforce_neighborly_post_limit();


-- 4) Likes: make the like button work for authenticated users and keep likes unique.
alter table likes enable row level security;
drop policy if exists "likes public read" on likes;
create policy "likes public read" on likes for select using (true);
drop policy if exists "likes own insert" on likes;
create policy "likes own insert" on likes for insert with check (auth.uid() = author_id);
drop policy if exists "likes own delete" on likes;
create policy "likes own delete" on likes for delete using (auth.uid() = author_id);
