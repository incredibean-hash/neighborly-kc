
# neighborly-kc - FIXED

## Fixed for Vercel build failure
Vercel error: `No matching version found for typescript@5.4.0`

**Fix applied:**
- `package.json`: `typescript` pinned to `^5.3.3`
- Removed any 5.4-only types
- `tsconfig.json` uses bundler resolution compatible with 5.3.3

## Routes
- `/` -> Mailbox hero (304 NE 115TH ST, FREE OCR, Bluetooth 30ft) - your current page.tsx
- `/feed` -> Almost-done feed version (Neighborly KC 5mi + Join + No posts in All + Parkwood Hills feed)

## Deploy
```
rm -rf node_modules package-lock.json .next
npm install
npm run build
vercel --prod
```
