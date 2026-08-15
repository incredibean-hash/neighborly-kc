# Neighborly KC — Auth / Profile / Mobile keyboard patch

This patch is based on the current working Neighborly KC source.

## Changes
- Profile routes now accept either the Supabase Auth UUID or the profile-row UUID.
- Public profile loading uses the profile's actual `auth_user_id` when loading that user's posts/connections.
- Profile saving updates the exact existing profile row by `id`, avoiding an auth/profile mismatch.
- Profile photo URLs get a cache-busting query parameter after upload so iPhone/Safari does not keep showing the old image.
- Sign-in profile hydration now preserves existing neighborhood, ZIP, address, and avatar data instead of rebuilding a partial profile on auth refresh.
- Mobile quick-action buttons hide while the iOS keyboard is open, so they do not sit on top of the composer.
- The post composer scrolls itself into a usable position when focused on mobile.
- Added a public-read storage policy to the profile-photo SQL helper.

## Supabase
If the profile RLS/photo fix has not already been run in production, run:
- `SUPABASE_PROFILE_RLS_FIX_FINAL.sql`

That script is included in this project and also creates the public-read policy for profile photos.

## Verification
A full Next.js build could not be run in this environment because the ZIP does not contain `node_modules` and package installation timed out. TypeScript parsing was checked with the installed compiler; no syntax errors were reported. Missing-module/type errors are expected until dependencies are installed.
