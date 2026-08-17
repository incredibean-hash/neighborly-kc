# Latest NeighborlyKC UI fix pass

- Mobile header artwork is no longer covered by Messages/Alerts/Themes/Sign-in controls; account controls now sit in a dedicated row below the artwork.
- Restored the previous mobile Feed / Safety / For Sale / Explore navigation.
- Removed Cow Town and KC BBQ from the selectable theme list and theme definitions/assets.
- Space theme shifted to a stronger purple palette.
- Pip-Boy post composer now uses a dark green CRT surface, green text/glow, and green placeholder.
- Post composer placeholder/text contrast strengthened across themes.
- Profile lookup now tries `auth_user_id` first and legacy profile `id` second, repairing older profile rows on save.
- Public profile lookup uses the same safer two-step ID resolution.
