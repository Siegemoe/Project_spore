# Phase 1 — Core MVP Build Plan (2–3 weeks)

Principles
- Small PRs (<400 LOC), server actions over REST when feasible, RSC for reads
- One zod schema per action, types inferred across UI; no component/library sprawl
- RLS-first; no secrets in repo; CI must stay green

Environments
- Supabase: Project_Spore (us-east-1)
- Vercel: main=prod, staging=pre-prod
- Secrets: GitHub Actions/Vercel only

## M1 — Schema + RLS (2–3 days)
- [ ] SQL: create/alter tables
  - users (app profile: handle unique, display_name, avatar_url, bio, is_public)
  - posts (user_id, caption, media_url, media_type enum, created_at)
  - comments (post_id, user_id, body, created_at)
  - follows (follower_id, followee_id, is_accepted, unique pair, created_at)
  - git_accounts (user_id, github_login, github_user_id, connected_at)
  - repos (user_id, provider, repo_full_name, visibility, connected_at)
  - notifications (id, user_id, type, payload_json, created_at, read_at)
- [ ] RLS policies:
  - users: SELECT public; UPDATE own row
  - posts: INSERT/UPDATE by author; SELECT public and from follow graph
  - comments: INSERT/UPDATE by author; SELECT if post visible
  - follows: INSERT/DELETE by follower; unique pair enforced
  - git_accounts/repos: owner-only SELECT/INSERT
- [ ] Indexes: posts(user_id, created_at), follows(follower_id, followee_id), comments(post_id, created_at)
- [ ] Seeds: 2 users, 4 posts, 2 follows, 4 comments (sql file)
- [ ] Smoke: RLS negative tests (cannot edit others’ rows)
- [ ] CI: wire “Migrate Supabase (manual)” workflow docs in MIGRATIONS.md
- [ ] MCP supabase-mcp: list_tables/get_schema to verify columns
Acceptance:
- All tables exist; RLS enforced; CI migration run succeeds

## M2 — Posts: Composer + Upload + Feed (3–4 days)
- [ ] Storage: create bucket media-public; public read policy; CORS as needed
- [ ] Server action: posts.create({ caption, media })
  - Signed URL → client upload → insert post with media_url
  - zod schema for payload; content-type validation; max size guard
- [ ] Feed (RSC): query posts from self + followees; cursor pagination
- [ ] Realtime: subscribe to posts INSERT (publication configured)
- [ ] UI: mobile-first composer, feed cards; skeletons/empty/error states
- [ ] Tests: zod unit; feed query unit
- [ ] MCP: eslint-mcp (lint), dep-audit-mcp (security gate)
Acceptance:
- Create post with image; appears in feed without refresh; pagination OK

## M3 — Follows + Profile (2–3 days)
- [ ] Action: follows.toggle({ followeeId }) with optimistic UI; unique constraint handling
- [ ] Profile (RSC): avatar, handle, bio, follower/following counts
- [ ] Action: profile.update({ displayName?, bio? })
- [ ] Feed personalization uses follows table
- [ ] Tests: toggle behavior unit test
Acceptance:
- Follow/unfollow works; feed shows followees’ posts; profile updates persist

## M4 — Comments (2 days)
- [ ] Action: comments.create({ postId, body })
- [ ] Realtime: subscribe to comments on a post
- [ ] UI: comment list + input; collapsed thread (top-level only)
- [ ] Tests: zod + minimal action test
Acceptance:
- Users can comment; comments appear in near-real-time

## M5 — GitHub Connect (2 days)
- [ ] Supabase provider: enable GitHub OAuth (or separate connect flow if token not present)
- [ ] Action: github.listRepos() (read-only) → store top 10 public repos in repos
- [ ] UI: show repo list on profile
- [ ] RLS: repos owner-only
Acceptance:
- Connect GitHub; repos listed on profile; handles rate-limit gracefully

## M6 — Hardening + NFRs (1–2 days)
- [ ] Loading/empty/error states across pages
- [ ] Basic moderation hooks: hidden bool columns on posts/comments (no UI yet)
- [ ] Sentry minimal breadcrumbs (actions + client boundary)
- [ ] Perf: Next Image usage; add `sharp` dep; limit query count < 8/page
- [ ] Docs: update README (auth/media), OpenAPI if any REST fallback
Acceptance:
- Smooth UX, minimal logs/PII, no critical `npm audit` issues

## Server Actions & Contracts (zod)
- posts.create, posts.listFeed, comments.create, follows.toggle, profile.update, github.listRepos
- [ ] Co-locate zod schemas in `features/*/contract.ts`; infer types in actions/components
- [ ] Keep actions <120 LoC, components <150 LoC; one action per use-case

## CI & MCP gates
- [ ] ESLint (strict) + typecheck + build on PR
- [ ] dep-audit-mcp: fail on critical vulns; report outdated
- [ ] supabase-mcp: validate schema after migrations
- [ ] vercel-mcp: check deployment status after merge
- [ ] PR template: risk, rollout, validation steps; size <400 LOC; CODEOWNERS reviewers

## Exit Criteria (Phase 1)
- 10 testers can: sign in → post image → follow → comment; feed realtime works
- GitHub connect shows repo list
- RLS negative tests pass
- CI green; no critical vulnerabilities
- Staging verified; sign-off recorded

## Known risks & mitigations (summary)
- OAuth tokens: if Supabase doesn’t expose GitHub token, add separate “Connect GitHub” OAuth (read-only). Store encrypted token server-side with RLS by user_id.
- Realtime + RLS: ensure tables are in publication; write explicit SELECT policies so replication role can emit events. Add simple realtime smoke test.
- Storage/CORS: public bucket policy + correct content-type on upload; constrain size/mime; include Supabase CDN domain in next.config (done).
- Env drift: ensure NEXT_PUBLIC_APP_URL is the deployed URL in Vercel; add post-deploy validation.
- Query perf: add indexes; verify page query count <8; stream with RSC; avoid N+1.
- Rate limits: GitHub listing limited to 10 repos; use backoff and friendly errors.
- CI migrations: SUPABASE_DB_URL secret rotation can break workflow; MIGRATIONS.md documents recovery; manual SQL Editor fallback.
- typedRoutes friction: keep stubs for routes and use typed casts sparingly; avoid dead routes.
- Security/abuse: client debounce + DB constraints; hidden flag columns for moderation; do not expose service_role to client.
