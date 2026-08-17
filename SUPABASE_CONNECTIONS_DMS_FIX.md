# Neighborly KC — Connections + DMs fix

If Connections or Messages show database errors, run **`supabase_batch_fixes.sql`** in Supabase SQL Editor by itself. It adds the auth UUID columns, RLS policies, indexes, notifications, and realtime entries used by the current app.

The current app expects:
- `connections.requester_id`
- `connections.addressee_id`
- `connections.status`
- `dms.from_user_id`
- `dms.to_user_id`

Do not run the older connection-trigger snippets first.
