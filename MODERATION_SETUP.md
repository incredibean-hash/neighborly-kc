# NeighborlyKC moderation setup

1. Deploy this app version.
2. In Supabase, open **SQL Editor**.
3. Open `supabase_moderation_fix.sql`, paste the complete script, and click **Run** once.
4. Sign out and back in so the app reloads the administrator/founder profile flags.

The three-dot menu on each post provides:

- Edit post
- Remove post
- Lock or unlock comments
- Pin or unpin post
- Warn member
- Mute member for a selected number of hours
- Ban member
- View member activity

Moderator actions require a reason and are written to `moderation_actions`. Database triggers prevent muted or banned accounts from posting or commenting and prevent new replies on locked posts.
