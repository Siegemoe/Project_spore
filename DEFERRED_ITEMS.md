# Deferred / Optional Items by Phase

> This document tracks items that were skipped, deferred, or identified as optional during each remediation phase. Revisit these before production launch.

---

## Phase 0 — Emergency Security (Completed)

### Accepted Residual Risks
- [ ] **Next.js HIGH vulnerabilities (4 remaining)** — Require Next.js 15/16 upgrade (breaking change). Current deploy target is Vercel, which mitigates some (image optimizer, disk cache). Plan: upgrade to Next.js 15+ in Phase 4.
- [ ] **`glob` HIGH via `eslint-config-next`** — Dev-only dependency. ESLint does not invoke glob CLI in a vulnerable way during normal operation. Will auto-resolve when Next.js is upgraded.
- [ ] **`dompurify` moderate bypasses** — Underlying `isomorphic-dompurify` has 8 moderate XSS bypasses. We sanitize input but should evaluate switching to a stricter sanitizer (e.g., `sanitize-html` or native DOM API sanitization).

### Skipped
- [ ] **Content-Security-Policy header** — Needs careful tuning per deployment domain. High value but requires testing all external assets (images, fonts, scripts).
- [ ] **CORS configuration** — Not needed for same-origin app today. Required if API is consumed by external clients or mobile apps later.

---

## Phase 1 — Base Stabilization (Completed)

### Skipped
- [ ] **Wire up rate limiting middleware** — `lib/ratelimit.ts` and `lib/middleware/ratelimit.ts` exist but are not applied to any routes. Deferred until auth system is rebuilt (Phase 3), since rate limits need to distinguish anon vs authenticated users.
- [ ] **Wire up CSRF protection middleware** — `lib/csrf.ts` and `lib/middleware/csrf.ts` exist but are not applied. Deferred until after auth migration; modern frameworks (NextAuth.js) handle CSRF automatically.
- [ ] **Fix `migrate-supabase.yml` syntax error** — Workflow is obsolete since we're leaving Supabase. Will be deleted in Phase 3.
- [ ] **Remove or env-gate dev pages** — `app/test/page.tsx`, `app/dev/profiles`, `app/dev/storage-test` still exist. Should be gated by `NODE_ENV === 'development'` or removed before public launch.
- [ ] **Create `/admin/analytics` page or remove link** — Still 404s from `/admin` dashboard card.
- [ ] **ESLint v8 → v9 migration** — EOL but functional. Breaking config changes. Plan: migrate alongside Next.js 15 upgrade.
- [ ] **Verify `dotenv` v17 legitimacy** — Appears legitimate (current major), but we should pin to a specific version in a future dependency audit.

---

## Phase 2 — Schema Unification (Completed)

### Skipped / Technical Debt
- [ ] **Prisma cannot generate partial/covering/expression indexes** — Documented in `prisma/migrations/00000000000000_raw_indexes/migration.sql`. Must be applied manually after first `prisma migrate dev`.
- [ ] **EXCLUDE constraint on `admins`** — Replaced with application-level check + DB trigger in raw SQL. Prisma does not support EXCLUDE.
- [ ] **~20 PL/pgSQL functions from SQL migrations** — All moved to application code responsibility. Functions like `get_report_stats()`, `calculate_threat_score()`, `is_ip_blocked()`, etc. must be reimplemented in TypeScript services.
- [ ] **Triggers (`update_updated_at_column`)** — Replaced with Prisma `@updatedAt`. Raw SQL triggers removed.
- [ ] **Views (`index_usage`, `missing_indexes`)** — DBA monitoring views. Not critical for app functionality. Can be recreated manually if needed.
- [ ] **`citext` extension** — Prisma `@db.Citext` requires the Postgres extension to be enabled. Ensure `CREATE EXTENSION IF NOT EXISTS citext;` is run on new databases.
- [ ] **Data migration from old Supabase schema** — No data to migrate (no Supabase access), but the ETL script pattern should be documented if we ever need to import backups.
- [ ] **`users.id` linked to `auth.users.id`** — Previously a foreign key to Supabase Auth. Now standalone UUID. Account linking logic must be handled in the new auth system.
- [ ] **`git_accounts` vs `users.githubHandle` duplication** — Both exist. We may want to normalize to one source of truth later.

---

## Phase 3 — Supabase Decoupling (In Planning)

### Intentionally Skipped (User Request)
- [ ] **Storage migration to S3/R2/Cloudflare** — On hold per user request. Current Supabase Storage (`media-public` bucket) will continue to be used for now. When resumed: migrate objects, update `media_url` columns, replace signed URL logic, update `next.config.js` image domains.

### Still Required
- [ ] **Auth replacement** — Replace `@supabase/ssr` and `@supabase/supabase-js` auth with NextAuth.js v5 (Auth.js) or Clerk. This is the biggest piece.
- [ ] **Database query migration** — Convert ~80 `getSupabaseAdmin().from("...")` call sites to Prisma Client queries.
- [ ] **Realtime replacement** — Replace `supabase.channel("postgres_changes")` with SSE, WebSockets, or polling. See discussion in ADRs.
- [ ] **Remove Supabase dependencies** — Uninstall `@supabase/supabase-js`, `@supabase/ssr`, and `supabase` CLI. Remove `lib/supabaseClient.ts`, `lib/supabaseServer.ts`, `lib/supabaseAdmin.ts`.
- [ ] **Middleware rewrite** — Replace Supabase cookie sync in `middleware.ts` with new auth session middleware.
- [ ] **Environment variables** — Remove Supabase vars from `.env.example`, add auth provider vars.

---

## Phase 4 — Feature Hardening (Backlog)

### Stubs to Implement
- [ ] `/search` — Project/user search
- [ ] `/notifications` — Notification feed
- [ ] `/settings` — Profile settings
- [ ] `/kanban` — Connect to real API or hide
- [ ] `/auth/signup` — Real signup flow
- [ ] `/admin/analytics` — Missing page

### Quality Gates
- [ ] **Test coverage 60%+** — Currently ~3%. Target: `lib/` utilities first, then feature actions, then API routes.
- [ ] **Integration tests** — Replace `test/rls/` with integration tests against Prisma + app auth.
- [ ] **Performance audit** — Add `sharp`, review query counts per page, add query caching where appropriate.
- [ ] **Next.js 15/16 upgrade** — Required to resolve remaining HIGH vulnerabilities.
- [ ] **Add Content-Security-Policy** — Restrictive CSP for production.
- [ ] **Rate limiting & CSRF wired up** — Apply after auth system is stable.

---

## Architectural Decisions To Revisit

| Decision | Current Choice | Alternatives | When to Revisit |
|----------|---------------|--------------|-----------------|
| Realtime | SSE (proposed) | WebSockets (Socket.io/PartyKit), Ably, Pusher, polling | Before implementing notifications |
| Auth | NextAuth.js v5 (proposed) | Clerk, Lucia, custom JWT | During Phase 3 planning |
| Storage | Supabase (on hold) | S3, R2, Backblaze B2, MinIO | When user resumes storage migration |
| DB | Postgres (unified schema) | PlanetScale (MySQL), SQLite (dev only) | Only if scaling issues arise |
| Notifications | Database polling (default) | SSE push, WebSocket push | When notification volume grows |
