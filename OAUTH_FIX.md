# OAuth / Google Login Fix

This deployment includes the PKCE OAuth callback fix and uses the canonical production domain for Google OAuth redirects.

## Production redirect

Google OAuth now returns to:

`https://neighborlykc.com`

The app exchanges the `code` query parameter for a Supabase session before showing the signed-in state.

## Environment variable

For production, set this Vercel environment variable (Production):

`NEXT_PUBLIC_SITE_URL=https://neighborlykc.com`

For local development, use:

`NEXT_PUBLIC_SITE_URL=http://localhost:3000`

If the variable is absent, production automatically falls back to `https://neighborlykc.com`, while localhost uses the local origin.

## Supabase Auth URL configuration

In Supabase Dashboard → Authentication → URL Configuration, set:

- Site URL: `https://neighborlykc.com`
- Redirect URL: `https://neighborlykc.com`

If you want to test Vercel preview deployments, add their exact preview URL to Supabase Redirect URLs and set `NEXT_PUBLIC_SITE_URL` to that preview URL for that environment.

## Important

The application no longer uses `window.location.origin` for production OAuth redirects. This prevents Google/Supabase from returning to a Vercel deployment URL that may be protected by Vercel Deployment Protection.
