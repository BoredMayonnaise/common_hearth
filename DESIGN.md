# Design: Common Hearth

## Product design principles
- Public app, private circles.
- No strangers-by-default; invite codes are the join path.
- Trust profiles are short, honest, and visible only inside the same circle.
- Care handbooks keep living knowledge even when one person steps back.

## Data model (MVP)

### `users` / `profiles`
- `id`
- `email`
- `display_name`
- `how_i_show_up` (one line)
- `region_or_role_tag` (optional)
- timestamps

### `circles`
- `id`
- `name`
- `purpose` (one line)
- `created_by` (user id)
- timestamps

### `memberships`
- `id`
- `circle_id`
- `user_id`
- `role` (owner/member)
- `joined_at`

### `invite_codes`
- `id`
- `code` (short string, unique)
- `circle_id`
- `max_uses` (optional)
- `expires_at` (optional)
- `created_at`

### `notes`
- `id`
- `circle_id`
- `author_id`
- `title`
- `situation`
- `steps`
- `never_promise`
- `access_notes`
- `contact`
- `carrier_id` (member)
- `handoff_on` (date)
- `received_at` (timestamp, nullable)
- `archived_at` (timestamp, nullable)
- `created_at`, `changed_at`

## Seven core note fields
1. Title
2. Situation
3. Steps
4. Never Promise
5. Access Notes
6. Contact
7. Carrier + handoff date (metadata, not text)

## Access control model
- Every read/write of circle-scoped data goes through a server path (server action or API route).
- That path checks the signed-in user is a member of the circle before returning notes or profiles.
- If Postgres RLS is used: `notes`, `memberships`, `invite_codes`, and profile reads are restricted to circles where the current auth user is a member.
- Outsider access must fail closed (no data, not a cached page).

## Trust profile UI
- Fields: display name, one-line "how I show up," optional region/role tag.
- No avatars, no bio walls, no global people directory.
- Shown in circle member list only.

## Landing page intent
- One sentence promise: *Private care handbooks with trust profiles; public app, private circles.*
- Two clear entry points: "Create account" and "Join with a code."
- Privacy line: *Circles are private. Profiles are only visible to people in your circle.*
- No fake testimonials. Optional demo/sample circle only if owned and seeded by you.

## Interaction flow (MVP)
1. Sign up / sign in
2. Fill short trust profile
3. Create circle or join with code
4. See member list with trust profiles
5. Write a note with carrier + handoff date
6. Mark handoff received / reassign carrier
7. View "Who is carrying what"
8. Edit or archive a note

## Empty states and trust copy
- No notes yet: *Write the thing only you remember.*
- No circle yet: *Start a circle or join with a code.*
- Invite code error: *That code does not work or has expired.*
- Access denied: *You are not a member of this circle.*
