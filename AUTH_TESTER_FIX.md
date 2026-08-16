# Neighborly KC tester login checklist

The app now uses the current browser origin for Google OAuth unless `NEXT_PUBLIC_SITE_URL` is explicitly set.

For the Vercel tester URL, add the exact URL to:

Supabase → Authentication → URL Configuration → Redirect URLs

Examples:
- `https://neighborlykc.com/**`
- `https://YOUR-VERCEL-DOMAIN.vercel.app/**`

For email OTP, if Supabase says **Database error saving new user**, run `supabase_auth_login_fix.sql` once in the Supabase SQL Editor. That error occurs while Supabase Auth is creating the Auth user, before the app can save the Neighborly KC profile.
