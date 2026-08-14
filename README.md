# Neighborly KC — consolidated bug-fix batch

This package is based on the latest Neighborly KC source available in the conversation/library and applies the full 12-item batch requested by Jason.

## Included fixes

1. File picker is cleared after a successful image post.
2. Image processing/upload has validation and a 30-second timeout instead of hanging forever.
3. Regular users are limited to 5 posts per rolling 24 hours; admins are unlimited. A Supabase migration is included for database enforcement.
4. New People, Connections, Messages, Notifications, and Profile pages use the KC Royals visual system.
5. Main header now includes a KC skyline silhouette.
6. Empty/no-neighbor and missing-profile states have clear back buttons.
7. KC Royals is the default theme for new sessions.
8. Post/comment likes use authenticated user IDs and return useful errors; SQL adds RLS and uniqueness protections.
9. Mobile header and People action buttons are constrained/wrapped so Join/Connect/Message controls don't run off-screen.
10. Themes menu is organized into KC themes and other looks, with a new KC Night theme.
11. Successful posts show a confirmation toast.
12. Supabase auth initialization now cleans up its listener and avoids stale subscription behavior on refresh.

## Important: run the Supabase migration

Before testing the post limit and likes in production, run:

`supabase_batch_fixes.sql`

in the Supabase SQL Editor.

The database migration adds `profiles.is_admin`, enforces the 5-post/24-hour limit for regular users, makes admins unlimited, and adds like RLS/uniqueness rules.

The current app also treats the existing founder/admin naming convention containing `Jason` as admin-compatible so the UI and database migration remain aligned with the current project behavior.

## Deploy

Replace the corresponding files in GitHub, commit to `main`, and let Vercel deploy.

The package also updates Next.js from 14.2.5 to the patched 14.2.35 release.
