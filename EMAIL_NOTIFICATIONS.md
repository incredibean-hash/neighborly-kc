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

## User feedback

The Settings menu includes **Leave Feedback**. Signed-in users can send private feedback directly to the site owner by email.

Add this Vercel environment variable alongside the existing Resend variables:

- `FEEDBACK_TO_EMAIL` — the email address that should receive user feedback.

The feedback route uses the signed-in user's name/email as `Reply-To`, so you can reply directly to the neighbor who sent it.

## User feedback

The Settings menu includes **Leave Feedback**. Signed-in users can send private feedback directly to the site owner by email.

Add this Vercel environment variable alongside the existing Resend variables:

- `FEEDBACK_TO_EMAIL` — the email address that should receive user feedback.

The feedback route uses the signed-in user's name/email as `Reply-To`, so you can reply directly to the neighbor who sent it.
