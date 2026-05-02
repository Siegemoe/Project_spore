# Project Spore — Comprehensive Catalog & Remediation Plan

> **Context:** Social network for AI devs (GitHub project linking, team organization, discovery, comments). Moving from Supabase to Prisma/Postgres. No access to existing Supabase data.
> **Goal:** Stabilize and secure the codebase; establish a single schema source of truth; plan full Supabase decoupling.

---

## 1. Executive Summary

| Dimension | Status | Key Risk |
|-----------|--------|----------|
| **Security** | 🔴 Critical | Next.js 14.2.5 has a CVSS 9.1 middleware auth bypass + 35+ vulnerable packages. Rate limiting & CSRF are implemented but **never wired up**. |
| **Dependencies** | 🔴 Critical | ~35 npm audit failures. ESLint v8 EOL. Prisma 7.2.0 flagged. `dotenv` v17 suspicious major jump. |
| **Schema** | 🔴 Critical | **Two divergent schemas** exist (Supabase SQL migrations vs Prisma SQLite). Only ~5 tables overlap. Prisma schema is largely unused by the running app. |
| **Architecture** | 🟡 Fair | Clean feature-module structure, good App Router usage (~18 server pages, ~5 client pages). Many placeholder/stub routes. |
| **Supabase Lock-in** | 🔴 High | Auth, storage, realtime, and ~80 DB call sites depend on Supabase. Entire session middleware is `@supabase/ssr`. |
| **Testing** | 🔴 Critical | ~3% coverage, 1 failing test suite, **CI does not run tests**. |
| **Config/Env** | 🟡 Fair | Missing env vars in `.env.example`. Hardcoded Supabase/Vercel URLs. Dead env vars. |

---

## 2. Current State Catalog

### 2.1 Technology Stack & Dependencies

**Runtime:** Node 18+, Next.js 14.2.5 (App Router), React 18.3.1, TypeScript 5.4.5

**Core Stack:**
- UI: TailwindCSS 3.4.10, Geist font
- Data Fetching: React Query 5.90.2 (client), Server Components (RSC reads)
- Validation: Zod 3.25.76
- ORM: Prisma 7.2.0 (installed but **app uses Supabase JS clients exclusively**)
- Auth/DB/Storage/Realtime: Supabase (`@supabase/supabase-js` 2.45.3, `@supabase/ssr` 0.7.0)
- Rate Limiting: Upstash Redis (`@upstash/ratelimit` 2.0.6) — **dead code**
- Sanitization: `isomorphic-dompurify` 2.30.1 (underlying DOMPurify has 8 moderate bypasses)

**Dev Stack:**
- Test: Jest 30.2.0, Testing Library, jsdom
- Lint: ESLint 8.57.0 (**EOL**), `eslint-config-next` 14.2.5
- CSS: PostCSS 8.4.41 (XSS CVE patched in 8.5.10+)

**Critical Dependency Issues:**
| Package | Issue | Action |
|---------|-------|--------|
| `next` 14.2.5 | CVSS 9.1 middleware bypass (GHSA-f82v-jwr5-mffw) + 6 HIGH + 5 MODERATE | Upgrade to 14.2.35+ immediately |
| `prisma` 7.2.0 | Transitive `effect` / `hono` vulns | Verify if intentional; consider 6.x stable |
| `eslint` 8.57.0 | End-of-life | Migrate to ESLint v9 |
| `postcss` 8.4.41 | XSS via `</style>` | Upgrade to 8.5.10+ |
| `dompurify` (transitive) | 8 XSS/prototype-pollution bypasses | Update or replace sanitizer |
| `dotenv` 17.2.3 | Suspicious jump from 16.x | Verify legitimacy; pin to 16.4.7 if unsure |


---

### 2.2 Application Architecture

#### Route Map (23 pages, 12 API routes)

