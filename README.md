
# Neighborly KC - Full Nextdoor Clone

This is a complete, working Nextdoor clone built for Kansas City - 40 mile radius.

**Default address: 304 NE 115TH ST, 64155 - Meadow Brook Heights**

## Features (Nextdoor parity)
- Feed with categories: All, General, For Sale & Free, Safety Alert, Recommendation, Event, Lost & Found
- Post composer with image upload + compression (max 3MB)
- Likes on posts + likes on comments
- Comments thread with open/close
- DMs with search, swipe-to-delete on mobile, keyboard fix
- Join flow: Option 1 = 5 Mile (manual), Option 2 = 40 Mile FREE OCR (no OpenAI key) + Bluetooth 30ft tap if address already taken
- Neighborhoods sidebar with member counts
- Right rail with neighborhood info
- Admin: any profile with "jason" in name or is_founder=true can delete any post/comment
- LocalStorage profile: nkc_profile_tiered_40

## Fix for Vercel build
package.json uses typescript ^5.3.3 not 5.4.0 (5.4.0 doesn't exist in npm)

## Env vars needed in Vercel
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY (for API routes)

## Deploy
1. Upload this folder to GitHub neighborly-kc/neighborly-kc
2. Vercel auto-deploys - should be Ready green in 30s
3. Run supabase.sql in Supabase SQL editor

## Local dev
npm install
npm run dev
