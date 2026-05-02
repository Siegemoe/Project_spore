# Project Spore — File Index

Generated: 2026-05-02 16:05:30

## Summary

| Category | Files | Size |
|----------|-------|------|
| Source Code | 215 | 1.27 MB |
| Build Artifacts (.next, node_modules) | 11407 | 587.25 MB |
| Docs/Planning (Cline_Info, etc.) | 18 | 0.73 MB |
| Root Config Files | 20 | 824.42 KB |

## Directory Structure

`
project_spore/
├── app/                    # Next.js App Router routes
├── components/             # React components
├── db/                     # Database migrations, policies, seeds
├── features/               # Feature modules (posts, comments, follows, etc.)
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities, API helpers, auth
├── prisma/                 # Prisma schema
├── supabase/               # ⚠️ Embedded Supabase starter app (separate Next.js project)
├── test/                   # Test files
├── types/                  # TypeScript types
├── .github/                # CI workflows
├── openapi/                # OpenAPI spec
├── Cline_Info/             # AI planning docs, roadmaps, architecture
├── .next/                  # Next.js build output (ignored)
├── node_modules/           # Dependencies (ignored)
`

## Root Files
- .eslintrc.json (0.08 KB)
- .vercelignore (0.07 KB)
- dev.db (188 KB)
- jest.config.js (1.24 KB)
- jest.setup.js (1.43 KB)
- LICENSE (10.78 KB)
- middleware.ts (1.87 KB)
- MIGRATIONS.md (2.18 KB)
- next.config.js (1.38 KB)
- next-env.d.ts (0.2 KB)
- package.json (1.48 KB)
- package-lock.json (427.23 KB)
- phase1_TODO.md (5.93 KB)
- postcss.config.js (0.08 KB)
- prisma.config.ts (0.35 KB)
- README.md (9.45 KB)
- sporetestwrite.txt (0.07 KB)
- tailwind.config.js (1.8 KB)
- tsconfig.json (0.86 KB)
- tsconfig.tsbuildinfo (169.95 KB)

## Key Source Directories

### app/
Next.js application routes:- admin/
- api/
- auth/
- dev/
- kanban/
- notifications/
- p/
- promo/
- search/
- settings/
- test/
- u/

### components/
React components organized by feature:- admin/
- auth/
- comments/
- follows/
- github/
- kanban/
- nav/
- posts/
- profile/
- providers/
- shared/
- ui/

### features/
Feature-based modules:- admin/
- comments/
- config/
- follows/
- github/
- health/
- moderation/
- posts/
- profile/
- security/

### db/
Database artifacts:
- migrations/phase1/ — Phase 1 schema migrations
- policies/phase1/ — RLS policies
- seeds/phase1/ — Seed data

## Cleanup Targets Identified

1. **Cline_Info/** — AI planning documents, roadmaps, architecture assessments. Not application code.
2. **supabase/** — Embedded Supabase Next.js starter app (has own package.json, .next/, node_modules/). The only used file is migrations/20250926_phase0_init.sql (referenced in README).
3. **phase1_TODO.md** — Build plan document.
4. **MIGRATIONS.md** — Legacy migration documentation (already in .gitignore).
5. **sporetestwrite.txt** — Test/placeholder file.
6. **dev.db** — Local SQLite development database.
7. **tsconfig.tsbuildinfo** — TypeScript incremental build cache.
8. **.next/** (root) — Next.js build output (reproducible).
