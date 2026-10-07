# Skills & Tools by Day

## Core tools throughout
- Git, Markdown
- Next.js (App Router) + TypeScript
- Postgres (Docker or Autonomous DB)
- NextAuth
- Tailwind CSS
- Oracle Cloud console, SSH, Docker, Linux basics

## Day-by-day skill needs

| Day | Title | Skills / tools |
| --- | --- | --- |
| 1 | Promise + Oracle stack | Git init, Markdown, project scoping |
| 2 | Schema + profiles | SQL schema design, markdown ER sketch |
| 3 | App alive on Oracle | Oracle Cloud (Compute/Container Instance), SSH, Node/npm, Docker optional, env vars |
| 4 | Auth + profile | NextAuth (magic link or credentials), session handling, form UX |
| 5 | Create circle + code | Server actions, Postgres inserts, invite code generation |
| 6 | Join + see profiles | Invite code validation, membership queries, profile visibility rules |
| 7 | Notes + handoff | Form fields to schema mapping, carrier assignment, received_at logic |
| 8 | Access control (non-negotiable) | Postgres RLS policies or strict server-side membership checks, outsider read testing, SECURITY.md |
| 9 | Edit / archive / UX | Prefilled edit forms, archived_at/changed_at, a11y basics, mobile CSS |
| 10 | Public landing | Next.js pages, copywriting, privacy messaging |
| 11 | Break tests | Manual or scripted tests (Playwright/Vitest acceptable, not required), friendly errors |
| 12 | Docs + sample practice | Technical writing on Oracle setup, seed data |
| 13 | HTTPS production | Let’s Encrypt / TLS, production env, secrets management, rate limiting join-by-code |
| 14 | Soft launch | Product demo circle, usability triage, launch blurb |

## Coding conventions to keep using
- Server actions or API routes for any read/write of circle data
- Membership check on every note/circle query
- Visible labels on all inputs
- No inline secrets; use `.env` locally and environment variables in Oracle
