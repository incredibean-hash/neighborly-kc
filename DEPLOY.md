
# Neighborly KC - FULL RESTORED APP

This ZIP contains EVERYTHING we built.

## What's inside:
- app/page.tsx - ULTIMATE merged: hoods + CATS + comments/likes + image compress + FREE OCR mail verify (304 NE 115TH ST, upside-down OK) + Bluetooth tap + founder 👑 + 40mi/5mi
- app/api/verify-mail/route.ts - FREE OCR (no OPENAI_API_KEY needed)
- app/api/check-address, alert-address, request-bluetooth-approval, approve-bluetooth, bluetooth-status, moderate-image
- app/bluetooth/page.tsx - Bluetooth tap page (fixed Suspense for green build)
- app/dms/page.tsx - DMs with swipe to delete

## Deploy to Vercel (since all deployments deleted):

### Option 1: GitHub (recommended)
1. Go to github.com/neighborly-kc/neighborly-kc
2. Delete old files, upload all files from this ZIP (drag folder contents)
3. Commit
4. Vercel auto-deploys → Ready 25s green

### Option 2: Vercel direct upload
1. Go to vercel.com → Add New → Project → Upload folder (this unzipped folder)
2. Set env vars:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY (optional)
   - VAPID keys if you have push
   - NO OPENAI_API_KEY needed anymore!
3. Deploy

### Env vars needed (FREE version):
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- OCR_SPACE_KEY optional (defaults to free demo K87899142388957)

After deploy, test mail with your IMG_2337.jpg - should read 304 NE 115TH ST.