| Route | Type | Status |
|-------|------|--------|
| `/` | Server | Home feed (SSR hydrated) |
| `/auth/signin` | Client | GitHub OAuth |
| `/auth/callback` | Client | OAuth callback |
| `/auth/signup` | Server | Placeholder |
| `/p/[id]` | Server | Post detail + comments |
| `/u/[handle]` | Server | Profile |
| `/u/[handle]/followers` | Server | Follower list |
| `/u/[handle]/following` | Server | Following list |
| `/u/me` | API | Redirect to current user profile |
| `/admin` | Server | Dashboard |
| `/admin/audit` | Server | Audit log |
| `/admin/health` | Server | Health metrics |
| `/admin/moderation` | Server | Moderation queue |
| `/admin/security` | Server | Security alerts |
| `/admin/users` | Server | User management |
| `/admin/users/[id]` | Server | User detail |
| `/admin/analytics` | — | **Missing** (linked from `/admin` but 404s) |
| `/settings` | Server | Placeholder |
| `/search` | Server | Stub |
| `/notifications` | Server | Stub |
| `/kanban` | Client | Mock data only |
| `/promo` | Client | Waitlist landing |
| `/test` | Server | Dev-only, unguarded |
| `/dev/profiles` | Server | Dev-only, unguarded |
| `/dev/storage-test` | Client | Dev-only, unguarded |

**API Endpoints:**
- `POST /api/waitlist` — Waitlist signup
- `GET /api/feed` — Public feed (cursor pagination)
- `GET /api/user-posts` — User posts
- `GET /api/user-comments` — User comments
- `GET /api/comments` + `POST /api/comments` — Comment CRUD
- `POST /api/profile/update` — Profile update
- `POST /api/github/connect` — GitHub account link
- `GET /api/storage/debug` — Storage RLS introspection (RPC)
- `POST /api/auth/sync` — Auth user sync
- `POST /api/auth/signout` — Sign out
- `GET /api/auth/debug` — Session debug

#### Feature Modules (`features/`)

All follow `actions.ts` (+ optional `contract.ts` + optional `hooks.ts`) pattern:

| Module | Actions | Hooks | Contracts |
|--------|---------|-------|-----------|
| `posts` | `getUploadTarget`, `createPost`, `listFeed` | `useFeed` | `PostInsert`, `FeedQuery` |
| `comments` | `createComment`, `listComments` | `useComments` | `CommentInsert` |
| `follows` | `toggleFollow` | `useFollow` | `FollowToggle` |
| `profile` | `updateProfile`, `getContributionCounts` | — | `ProfileUpdate` |
| `github` | `fetchPublicRepos` | — | `Repo`, `RepoList` |
| `admin` | `searchUsers`, `getUserDetails`, `generateRecoveryLink`, `deleteUser` | — | — |
| `config` | `getSystemConfig`, `updateSystemConfig`, `getFeatureFlags` | — | — |
| `health` | `getHealthMetrics`, `getSystemHealth`, `getAPIPerformance` | — | — |
| `moderation` | `listReports`, `resolveReport`, `createReport`, `warnUser` | — | — |
| `security` | `listSecurityEvents`, `getSecurityStats`, `logSecurityEvent` | — | — |

#### Component Architecture

- **48 components** in `components/`, organized by domain
- **App shell:** `AppChrome` wraps `TopBar` + `DesktopSidebar` + `MobileTabBar` + lazy `Composer`
- **Error boundaries:** Domain-specific (`FeedErrorBoundary`, `KanbanErrorBoundary`)
- **Shared UI primitives:** `Avatar`, `Button`, `Input`, `Sheet`, `Textarea`

#### Dead / Unused Code

| File | Issue |
|------|-------|
| `lib/db-pool.ts` | 212-line connection pool wrapper; **never imported** |
| `lib/auth/session-manager.ts` | 272-line session manager; possibly superseded by `session.ts` |
| `AUTH_REDIRECT_URLS` env var | Documented but **never referenced in code** |
| `prisma/schema.prisma` | Schema defined but app uses Supabase clients exclusively |
| `app/admin/analytics` | Linked but page does not exist |


---

### 2.3 Database Schema — The Dual-Schema Problem

This is the most critical structural issue. There are **two completely divergent schemas**.

