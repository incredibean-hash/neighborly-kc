# Theme button + sign-in update

- Theme picker cards now use a consistent 173:191 card ratio, matching the supplied Space theme-card artwork.
- Replaced the Space theme button artwork with the exact supplied Space card.
- Google OAuth callback now explicitly exchanges the PKCE `code` before restoring the session.
- Auth UI no longer marks itself ready before session restoration and no longer clears cached profile state during a normal no-session race.
- The signed-in UI is driven by the real Supabase session, while the community profile is hydrated afterward.

This is intended to remove the intermittent first-login/second-login behavior seen on browser and mobile/Vercel test sessions.
