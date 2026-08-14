# Neighborly KC

Neighborly KC is a Kansas City community network built with Next.js, Supabase and Vercel.

## Phase 1 added in this version

- Real authenticated 1-to-1 DMs using Supabase Auth user IDs
- Realtime incoming messages with Supabase Realtime
- People directory for neighbors across the KC 40-mile network
- Notifications for new DMs, comments and post likes
- Realtime notification updates
- Profile records synced to Google-authenticated users
- Message buttons from the People page
- Main feed navigation links for People, DMs and Notifications

## Deploy / database setup

1. Keep your existing Vercel environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. In Supabase SQL Editor, run your existing `supabase.sql` if the project has not already been initialized.

3. Then run **`supabase_phase1.sql`**. This adds the auth IDs, notification table, DM security policies and realtime triggers required by the new features.

4. In Supabase Authentication > URL Configuration, make sure your Vercel production URL is in the allowed redirect URLs. Google OAuth should redirect back to your site.

5. Push the updated files to GitHub. Vercel should deploy the commit automatically.

## Important

The new DM system requires authenticated Supabase users. Google sign-in is the supported real account path in the current app. The old localStorage-only join form remains for compatibility, but it cannot create secure DMs because it does not create a Supabase Auth session.

## Suggested next phase

- Profile pages
- Follow/favorite neighbors
- Neighborhood pages and neighborhood switching
- KC-wide vs Local feed toggle
- Push notification preferences
- Marketplace listings with seller profiles
- Safety map / alerts
- Report/block/moderation tools
