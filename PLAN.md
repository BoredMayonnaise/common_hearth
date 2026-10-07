# Common Hearth — Build Plan

## Project summary

**Common Hearth** is a public web app where small private circles keep a shared handbook of how they actually care for one another — with simple member profiles so people can trust who is in the room — so care continues when the most tired person steps back.

## User problem

Care knowledge lives in one head and a chat thread. When that person burns out, the practice dies even though the need does not. Strangers also cannot find a calm, private place to start a circle without being invited by someone who already built the tool.

## Target users

- Organizers of small care/mutual-aid circles (4–12 people)
- New volunteers who need the playbook, not another group chat
- Anyone online who wants to start a private circle without emailing a founder

## Main user journey

1. Visitor lands on the public site, creates an account, and fills a short trust profile.
2. They create a private circle or request to join one they were given a code for.
3. They write a practice note (situation, steps, never-promise, access notes, contact).
4. They assign a carrier and a handoff date.
5. Another member marks the handoff received. The note stays; the burden can move.

## MVP feature list

- Public landing + email (or magic-link) sign-up
- Short trust profile (name, one-line bio, optional location/role tag)
- Create a private circle
- Join via invite code (no public directory of circles)
- Practice notes with the seven core fields
- Carrier + handoff received
- “Who is carrying what” list
- Members can read/edit notes; non-members cannot
- Profile visible only to people inside the same circle

## Features to postpone

Chat, payments, mobile app, public circle directory, social feed, likes, file uploads, SMS, multi-circle dashboards, AI summaries, time-banking currency.

## Recommended technology stack (Oracle)

| Layer | Choice | Why |
| --- | --- | --- |
| App | Next.js (App Router) on a small Oracle Cloud Compute VM or Container Instance | One Node process is enough |
| Database | Oracle Autonomous Database free tier, or PostgreSQL on Compute | Real SQL + row-level checks |
| Auth | NextAuth (credentials or magic link) or Oracle IDCS | Avoid building password storage |
| Storage | Oracle Object Storage only if you later add files | Not needed for MVP text notes |
| Hosting | Existing Oracle compute + domain, or a free-tier VM | Replaces Vercel |
| Secrets | Environment variables on the VM / container | Never commit keys |

## Project risks

| Risk | Mitigation |
| --- | --- |
| Oracle setup eats Days 1–3 | Day 1–2: one VM, one Postgres, one “hello” page. Auth before notes. |
| No pre-recruited circle | Day 14: *you* create a public demo circle with sample notes; real users self-serve with invite codes. |
| Trust without oversharing | Profiles are short and circle-visible only, not a public social network. |
| Health-adjacent data | Day 8 is non-negotiable before production. |
| Scope creep into “community platform” | Invite code, not public search of circles. |

**Checkpoint days:** 3, 7, 11, 14. If a checkpoint slips more than one day, use that day’s fallback — do not add features to “catch up.”

---

### Day 1 — Freeze the promise (Oracle-aware)

**Goal:** Write what ships so the rest of the plan cannot quietly become a social network.

**Tasks:**
- README first line: *Private care handbooks with trust profiles; public app, private circles.*
- List MVP fields and the invite-code join path.
- Note stack: Next.js + Postgres on Oracle Compute + NextAuth.
- Create the Git repo; do not start coding UI chrome yet.

**Deliverable:** README with promise, postponed list, and Oracle stack.

**Tools:** Git, markdown.

**Definition of done:** A stranger knows what exists on Day 14 and what does not.

**Common mistake:** Designing a public “find a circle near me” map on day one.

---

### Day 2 — Data model + trust profile

**Goal:** Decide what is stored before screens.

**Tasks:**
- Tables: `users` / profiles, `circles`, `memberships`, `notes`, `invite_codes`.
- Profile fields: display_name, how_i_show_up (one line), optional region_or_role_tag.
- Note fields: title, situation, steps, never_promise, access_notes, contact, carrier_id, handoff_on, received_at, archived_at.
- Invite code: short string, circle_id, optional max_uses / expires_at.

**Deliverable:** One-page schema in the repo.

**Tools:** Markdown or a simple ER sketch.

**Definition of done:** Every screen field maps to a column; no comments table.

**Common mistake:** A full social profile with avatar uploads.

---

### Day 3 — Checkpoint: app alive on Oracle

**Goal:** Public URL (or IP) serves a Next.js page and can talk to Postgres.

**Tasks:**
- Provision free-tier Compute (or container) if you do not already have one.
- Install Node, run Next.js, open port 80/443 or a reverse proxy.
- Create Postgres (Docker or Autonomous free).
- Env vars for DB URL; never commit them.
- Health page: “Common Hearth is up.”

**Deliverable:** A URL or IP that loads your app from the internet.

