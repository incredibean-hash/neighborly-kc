# Neighborly KC OAuth first-login fix

This build patches the Google OAuth/PKCE callback race that could leave the first login showing the Join dialog until a second login attempt.

## Changes

- Supabase client now uses `detectSessionInUrl: false`.
- `app/page.tsx` explicitly detects the OAuth `code` in the URL and calls `supabase.auth.exchangeCodeForSession(code)` before treating the user as logged out.
- The callback URL remains the site root, so no new Supabase redirect URL is required beyond the existing site URL.
- The auth-state listener remains registered before session restoration so later auth events update the UI immediately.

## Deployment

Deploy the project normally to Vercel. No database migration is included in this patch; the existing Supabase trigger/unique profile constraint are left unchanged.

After deployment, test in a private/incognito window:

1. Open the production site while signed out.
2. Click Join / Continue with Google.
3. Complete Google authentication.
4. Confirm the browser returns to the site and immediately shows the signed-in account rather than the Join dialog.
