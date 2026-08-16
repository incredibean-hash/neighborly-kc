# Neighborly KC — final auth pass

This pass makes two important changes:

1. Google OAuth uses the exact browser origin that started the login and lets Supabase automatically process the PKCE callback. This is safer for Vercel preview/test URLs and mobile Safari.
2. The previous Auth SQL only removed a few guessed trigger names. `supabase_auth_login_fix.sql` now removes every user-created trigger attached to `auth.users` while leaving internal PostgreSQL/Supabase triggers alone. Neighborly KC does not need a custom Auth trigger because it creates/repairs the public profile after Auth succeeds.

## Supabase action required

Run `supabase_auth_login_fix.sql` in Supabase SQL Editor.

The final verification query should return **zero rows**.

## Google configuration

In Supabase Authentication → URL Configuration, add the exact tester URL (and an appropriate Vercel wildcard if testing preview deployments).

In Authentication → Providers → Google, make sure Google is enabled and the Google OAuth client contains the **Supabase callback URL displayed by Supabase**. The callback URL is separate from the NeighborlyKC redirect URL.

## Important test

After deploying this build, test the phone in a private/incognito session or clear the site's stored data once. Then test Google and email separately.
