# Common Hearth

Private care handbooks with trust profiles; public app, private circles.

## What it is
A public web app where small private circles keep a shared handbook of how they actually care for one another.

## MVP
- Public landing + sign-up
- Short trust profile
- Create a private circle
- Join via invite code
- Practice notes with the seven core fields
- Carrier + handoff received
- “Who is carrying what” list
- Members can read/edit notes; non-members cannot

## Postponed
Chat, payments, mobile app, public circle directory, social feed, likes, file uploads, SMS, multi-circle dashboards, AI summaries, time-banking currency.

## Stack
Next.js + Postgres on Oracle Cloud Compute + NextAuth.

## Oracle setup
One small Compute VM (free tier eligible) running Postgres in Docker, Node for the Next.js app, secrets in environment variables only. HTTP on a non-standard port until Day 13, then TLS. No Object Storage, IDCS, or other services needed for MVP.

## Docs
- `PLAN.md` — 14-day build plan
- `DESIGN.md` — data model and UI direction
- `SKILLS.md` — skills/tools by day
- `AGENTS.md` — AI contributor rules
