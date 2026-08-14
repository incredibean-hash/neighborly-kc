# Neighborly KC reaction emails

The app already creates an in-app `like` notification in Supabase. This pass adds an optional transactional email after a user reacts to another user's post.

## Vercel environment variables

Set these in the production Vercel project:

- `RESEND_API_KEY` — API key from Resend.
- `RESEND_FROM_EMAIL` — a verified sender, for example `Neighborly KC <notifications@neighborlykc.com>`.
- `NEXT_PUBLIC_SITE_URL` — `https://neighborlykc.com`.

The Supabase public URL and anon key remain unchanged.

If the Resend variables are missing, reactions still work normally and the in-app notification still appears; only the email is skipped.

## Supabase

Run `supabase_tweaks.sql` once if you are not using the updated `supabase_batch_fixes.sql` or `supabase_apply_fixes.sql`. The migration adds owner/admin RLS for post updates and deletes.
