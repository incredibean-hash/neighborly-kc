-- NeighborlyKC image upload fix
-- Run once in Supabase SQL Editor.

insert into storage.buckets (id, name, public)
values
  ('post-images', 'post-images', true),
  ('profile-photos', 'profile-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "post images public read" on storage.objects;
drop policy if exists "post images insert own" on storage.objects;
drop policy if exists "post images update own" on storage.objects;
drop policy if exists "post images delete own" on storage.objects;

create policy "post images public read"
on storage.objects for select
using (bucket_id = 'post-images');

create policy "post images insert own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'post-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "post images update own"
on storage.objects for update to authenticated
using (
  bucket_id = 'post-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'post-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "post images delete own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'post-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "profile photos public read" on storage.objects;
drop policy if exists "profile photos insert own" on storage.objects;
drop policy if exists "profile photos update own" on storage.objects;
drop policy if exists "profile photos delete own" on storage.objects;

create policy "profile photos public read"
on storage.objects for select
using (bucket_id = 'profile-photos');

create policy "profile photos insert own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "profile photos update own"
on storage.objects for update to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "profile photos delete own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
