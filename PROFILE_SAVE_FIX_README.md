# Neighborly KC profile save fix

The app-side profile save code is already sending both `id` and `auth_user_id`.
The current production error `new row violates row-level security policy` is coming from the **live Supabase RLS policy**, not from the profile form.

Run `SUPABASE_PROFILE_RLS_FIX_FINAL.sql` in:

**Supabase Dashboard → Neighborly KC project → SQL Editor → New query → Run**

Then sign out/in and try **Settings → My Profile → Save Profile** again.
