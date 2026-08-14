-- Neighborly KC — owner/admin bootstrap
-- Run this ONCE in the Supabase SQL Editor for the owner account.
-- The current app owner account is Jason Bean. This marks that profile as
-- both admin and founder so the database-side 5-post/24-hour trigger skips it.
-- After running, sign out/in once in Neighborly KC so the client refreshes the profile.

update public.profiles
set is_admin = true,
    is_founder = true
where lower(trim(coalesce(full_name, ''))) = 'jason bean';

-- Verify the result:
select auth_user_id, full_name, email, is_admin, is_founder
from public.profiles
where lower(trim(coalesce(full_name, ''))) = 'jason bean';
