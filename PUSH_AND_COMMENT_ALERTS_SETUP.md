# Push messages and comment email setup

1. Run `supabase_push_notifications.sql` once in Supabase SQL Editor.
2. Generate one VAPID key pair: `npx web-push generate-vapid-keys --json`.
3. Add these Vercel environment variables to Production, Preview and Development:
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = generated public key
   - `VAPID_PRIVATE_KEY` = generated private key
   - `VAPID_SUBJECT` = `mailto:admin@neighborlykc.com`
   - `SUPABASE_SERVICE_ROLE_KEY` = Supabase project service-role key (server only)
4. Keep the existing `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `NEXT_PUBLIC_SITE_URL` values.
5. Redeploy NeighborlyKC.

On iPhone/iPad, add NeighborlyKC to the Home Screen, open it from the new icon,
go to Messages, and tap **Enable alerts**. Browser tabs cannot receive iOS web
push unless the site is installed as a Home Screen web app.