#### Schema A: Supabase SQL Migrations (`db/migrations/phase1/`)
- **~20 tables** defining the production Postgres schema
- Heavy use of PostgreSQL-specific features: `citext`, `inet`, `jsonb`, `timestamptz`, partial indexes, covering indexes, expression indexes, `EXCLUDE` constraints, `CHECK` constraints, triggers, ~20 PL/pgSQL functions, views
- RLS policies on every table (defense-in-depth)
- Supabase Auth integration: `users.id` semantically linked to `auth.users.id`
- Supabase Storage: `storage.buckets`, `storage.objects` with RLS
- Supabase Realtime: publication `supabase_realtime` includes `posts`, `comments`

#### Schema B: Prisma SQLite (`prisma/schema.prisma`)
- **~15 tables** defining a SQLite-oriented schema
- Includes tables **not in SQL**: `tech_stacks`, `user_stacks`, `projects`, `kanban_boards`, `kanban_columns`, `kanban_tasks`, `task_dependencies`, `tags`, `post_tags`, `likes`
- Missing tables **from SQL**: `waitlist_signups`, `git_accounts`, `repos`, `admins`, `admin_audit_log`, `content_reports`, `moderation_actions`, `user_moderation_status`, `security_events`, `ip_blocklist`, `threat_scores`, `api_metrics`, `system_health`, `active_users`, `user_sessions`, `login_attempts`, `account_locks`, `system_config`

#### Overlap Tables (both schemas define these, but differently)

| Table | SQL Migrations | Prisma Schema | Divergence |
|-------|---------------|---------------|------------|
| `users` | `is_public`, `websites` (jsonb), `email_public` | `email`, social handles, `maker_score`, `available_for_hire` | Different columns entirely |
| `posts` | `media_type` | `project_id`, `content_type`, `metadata` | Prisma richer |
| `comments` | basic | missing `updated_at` | minor |
| `follows` | composite PK | surrogate `id` + `@@unique` | PK strategy differs |
| `notifications` | `payload_json` (jsonb), `read_at` | `content` (string), `is_read` (bool) | Different data shapes |
| `admins` / `admin_users` | `granted_by`, `revoked_at`, `EXCLUDE` constraint | simplified | Prisma much simpler |

**Verdict:** The Prisma schema appears to represent an aspirational/phase-2 design, while the SQL migrations represent the actual running schema. The app code queries the Supabase SQL schema. Prisma is currently a dependency with no runtime role.

---

### 2.4 Supabase Dependency Map

#### Client Initialization (4 files)
- `lib/supabaseClient.ts` — Browser client (`createBrowserClient`)
- `lib/supabaseServer.ts` — Server anon client (`createServerClient` + cookie sync)
- `lib/supabaseAdmin.ts` — Service role client (bypasses RLS)
- `lib/db-pool.ts` — Unused pooled client

#### Auth (~30 call sites)
- **OAuth:** `signInWithOAuth({ provider: "github" })` in signin page
- **Session:** `getSession()`, `getUser()`, `onAuthStateChange` across hooks, providers, middleware
- **Admin SDK:** `generateLink`, `getUserById`, `deleteUser` in admin user-actions
- **Middleware:** Entire cookie sync is `@supabase/ssr`

#### Database Queries (~80 call sites)
Nearly every feature module uses `getSupabaseAdmin().from("...")`. Key tables:
- `posts`, `comments`, `follows`, `users` — social core
- `git_accounts`, `repos` — GitHub integration
- `admins`, `admin_audit_log` — admin stack
- `content_reports`, `moderation_actions`, `user_moderation_status` — moderation
- `security_events`, `ip_blocklist`, `threat_scores` — security
- `api_metrics`, `system_health`, `active_users` — health metrics
- `user_sessions`, `login_attempts`, `account_locks` — session management
- `system_config` — feature flags / config
- `waitlist_signups` — landing page

#### RPC / Stored Procedures (~12 call sites)
- `remove_content_transaction`, `warn_user_transaction` — atomic moderation
- `count_active_users`, `get_api_performance`, `get_health_summary`, `get_error_rate` — analytics
- `get_security_stats`, `calculate_threat_score` — security
- `get_report_stats` — moderation dashboard
- `debug_storage_policies` — storage introspection

