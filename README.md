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

## Run it (Oracle VM)

1. Postgres: `docker run -d --name common-hearth-postgres -e POSTGRES_PASSWORD=... -e POSTGRES_DB=common_hearth -p 127.0.0.1:5436:5432 postgres:16-alpine`, then `psql -f schema.sql`.
2. App: `cd app && npm install && npm run build`.
3. Env vars in `app/.env.local` (never commit): `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.
4. `systemctl start common-hearth` (unit runs `next start -p 8099`); nginx proxies the public IP on :80 to it.
5. Live: `https://commonhearth.duckdns.org/` (Let’s Encrypt via certbot --nginx; HTTP redirects to HTTPS). Phone check: open the HTTPS URL.

## Access model

Every circle-scoped read/write goes through server code that checks the
signed-in user has a `memberships` row for that circle. No RLS for MVP;
see `SECURITY.md`. Invite codes are the join path; there is no public
circle directory.

## Demo circle

Sample circle "Common Hearth Demo" seeded with the sample practice note;
invite code `demo-hearth`.
