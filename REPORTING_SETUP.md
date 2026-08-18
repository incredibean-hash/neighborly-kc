# Reporting and content-safety setup

Run `supabase_reporting_and_content_safety.sql` once in the Supabase SQL Editor after the moderation SQL.

Members can then report posts from the feed. Admins can open a post's three-dot menu and select **View reports**. Reports also appear in the Supabase `post_reports` table, where an admin can update the status to `reviewing`, `resolved`, or `dismissed`.

The SQL includes a conservative server-side high-risk phrase filter. Image files are restricted by type and size, but automatic visual-content scanning is not included; reports and moderator review remain necessary for photos.
