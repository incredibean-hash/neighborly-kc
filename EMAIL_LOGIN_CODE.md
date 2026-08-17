# Neighborly KC email login code

The app uses a 6-digit email OTP login using Supabase Auth, and the login screen now explains that a Supabase email may also include a clickable Sign In link.

## Supabase email template

In Supabase Dashboard → Authentication → Email Templates, make sure the **Magic Link** template sends the OTP token rather than only a clickable link. The template should include:

`{{ .Token }}`

The app calls `signInWithOtp()` to send the code and `verifyOtp()` with `type: 'email'` to complete sign-in.

## What changed

- Removed the old localStorage-only "Join" behavior as an authentication path.
- Added **Send Login Code**.
- Added a 6-digit code entry field and **Verify & Sign In**.
- Google sign-in remains available.
- Successful email-code sign-in creates/updates the Supabase-backed profile.
- Themes are now collapsed behind **Settings → Themes** instead of taking over the whole Settings panel.

If the email arrives with a magic-link button, the user can tap the link. If the email should also show the 6-digit code, make sure the Magic Link template includes `{{ .Token }}`. The NeighborlyKC login popup explains both paths.
