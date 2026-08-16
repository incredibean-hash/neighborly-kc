# Neighborly KC — consolidated 12-bug fix

This source includes the current UI/code fixes plus a **safe Supabase migration for the database schema that already exists in production**.

## Fixed / addressed

1. Image picker clears after a successful post and now shows a compact selected-file row with a remove button.
2. `/dms` is wrapped in `Suspense` for `useSearchParams()` and uses the patched Next.js version in `package.json`.
3. Regular users are limited to 5 posts per rolling 24 hours; admins/founders are unlimited. The database trigger is included.
4. People, Connections, Messages, Notifications and Profile pages use the KC Royals visual system.
5. Main header includes a KC skyline silhouette.
6. Missing-neighbor/profile states include a clear Back to People button.
7. KC Royals is the default theme.
8. Likes use authenticated user IDs; RLS and unique indexes are included.
9. Mobile header/action sizing is constrained to keep Join and other controls on screen.
10. Themes are grouped into KC and Other Looks, with themed headers for AIM, Sporting KC, KC Royals, KC Chiefs, KC Current, and Pip-Boy 3000.
11. Successful posts show a centered confirmation popup.
12. Auth uses persistent Supabase sessions and no longer treats a stale local profile as proof of authentication on refresh.

## IMPORTANT: Supabase SQL

Your existing production tables were not identical to the original migration files. In particular, `connections` already existed with only `id` and `created_at`, while the app expected `requester_id` and `addressee_id`. The old migration therefore failed when its trigger referenced `new.requester_id`.

Run **`supabase_batch_fixes.sql` by itself** in Supabase SQL Editor (or use the identical `supabase_apply_fixes.sql` copy). It first adds the missing columns to the existing tables, then installs RLS, likes protection, admin/post-limit enforcement, notifications and triggers.

If your admin account is not already `is_founder = true`, set `profiles.is_admin = true` for that account's Supabase Auth UUID using the final commented SQL line in the migration.

Do not run the old connection trigger SQL from earlier attempts.

## Build

The DMs page already contains the required Suspense boundary. The project uses Next.js 14.2.35 in `package.json`.

## Deploy

Replace the project files in GitHub, commit to `main`, and let Vercel deploy.

## Current production-schema note

The schema output you supplied showed that `connections` initially had only `id` and `created_at`, while the application expects `requester_id`, `addressee_id`, and `status`. The consolidated migration adds those columns before creating any connection trigger, which avoids the earlier `column "requester_id" does not exist` failure.

It also adds the Auth ownership columns used by likes, posts, comments, DMs and profiles, plus `is_admin` and the post-limit trigger. After the migration, verify the admin row with:

```sql
select auth_user_id, full_name, is_admin, is_founder
from public.profiles
order by created_at desc;
```

Then set the intended admin row to `is_admin = true` if it is not already a founder.

The SQL files shown under Supabase Studio's **Private** query list are saved query documents, not database tables. They do not need to be deleted for the application to work.

## Latest UI / community pass

- Full-width Neighborly KC header with expanded skyline treatment.
- Upgraded NKC web/PWA logo assets.
- Added the KC Heartland theme to complete the KC theme grid.
- Users can edit their own posts, including category and optional image replacement.
- Added optional transactional email notifications for post reactions via Resend.
- Added smooth hover, press, surface, modal, and feed-entry transitions with reduced-motion support.

For reaction email setup, see `EMAIL_NOTIFICATIONS.md` and `.env.example`.

## Public legal pages
- Privacy Policy: `/privacy`
- Terms of Service: `/terms`

## Feedback email
Set `FEEDBACK_TO_EMAIL` in Vercel. The existing `RESEND_API_KEY` and `RESEND_FROM_EMAIL` variables are reused for feedback delivery.

## V10 profile + KC skyline update
- Added a theme-aware Kansas City skyline treatment to the main header and profile header.
- Added a compact KC mark in the header so the branding reads as Kansas City rather than North Kansas City.
- User profiles are available from People, post author names, DMs, and Settings → My Profile.
- Signed-in users can edit their display name and ZIP from their own profile page; street address is not displayed publicly.
- Existing admin/founder post-limit bypass remains in the database migration (`supabase_apply_fixes.sql`) and owner bootstrap (`supabase_admin_owner.sql`).