**Tools:** Oracle Cloud console, SSH, Docker optional, Next.js.

**Definition of done:** You open the site from a phone not on your home Wi‑Fi.

**Common mistake:** Perfecting SSL before the app boots. Fallback: HTTP on a non-standard port for this day only; lock TLS before Day 13.

---

### Day 4 — Auth + profile

**Goal:** A visitor can sign up, sign in, and set a short trust profile.

**Tasks:**
- NextAuth (email magic link or credentials) wired to your users table.
- After first login, force a profile form: display name + how I show up.
- Home shows “Signed in as …” and profile summary.

**Deliverable:** Two test accounts with different profiles.

**Tools:** NextAuth, Postgres.

**Definition of done:** Signed-out users cannot open `/circle`; signed-in users have a non-empty display name.

**Common mistake:** Building the note editor before profiles exist.

---

### Day 5 — Create circle + invite code

**Goal:** Organizer creates a private circle and gets a code to share.

**Tasks:**
- “Start a circle” form: name + one-line purpose.
- Creator becomes owner membership.
- Generate a short invite code; show “Share this code.”
- Circle home lists name, purpose, and code (owner only).

**Deliverable:** One circle with a working code string in the DB.

**Tools:** Server actions, Postgres.

**Definition of done:** Refresh still shows the same circle owned by you.

**Common mistake:** Publishing a directory of all circles.

---

### Day 6 — Join by code + see profiles

**Goal:** Second person joins and both see each other’s trust profiles inside the circle.

**Tasks:**
- “Join with code” form.
- On success, create membership; show member list with display names and how_i_show_up.
- Profiles of non-members stay hidden.

**Deliverable:** Account B joins Account A’s circle and both see profiles.

**Tools:** Two browsers / profiles.

**Definition of done:** Account C with a wrong code cannot join or read anything.

**Common mistake:** Showing all users on the platform on a global people page.

---

### Day 7 — Checkpoint: practice notes + handoff

**Goal:** The living handbook exists; responsibility can move.

**Tasks:**
- Note form with the seven fields + carrier (member dropdown) + handoff date.
- List notes; empty state: “Write the thing only you remember.”
- “Mark handoff received” sets received_at and can reassign carrier to the confirmer.
- “Who is carrying what” list.

**Deliverable:** One real note, handoff tested with two accounts.

**Tools:** Postgres, two accounts.

**Definition of done:** Handoff changes carrier without rewriting the practice text.

**Fallback if behind:** Assign carrier only; skip received_at until Day 11.

**Common mistake:** Modeling handoff as a new chat message.

---

### Day 8 — Access control (non-negotiable)

**Goal:** Non-members cannot read notes even if they guess IDs.

**Tasks:**
- Every note/circle query checks membership in a server path (API route or server action).
- If using Postgres RLS, enable policies: select/update only when auth user is in `memberships` for that `circle_id`.
- Test: Account C session cannot read Account A’s notes by URL or API.
- Document the rules in a short SECURITY.md.

**Deliverable:** SECURITY.md + failed outsider read test.

**Tools:** Postgres policies and/or strict server-side membership checks.

**Definition of done:** Outsider read fails closed. If this slips, delay public launch.

**Common mistake:** Checking membership only in React client code.

---

### Day 9 — Edit, archive, calm UX

**Goal:** Practices can be corrected; archived notes leave the carrying list.

**Tasks:**
- Edit prefilled form; update `changed_at`.
- Archive flag; exclude archived from “carrying.”
- Large type, labeled fields, keyboard tab order, works at 375px width.

**Deliverable:** Edited + archived note; phone-width pass.

**Tools:** Tailwind, browser device mode.

**Definition of done:** Keyboard-only create/edit works; every input has a visible label.

**Common mistake:** A dense admin dashboard.

---

### Day 10 — Public landing (usable without recruiting)

**Goal:** A stranger understands the product and can start without you.

**Tasks:**
- Landing: one sentence promise, how private circles work, “Create account,” “Join with a code.”
- No fake testimonials; optional “Sample circle” link that opens read-only demo notes you own.
- Clear privacy line: *Circles are private. Profiles are only visible to people in your circle.*

**Deliverable:** Landing that converts a cold visitor into a signed-up organizer.

**Tools:** Next.js pages.

**Definition of done:** You can complete “sign up → create circle → write note” from a logged-out browser with no help from you.

**Common mistake:** Hiding join-by-code so deep that only friends find it.

---

### Day 11 — Checkpoint: break it

**Goal:** Five tests written and run.

**Tasks:**
- Tests: outsider read fails; member edit works; handoff works; bad invite code fails; profile visible only inside circle.
- Fix the worst bug only.
- Friendly errors for empty title and failed save.

**Deliverable:** Checklist with pass/fail in the repo.

