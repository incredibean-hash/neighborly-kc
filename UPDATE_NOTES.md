# Neighborly KC update

- Replaced theme picker cards with the supplied AIM/AOL, Sporting KC, KC Royals, Chiefs, Pip-Boy, Space, and KC Current theme button artwork.
- Added theme-matched emoji accents to the mobile bottom navigation and preserved the floating + button.
- Added a Kansas City weather ticker under the header with current temperature, precipitation, and feels-like temperature using Open-Meteo.
- Added post category selection to the composer without changing the feed filter.
- Moved post confirmation toast above the mobile bottom bar/safe area.
- Added feed loading retries to prevent the blank-until-refresh behavior.
- Removed header banner navigation/reload so clicking the banner no longer flashes the default theme.
- Google sign-in now redirects back to the exact origin being used (including Vercel test URLs) instead of hard-coding the production domain.
- Public profiles now offer a working "Sign in to Connect" path when a visitor is not signed in.
- Added ?signin=1 support on the home page to open the sign-in dialog from public pages.

Build note: npm dependencies could not be installed in this environment before the execution timeout, so a full Next.js production build was not completed here. Global TypeScript parsing completed without JSX/syntax errors; dependency/type errors are expected because node_modules is not installed.

## Aug 16 — auth/community/theme pass
- Fixed the first-login race that could make a successful Google/email login look signed out until a second attempt.
- Email login modal now explains both the 6-digit code and the clickable Sign In link when the email provides one.
- Post composer now shows `Posting to:` directly above the text box and replaces the category dropdown with theme-matched category chips.
- Post confirmation toast moved to the top of the viewport so it cannot be hidden behind the mobile keyboard/bottom bar.
- Added Space, KCPD, KCFD, Cow Town, and KC BBQ header assets/buttons; Space/KCPD/KCFD use the newly supplied artwork.
- Added Cow Town and KC BBQ themes without team logos.
- Fixed profile connection requests to always use the target user's Supabase Auth UUID.
- Added clearer Connections/DM database-fix messaging. Use `supabase_batch_fixes.sql` for the current connections/DM schema and RLS.
