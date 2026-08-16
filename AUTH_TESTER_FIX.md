# Neighborly KC — tester login repair

## Email login

Supabase documents `Database error saving new user` as commonly caused by a custom trigger on `auth.users`. The earlier migration only removed a few expected trigger names. The FINAL `supabase_auth_login_fix.sql` now removes **all user-created triggers on `auth.users`** while leaving internal PostgreSQL/Supabase triggers alone.

Run that SQL once. The verification query at the bottom should return **zero rows**.

Neighborly KC creates/repairs the public `profiles` row after authentication succeeds, so an Auth trigger is unnecessary.

## Google login

The app now uses the exact browser origin that started OAuth as `redirectTo`, and Supabase is configured to automatically process the PKCE callback. This is important for a tester phone using a Vercel preview because the PKCE verifier is stored in the browser origin that started the login.

Supabase Authentication → URL Configuration must allow the tester URL. Supabase supports wildcard redirect patterns for Vercel previews.

Google Provider configuration must also contain the **Supabase callback URL shown on the Google provider page**. That callback is separate from the NeighborlyKC redirect URL.

If Google still fails, the app now displays the OAuth error returned by Supabase instead of silently dropping the tester back onto the feed.
