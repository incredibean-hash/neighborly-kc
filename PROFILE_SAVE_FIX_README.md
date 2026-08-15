# Neighborly KC profile save fix

The app-side profile save code is already sending both `id` and `auth_user_id`.
The current production error `new row violates row-level security policy` is coming from the **live Supabase RLS policy**, not from the profile form.

Run `SUPABASE_PROFILE_RLS_FIX_FINAL.sql` in:

**Supabase Dashboard → Neighborly KC project → SQL Editor → New query → Run**

Then sign out/in and try **Settings → My Profile → Save Profile** again.


## Legacy street_address constraint fix

Some older Neighborly KC Supabase projects have `profiles.street_address` marked NOT NULL even though the current profile UI intentionally does not collect or display a street address. The profile save code now sends a private empty string for that field when no existing value is present, and the final Supabase SQL sets a safe default and backfills any legacy NULLs.