#### Storage (~6 call sites)
- Bucket: `media-public`
- Client upload: `Composer.tsx`
- Public URL: `features/posts/actions.ts`
- Dev test page: `dev/storage-test`

#### Realtime (~2 call sites)
- `FeedClient.tsx` — `postgres_changes` on `posts` INSERT
- `CommentsClient.tsx` — `postgres_changes` on `comments` INSERT for post


---

### 2.5 Security Posture

#### Positive
- No hardcoded secrets in source files
- No `eval()`, `dangerouslySetInnerHTML`, or raw `innerHTML`
- DOMPurify sanitization layer present (`lib/sanitize.ts`)
- CSRF token generation exists (`lib/csrf.ts`)
- Rate limiting definitions exist (`lib/ratelimit.ts`)
- Custom error classes (`lib/errors.ts`)
- `.env.local` is untracked

#### Critical Gaps
1. **Next.js 14.2.5 authorization bypass** (CVSS 9.1) — middleware can be bypassed
2. **Rate limiting is dead code** — `withRateLimit` / `enforceRateLimit` never imported by any route
3. **CSRF protection is dead code** — `withCSRFProtection` / `withSecurity` never imported by any route
4. **API routes cache responses as `public`** — authenticated data could leak across users at CDN/edge
5. **Missing security headers** — no CSP, X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy
6. **Admin auth not enforced in middleware** — comment explicitly says it's in `app/admin/layout.tsx` instead
7. **DOMPurify has 8 moderate bypass vulnerabilities**

#### Moderate Gaps
- Hardcoded Supabase domain in `next.config.js` and `lib/cache-headers.ts`
- Hardcoded Vercel URL in `lib/csrf.ts` origin whitelist (breaks preview deploys)
- `images.domains` deprecated in favor of `images.remotePatterns`
- No CORS configuration

---

### 2.6 Environment & Configuration

#### Env Var Inventory

| Variable | Purpose | In `.env.example`? | Used? |
|----------|---------|-------------------|-------|
| `NEXT_PUBLIC_APP_URL` | App base URL | Yes | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | Yes | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Yes | Yes |
| `SUPABASE_SERVICE_ROLE` | Service role (server-only) | Yes | Yes |
| `UPSTASH_REDIS_REST_URL` | Rate limit Redis | Yes | Yes (but rate limiting unwired) |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limit Redis | Yes | Yes (but rate limiting unwired) |
| `SENTRY_DSN` | Error tracking | Yes | Yes |
| `NEXT_PUBLIC_NEW_MOBILE_UI` | Feature flag | Yes | Yes |
| `NEXT_PUBLIC_ENABLE_ADMIN` | Feature flag | **No** | Yes |
| `SUPABASE_POOLING_URL` | Pooling URL | **No** | Yes (in dead `db-pool.ts`) |
| `SUPABASE_READ_REPLICA_URL` | Read replica | **No** | Yes (in dead `db-pool.ts`) |
| `AUTH_REDIRECT_URLS` | Redirect URLs | Yes | **No** — Dead |
| `DATABASE_URL` | Prisma connection | **No** | **No** — Dead |
| `DIRECT_URL` | Prisma direct | **No** | **No** — Dead |

---

### 2.7 Testing & CI/CD

#### Test Coverage
| Metric | Value | Threshold |
|--------|-------|-----------|
| Statements | 3.01% | 60% ❌ |
| Branches | 2.43% | 60% ❌ |
| Functions | 2.64% | 60% ❌ |
| Lines | 3.08% | 60% ❌ |

#### Test Suites
| Suite | Status |
|-------|--------|
| `lib/__tests__/csrf.test.ts` | ✅ 7 pass |
| `lib/__tests__/sanitize.test.ts` | ✅ 20 pass |
| `lib/__tests__/error-handler.test.ts` | ✅ 10 pass |
| `lib/media/__tests__/validator.test.ts` | ❌ 4 fail |

**Failure reasons:** `sanitizeFilename` expectation mismatch + `TextEncoder` not defined in jsdom.