**Tools:** Two (or three) accounts.

**Definition of done:** Outsider read fails; member path passes.

**Fallback:** Manual checks only — no test framework required.

---

### Day 12 — Docs + sample practice (surprise)

**Goal:** Future you and first users can understand the app; seed one strong sample note.

**Tasks:**
- README: setup on Oracle, env vars, how to run, how RLS/membership checks work.
- One-page “How a circle uses this.”
- Sample practice preloaded in a demo circle:

**Sample practice title:** *When someone says “I’m fine” but the house is not*

**Situation:** A neighbor or family member downplays a fall, missed meds, or empty fridge; chat replies scatter and nobody owns the next visit.

**Steps:** (1) One person confirms a visit window within 24 hours. (2) Bring the same two questions every time: “What would make today easier?” and “Who else should know?” (3) Write access notes (gate code, stairs, preferred name). (4) Agree who holds the next check-in before leaving.

**Never promise:** Medical advice, money, or “we’ll always be available tonight.”

**Access notes:** Prefer daylight visits; call before knocking if anxiety is high.

**Contact:** Circle carrier for this week (not the whole group chat).

**Deliverable:** Docs + demo note in the database.

**Definition of done:** Setup steps match what you actually run on Oracle.

---

### Day 13 — Production harden

**Goal:** TLS, secrets, production DB, same five tests on the live host.

**Tasks:**
- HTTPS (Let’s Encrypt or Oracle load balancer).
- Production env vars; debug mode off.
- Run the five tests against the public URL.
- Rate-limit join-by-code attempts if easy; otherwise log failures.

**Deliverable:** HTTPS URL + production test results.

**Definition of done:** Account B joins by code over HTTPS; Account C cannot read notes.

**Common mistake:** Shipping HTTP and calling it “online.”

---

### Day 14 — Soft launch without a pre-recruited circle

**Goal:** The product is usable by strangers; you are not the only memory.

**Tasks:**
- Create a demo circle with the sample practice and a publicized demo invite code on the landing page (optional, rate-limited).
- Or: no public demo code — only “create your own,” which still meets “usable online without asking them.”
- Watch first-session friction; fix copy only or a blocking bug.
- Three-line launch blurb for your own channels.

**Deliverable:** Public site where a stranger can complete the full journey; launch blurb written.

**Definition of done:** You are not required to DM anyone for the app to be useful.

**Common mistake:** Adding chat during launch day.

---

## Final MVP checklist

- [ ] Public site on Oracle with HTTPS
- [ ] Sign-up + short trust profile
- [ ] Create private circle + invite code
- [ ] Join by code; profiles visible only inside circle
- [ ] Practice notes + carrier + handoff
- [ ] Carrying list
- [ ] Non-members cannot read data
- [ ] Landing explains privacy and how to start

## Testing checklist

- [ ] Signed-out blocked from circle routes
- [ ] Wrong invite code fails
- [ ] Outsider cannot read notes by ID
- [ ] Member edit and handoff work
- [ ] Profile of member A visible to member B, not to outsider
- [ ] Empty title rejected
- [ ] Mobile width usable

## Deployment checklist (Oracle)

- [ ] Compute/container running the Next.js app
- [ ] Postgres reachable only from the app
- [ ] Secrets in env, not in git
- [ ] HTTPS
- [ ] Backups enabled or a documented dump script

## Launch checklist

- [ ] Landing works for a cold visitor
- [ ] Demo or empty-state path does not require your personal invite
- [ ] SECURITY.md matches production behavior
- [ ] Version 2 list written, not built

## Version 2 ideas

- Email when you are assigned a handoff
- Optional photo of an entrance (Object Storage) with access rules on the note
- Printable / offline export of the handbook
- Multiple circles per person with the same membership rules
- Soft verification badge later (still not a social network)

## Progress tracker

| Day | Title | Status | Fallback |
| --- | --- | --- | --- |
| 1 | Promise + Oracle stack | Done | Shorter README only |
| 2 | Schema + profiles | Done | No optional profile fields |
| 3 | App on Oracle | Done | Local + tunnel only until Day 5 |
| 4 | Auth + profile | Done | Display name only |
| 5 | Create circle + code | Done | Owner-only, no code yet |
| 6 | Join + see profiles | Done | Owner adds email manually |
| 7 | Notes + handoff | Done | Notes without received_at |
| 8 | Access control | Done | **Delay launch** |
| 9 | Edit / archive / a11y | Done | Edit only |
| 10 | Public landing | Done | Minimal “Sign up / Join” links |
| 11 | Break tests | Not started | Five manual checks |
| 12 | Docs + sample note | Not started | Sample note in README only |
| 13 | HTTPS production | Not started | Stay on staging URL |
| 14 | Soft launch | Not started | You + second account only |
