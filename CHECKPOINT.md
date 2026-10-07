# Day 11 checkpoint — break it

(Re-run 2026-10-07 over HTTPS in Day 13: all pass.)

Script: `tests/checkpoint.py` (Playwright, run against the live site).

| Test | Result |
| --- | --- |
| Outsider read fails | PASS — Carol sees only the empty state |
| Member edit works | PASS — title updated, `changed_at` bumped |
| Handoff works | PASS — `received_at` set, carrier reassigned, carrying list emptied |
| Bad invite code fails | PASS — `?join=invalid`, no membership created |
| Profile visible only inside circle | PASS — Dave cannot see Alice's profile; Alice sees Bob inside the shared circle |

## Fixes applied this checkpoint

- `/notes/new` and `/circle` now show a friendly error ("Please fill in…" /
  "That code does not work or has expired.") instead of a silent redirect.

## Worst bug found

None new at this checkpoint — Friendly-error gap was the fix above. Member
path passes, outsider read fails closed.