#### CI/CD
- **`.github/workflows/ci.yml`** — runs `lint`, `typecheck`, `build`. **Does NOT run tests.**
- **`.github/workflows/migrate-supabase.yml`** — manual workflow with shell syntax error on line 37.


---

## 3. Risk Assessment Matrix

| Risk | Likelihood | Impact | Score | Mitigation Priority |
|------|------------|--------|-------|---------------------|
| Middleware auth bypass exploited | Medium | Critical | 🔴 P0 | Upgrade Next.js immediately |
| npm audit vulns exploited | Medium | High | 🔴 P0 | `npm audit fix` + upgrades |
| Cross-user data leak via CDN cache | Medium | High | 🔴 P0 | Fix API cache headers |
| Supabase auth discontinuation / price hike | Medium | High | 🟠 P1 | Plan auth migration |
| Schema drift causes data loss on migration | High | Critical | 🟠 P1 | Unify schema before any migration |
| Zero test coverage → regressions | High | Medium | 🟠 P1 | Fix tests + add CI step |
| Rate limiting / CSRF absent → abuse | Medium | Medium | 🟠 P1 | Wire up middleware |
| Placeholder pages in production | Low | Low | 🟡 P2 | Remove or env-gate |
| Dead code confusion | Low | Low | 🟡 P2 | Remove unused files |

---

## 4. Remediation Roadmap

### Phase 0 — Emergency Security (Do Today)

1. **Upgrade `next` to `14.2.35` or latest 14.x**
   - Fixes CVSS 9.1 middleware bypass and 6 HIGH severity issues.
2. **Run `npm audit fix`**
   - Resolves transitive `lodash`, `tar`, `flatted`, `defu`, `minimatch`, `picomatch` issues.
3. **Upgrade `postcss` to `^8.5.10`**
   - Fixes XSS via unescaped `</style>`.
4. **Evaluate `prisma` 7.2.0**
   - If this was an accidental major bump, downgrade to latest stable 6.x. If intentional, monitor for patched release.
5. **Fix API cache headers**
   - Change `/api/:path*` from `public, max-age=30` to `private, no-cache` or add `Vary: Authorization, Cookie`.
6. **Add baseline security headers in `next.config.js`:**
   ```js
   {
     key: 'X-Frame-Options', value: 'DENY'
   },
   {
     key: 'X-Content-Type-Options', value: 'nosniff'
   },
   {
     key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'
   }
   ```

### Phase 1 — Base Stabilization (This Week)

1. **Fix failing tests**
   - `sanitizeFilename`: update test expectation or logic.
   - `TextEncoder`: add polyfill to `jest.setup.js`.
2. **Add `npm test` to CI**
   - `.github/workflows/ci.yml` should run tests before build.
3. **Remove or env-gate dev pages**
   - `app/test/page.tsx`, `app/dev/**` should require `process.env.NODE_ENV === 'development'` or be deleted.
4. **Remove dead code**
   - `lib/db-pool.ts`
   - `AUTH_REDIRECT_URLS` env var
   - Verify if `lib/auth/session-manager.ts` is used; remove if not.
5. **Fix `.env.example`**
   - Add `NEXT_PUBLIC_ENABLE_ADMIN`
   - Remove `AUTH_REDIRECT_URLS` (or implement it)
   - Remove `DATABASE_URL` / `DIRECT_URL` if Prisma stays SQLite-only for now
6. **Fix hardcoded URLs**
   - Replace Supabase domain in `next.config.js` with env var reference.
   - Replace Vercel URL in `lib/csrf.ts` with `NEXT_PUBLIC_APP_URL`.
7. **Wire up rate limiting & CSRF**
   - Apply `withRateLimit` to all `POST/PUT/PATCH/DELETE` API routes.
   - Apply `withCSRFProtection` to state-changing routes.
   - Or create a single `withSecurity` wrapper and apply globally.
8. **Fix `migrate-supabase.yml` shell syntax error** on line 37.

### Phase 2 — Schema Unification (Next 1–2 Weeks)

