# Day 11 checkpoint — break it

(Re-run 2026-10-07 over HTTPS in Day 13: all pass. Re-run 2026-10-08: all pass.)

## Improvements applied 2026-10-08

### Security
- **Race condition in `joinByCode`**: The `max_uses` check and INSERT are now
  wrapped in a transaction with `SELECT ... FOR UPDATE` on the circle row.
  Concurrent joins serialize on the circle, so the limit cannot be exceeded.
- **Signup error handling**: Only a unique violation (`23505`) returns
  "email already registered". Other DB errors return a 503 with a friendly
  message, so a transient failure does not mislead the user.
- **Password reset flow**: New `/forgot-password` and `/reset-password` pages
  with hashed, single-use, 15-minute tokens. Rate-limited per IP and email.
- **Health check**: New `/api/health` endpoint returns 200 when the DB is
  reachable, 503 otherwise. No auth required.

### UX
- **BottomBar keyboard trap**: Replaced `inert` with `aria-hidden` so keyboard
  users can still tab to the bottom bar and reveal it. `inert` was preventing
  focus entirely, making the bar unreachable by keyboard when hidden.
- **createCircle error handling**: DB failures now redirect to `/circle?error=...`
  with a friendly message instead of a raw 500.

### Observability
- **Request logging**: New `lib/logger.ts` writes one JSON line per request to
  stdout (captured by Docker). The proxy middleware logs method, path, status,
  and duration.
- **Password reset tokens**: New `password_reset_tokens` table with hashed
  tokens, expiry, and single-use enforcement. Migration added to
  `migrations.sql`.

Script: `tests/checkpoint.py` (Playwright, run against the live site).

| Test | Result |
| --- | --- |
| Outsider read fails | PASS — Carol sees only the empty state |
| Member edit works | PASS — title updated, `changed_at` bumped |
| Handoff works | PASS — note leaves the carrying list, `received_at` set |
| Bad invite code fails | PASS — `?join=invalid`, no membership created |
| Profile visible only inside circle | PASS — Dave cannot see Alice's profile; Alice sees Bob inside the shared circle |

## Test fixes applied 2026-10-08

The three failures below were the test's fault, not the app's. Each run left
state behind that the next run tripped over, so the suite was only meaningful
once:

- Note titles are now unique per run. A fixed title accumulated duplicates and
  the "last edit" and handoff locators matched the wrong row.
- "Handoff works" asserted the whole carrying list was empty. That only ever held
  on the very first run — every run hands Bob the note, so he always carries it.
  It now asserts *this run's* note left the list.
- The code field moved behind an "Or enter a code" disclosure, so the bad-code
  test opens it first. Assertions also wait for the page to settle before reading
  `main`, which was causing intermittent false failures.

## Worst bug found

None in the app. The install work surfaced one framework trap worth recording:
a Server Action `redirect()` to a **query-string** target (`/circle?joined=1`) is
silently dropped when the page was reached by a client-side navigation, which is
how an invite link always arrives. The join flow now redirects to a bare path and
uses the circle appearing in your own list as the confirmation.
