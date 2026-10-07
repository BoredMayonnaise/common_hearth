# Common Hearth — AI Agent Guide

**Project promise:** Private care handbooks with trust profiles; public app, private circles.

This repository is the source of truth for the product scope and build plan.

## Hard constraints for any AI contributor

- Do not add chat, payments, a mobile app, public circle directories, social features, likes, file uploads, SMS, AI summaries, time-banking currency, or multi-circle dashboards to the MVP.
- Privacy rule: the *app* is public and usable online, but **circles stay private**. Profiles are visible only inside the same circle. Invite codes are the join path; no public "find a circle" UI in MVP.
- Auth and membership checks must live in server code (server actions / API routes / DB RLS), never only in React client components.
- Health-adjacent data: if access control (Day 8) slips, delay the public launch. Do not ship weak authorization to "catch up."
- Checkpoint discipline: after each checkpoint day, if we slip more than one day, use that day's fallback; do not add features.
- Secrets and DB URLs go in environment variables only; never commit them.
- Accessible UX: every form input has a visible label, keyboard tab order works, layout is usable at 375px width.

## Stack (locked for MVP)

- Next.js (App Router) on Oracle Cloud Compute (VM or Container Instance)
- Postgres (Docker on the same VM, or Autonomous Database free tier)
- NextAuth for authentication
- Oracle Object Storage only if/when file uploads are ever added (postponed)
- Tailwind for styling

## Where to look

- `PLAN.md` — full 14-day plan, checklists, tracker
- `DESIGN.md` — data model, note fields, access control model, UI direction
- `SKILLS.md` — skills and tools mapped to each day
- `README.md` — one-line promise, MVP/postponed lists, Oracle setup (create on Day 1 if not present)

## Working style

- One feature per day; keep daily deliverables small and testable.
- Prefer the simpler fallback when behind.
- Fix the worst bug only when checkpointing; leave cosmetic issues for Day 9.