**Goal:** One `schema.prisma` (Postgres provider) that is the single source of truth for the entire application.

1. **Merge schemas**
   - Start from current `prisma/schema.prisma`.
   - Add all tables from SQL migrations that are missing (`git_accounts`, `repos`, `admins`, `admin_audit_log`, `content_reports`, `moderation_actions`, `user_moderation_status`, `security_events`, `ip_blocklist`, `threat_scores`, `api_metrics`, `system_health`, `active_users`, `user_sessions`, `login_attempts`, `account_locks`, `system_config`, `waitlist_signups`).
   - Reconcile `users` and `follows` columns (keep both SQL and Prisma columns where they don't conflict).
2. **Choose Postgres provider**
   - Update `schema.prisma` to `provider = "postgresql"`.
   - Map `citext` → `@db.Citext`, `timestamptz` → `DateTime @db.Timestamptz`, `jsonb` → `Json`, `inet` → `String` (or raw type).
3. **Replace Postgres-specific logic**
   - Triggers (`update_updated_at_column`) → Prisma `@updatedAt` or middleware.
   - Functions (`is_admin`, `has_admin_permission`, `is_ip_blocked`, `get_config`, etc.) → application services.
   - Atomic transaction functions (`remove_content_transaction`, `warn_user_transaction`) → Prisma `$transaction`.
   - Views (`index_usage`, `missing_indexes`) → remove or keep as raw SQL for DBAs.
4. **Handle indexes Prisma can't generate**
   - Partial indexes, covering indexes, expression indexes → add via raw migration files after `prisma migrate dev`.
   - `EXCLUDE` constraint on `admins` → enforce "one active admin per user" in app logic.
5. **Clean up unused tables**
   - `waitlist_signups` — drop if waitlist phase is over.
   - Consolidate `git_accounts` vs `users.githubHandle` — pick one GitHub identity store.
6. **Generate first unified migration**
   - `prisma migrate dev --create-only`
   - Review generated SQL, add raw index/constraint SQL as needed.
   - This becomes the new `prisma/migrations/` baseline.

### Phase 3 — Supabase Decoupling (Next 2–4 Weeks)

**Goal:** Remove all `@supabase/*` dependencies and replace with Prisma + custom auth + S3-compatible storage.

1. **Replace Auth**
   - **Decision needed:** NextAuth.js (Auth.js), Clerk, or custom JWT?
   - For GitHub OAuth, NextAuth.js v5 (Auth.js) is the lowest-friction replacement.
   - Replace `lib/supabaseClient.ts`, `lib/supabaseServer.ts`, `lib/supabaseAdmin.ts` with auth client wrappers.
   - Replace `middleware.ts` cookie sync with Auth.js session middleware or custom JWT session.
   - Update `users` table to store provider tokens/account linking (or use `accounts` table pattern from Auth.js).
   - Replace admin SDK calls (`generateLink`, `getUserById`, `deleteUser`) with direct DB queries.

2. **Replace Database Queries**
   - Systematically convert `getSupabaseAdmin().from("...")` → `prisma.[model].[action]`.
   - ~80 call sites across features, API routes, and lib files.
   - Complexity: Medium — mostly mechanical, but requires understanding Supabase query shapes.

3. **Replace Storage**
   - Decision: AWS S3, Cloudflare R2, MinIO, or Backblaze B2?
   - Replace `supabase.storage.from("media-public").upload()` with S3 SDK `PutObject` + presigned URLs.
   - Update `media_url` columns to store public HTTPS URLs.
   - Update `next.config.js` image domains.

4. **Replace Realtime**
   - Decision: Ably, Pusher, SSE (Server-Sent Events), or polling?
   - For a social feed, **SSE** is often sufficient and simpler than WebSockets.
   - Replace `supabase.channel("posts-insert")` with an SSE endpoint + `EventSource` on client.

5. **Clean up**
   - Remove `@supabase/supabase-js`, `@supabase/ssr` from dependencies.
   - Remove `lib/supabaseClient.ts`, `lib/supabaseServer.ts`, `lib/supabaseAdmin.ts`.
   - Update `.env.example` to remove Supabase vars, add new auth/storage vars.

### Phase 4 — Feature Hardening (Ongoing)

1. **Remove stubs / complete features**
   - `/search` — implement project/user search
   - `/notifications` — implement notification feed
   - `/settings` — implement profile settings
   - `/kanban` — connect to real API or hide
   - `/admin/analytics` — create missing page or remove link
2. **Increase test coverage**
   - Target 60%+ on `lib/` utilities first.
   - Add integration tests for API routes.
   - Replace `test/rls/` (Supabase RLS tests) with integration tests against Prisma + app auth.
3. **Migrate ESLint v8 → v9**
4. **Add Content-Security-Policy**
5. **Performance:** Add `sharp` for image optimization, review query counts per page.


---

## 5. Appendix: Complete File Inventory

### Source Code by Directory

```
app/                        # 42 files — Next.js routes
├── admin/                  # Dashboard + sub-pages
├── api/                    # 12 API route handlers
├── auth/                   # Signin, signup, callback
├── dev/                    # Dev-only pages (should be gated)
├── kanban/                 # Mock-data demo
├── notifications/          # Stub
├── p/[id]/                 # Post detail
├── promo/                  # Waitlist landing
├── search/                 # Stub
├── settings/               # Placeholder
├── test/                   # Dev test page
├── u/                      # Profile routes
├── error.tsx               # Global error boundary
├── layout.tsx              # Root layout
├── loading.tsx             # Global skeleton
├── not-found.tsx           # 404
├── page.tsx                # Home feed

components/                 # 48 components
├── admin/                  # 9 admin dashboard components
├── auth/                   # AuthProvider, ProfileBadge
├── comments/               # CommentsClient, CommentSheet
├── follows/                # FollowButton
├── github/                 # ConnectButton
├── kanban/                 # 6 kanban components
├── nav/                    # AppChrome, sidebars, top bar
├── posts/                  # Composer, FeedClient, PostCard
├── profile/                # 8 profile components
├── providers/              # QueryProvider
├── shared/                 # Error boundaries, loading, skip link
├── ui/                     # Primitives (Avatar, Button, Input, etc.)

features/                   # 10 feature modules
├── admin/                  # user-actions.ts
├── comments/               # actions, contract, hooks
├── config/                 # actions
├── follows/                # actions, contract, hooks
├── github/                 # actions, contract
├── health/                 # actions
├── moderation/             # actions
├── posts/                  # actions, queries, contract, hooks
├── profile/                # actions, contract
├── security/               # actions

lib/                        # 25 files
├── admin/                  # auth.ts, audit.ts
├── api/                    # response.ts
├── auth/                   # session.ts, session-manager.ts
├── media/                  # validator.ts, processor.ts
├── middleware/             # csrf.ts, ratelimit.ts
├── __tests__/              # csrf, sanitize, error-handler
├── cache-headers.ts
├── config.ts
├── cn.ts
├── csrf.ts
├── db-pool.ts              # UNUSED
├── error-handler.ts
├── errors.ts
├── ratelimit.ts
├── sanitize.ts
├── supabaseAdmin.ts
├── supabaseClient.ts
├── supabaseServer.ts

hooks/                      # 4 hooks
├── useBreakpoint.ts
├── useCurrentUser.ts
├── useFocusManagement.ts
├── useMediaQuery.ts

types/                      # 1 file
├── index.ts                # Centralized type definitions (338 lines)

db/                         # 21 files
├── migrations/             # Phase 1 SQL migrations
│   ├── 0000_phase0_init.sql
│   ├── phase1/0001_core.sql … 0013_profile_enhancements.sql
├── policies/               # RLS policies
├── seeds/                  # Seed data

prisma/                     # 3 files
├── schema.prisma           # Divergent SQLite schema
├── migrations/             # One SQLite migration

.github/workflows/          # 2 files
├── ci.yml
├── migrate-supabase.yml    # Has syntax error
```

---

*Generated: 2026-05-02*
*Auditors: Dependency/Security, Supabase Usage, Database Schema, App Architecture, Environment/Config*
