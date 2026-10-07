# Security: access control rules

Common Hearth keeps circles private. Every read or write of circle-scoped
data goes through a server path (server action or page render) that checks
membership before touching data.

## Rules

1. **Notes** — the notes page lists only notes in circles where the signed-in
   user has a `memberships` row. `markReceived` and `createNote` verify the
   user is a member of the note's circle before writing; otherwise they
   redirect with an error. RLS is not enabled; defense is in the server code.
2. **Memberships / profiles** — the member list for a circle is shown only to
   users who belong to that circle (`memberships` subquery on the session
   user). `/profile` only ever reads/writes the signed-in user's own profile.
3. **Invite codes** — looked up server-side on join; a bad or expired code
   fails closed with a generic message. Codes are never listed to non-members.
4. **Signed-out users** — `/circle`, `/profile`, `/notes` routes are blocked
   by `app/proxy.ts` (NextAuth middleware) before any data access.
5. **Auth** — credentials + bcrypt hashes; session JWT via NextAuth.
   Secrets live in `app/.env.local` (gitignored).

## Test evidence

- Carol (no memberships) hits `/notes` → sees only the empty state, no
  "Sunday meal drop-off" note (verified 2026-10-07 with Playwright).
- Carol uses a wrong invite code → join rejected, no membership created.
- Bob's handoff-received on Alice's note → works because Bob is a member;
  same action by a non-member would fail the membership check.

If Day 8 slipped, public launch is delayed until outsider reads fail closed.
