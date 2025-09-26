# Project Spore (Phase 0)

Vibe coders — publish MCPs, share projects, and connect.

This repo contains the Phase 0 scaffold: Next.js app with landing + waitlist, Supabase integration points, and contract-first API stub.

## Stack

- Web: Next.js 14 (App Router), TypeScript, TailwindCSS
- Infra: Vercel (web), Supabase (Auth + Postgres + Storage)
- Contract-first: OpenAPI stub for Phase 0 endpoint
- Telemetry: optional Sentry (env only, no code yet)

## Getting Started (local)

1) Prereqs:
- Node 20+
- Git
- (Optional) Supabase project access (Project_Spore, us-east-1)

2) Install dependencies:
```bash
npm ci
# or: npm install
```

3) Create `.env.local` based on `.env.example`:
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
# Only for local server-side admin ops (do not expose client-side)
SUPABASE_SERVICE_ROLE=YOUR_SUPABASE_SERVICE_ROLE
```

4) Run dev server:
```bash
npm run dev
# open http://localhost:3000
```

Landing page includes a waitlist form that posts to `/api/waitlist` (uses service role on server).

## Supabase

Project: Project_Spore (us-east-1), ref: `aehiqptugvakjtlvuixb`

Phase 0 migration (waitlist + extensions) is in:
```
supabase/migrations/20250926_phase0_init.sql
```
Apply it via Supabase SQL Editor (copy/paste) or via Supabase CLI if configured.

Notes:
- Table `public.waitlist_signups` has RLS enabled (no public reads).
- API route uses service role to insert (ensure `SUPABASE_SERVICE_ROLE` is set for server execution only).

Auth (Phase 0 minimal):
- Providers: GitHub, Google, Email (configure in Supabase Dashboard -> Authentication -> Providers)
- Allowed redirects should include your dev and Vercel preview/prod URLs.

Storage:
- Add a public bucket later (Stage 1). `next.config.js` allows images from `aehiqptugvakjtlvuixb.supabase.co`.

## OpenAPI (contract-first)

See:
```
openapi/spore.yaml
```
Contains the `POST /api/waitlist` contract with request/response definitions.

## Vercel

Project: Project_Spore
- Team: `team_EimZV5NL1ppNUPoHuJiqasEW`
- Project ID: `prj_f5yZSorXnOir8BA4hmCgbExbznVG`

Recommended mapping:
- Production: `main`
- Pre-prod: `staging`
- PRs: Preview deployments

Vercel env vars (Environment -> Production/Preview/Development):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` (set to deployed URL for prod; preview handled by Vercel)
- `SENTRY_DSN` (optional)

Do NOT set `SUPABASE_SERVICE_ROLE` in Vercel client envs. Use GitHub Actions Secrets (CI) or serverless envs only if needed.

## CI (suggested)

A basic CI workflow is recommended to run on PRs and on push to `staging`/`main`:
- Install deps (`npm ci`)
- Typecheck & build (`npm run build`)
- Lint (`npm run lint`)

See `.github/workflows/ci.yml` (added in this repo).

## Scripts

- `npm run dev` — start local dev server
- `npm run build` — build Next app
- `npm run start` — start production server locally
- `npm run lint` — next lint

## License

Apache-2.0 (see `LICENSE`).

## Roadmap

Phase 0 (this PR):
- Landing + waitlist
- Supabase migration for `waitlist_signups`
- Contract for `/api/waitlist`
- Minimal brand setup

Next (Stage 1 preview):
- Auth routes (GitHub/Google/Email)
- Feed, post composer, follows, comments
- Media upload (Supabase Storage)
- Realtime updates
