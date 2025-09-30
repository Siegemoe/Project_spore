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

Storage (Phase 1):
- Public bucket: media-public
  - Create via SQL (recommended): run the migration:
    - File: db/migrations/phase1/0002_storage_bucket.sql
    - This is idempotent and will create a public bucket named media-public if missing.
  - Apply RLS policies:
    - File: db/policies/phase1/0004_storage_policies_install.sql
    - Allows public READ on media-public and authenticated WRITE limited to own prefix {auth.uid()}/...
- Images config: next.config.js already allows images from aehiqptugvakjtlvuixb.supabase.co
- CORS (Supabase Dashboard → Storage → Settings):
  - Allowed origins: add your local and deployed app URLs (e.g., http://localhost:3000, https://project-spore.vercel.app)
  - Allowed methods: GET, PUT, POST, DELETE
  - Allowed headers: Content-Type, Authorization
  - Expose headers: ETag
  - Max age: 3600 (or your preference)

Troubleshooting (policies)
- If running db/policies/phase1/0004_storage_policies_install.sql shows:
  - ERROR: 42501: must be owner of table objects
- Cause: creating/dropping policies on storage.objects requires the table owner role (postgres/supabase_admin). 
- Fix (any one of these):
  1) Supabase Dashboard → SQL Editor → Run as owner (toggle the “Run as owner” / service role option) and re‑execute the file.
  2) Supabase Dashboard → Storage → Policies UI: create equivalent policies manually for bucket media-public:
     - Public Read (SELECT) when bucket_id = 'media-public'
     - Authenticated Insert/Update/Delete restricted to objects whose name starts with auth.uid() || '/'
  3) If using Supabase CLI/migrations, execute the policy SQL using the service_role connection string.

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

## Data Fetching Architecture

Project Spore uses **React Query** (@tanstack/react-query) for client-side data fetching, caching, and state management. This provides:
- Automatic background refetching
- Optimistic updates
- SSR hydration
- Efficient cache invalidation

### Core Hooks

**Feed (`features/posts/hooks.ts`)**
- `useFeed()` — Infinite scroll feed with cursor-based pagination
- Supports SSR hydration via `initialPage` prop
- Integrates with realtime subscriptions for staged updates

**Comments (`features/comments/hooks.ts`)**
- `useComments()` — Fetch comments for a post
- `useCreateComment()` — Create comment with optimistic updates

**Follows (`features/follows/hooks.ts`)**
- `useFollowState()` — Check if user is following another user
- `useToggleFollow()` — Toggle follow/unfollow with cache invalidation

### SSR Pattern

Server components (e.g., `app/page.tsx`) prefetch data and dehydrate the React Query cache:

```typescript
import { QueryClient, dehydrate } from "@tanstack/react-query";
import { Hydrate } from "@/components/providers/QueryProvider";

export default async function Page() {
  const queryClient = new QueryClient();
  
  // Prefetch data
  await queryClient.prefetchInfiniteQuery({
    queryKey: feedQueryKey(viewerId),
    queryFn: () => fetchInitialData(),
    initialPageParam: undefined,
  });
  
  const dehydratedState = dehydrate(queryClient);
  
  return (
    <Hydrate state={dehydratedState}>
      <ClientComponent />
    </Hydrate>
  );
}
```

Client components consume the hydrated data seamlessly:

```typescript
export default function ClientComponent() {
  const { data, fetchNextPage } = useFeed({ viewerId });
  // Data is immediately available from SSR
}
```

### Realtime Integration

Realtime subscriptions (Supabase) work alongside React Query:
- New items are staged in local state (avoiding content shift)
- User taps banner to merge staged items
- Optimistic updates handle create/update mutations
- React Query invalidates cache after successful mutations

## Roadmap

Phase 0 (this PR):
- Landing + waitlist
- Supabase migration for `waitlist_signups`
- Contract for `/api/waitlist`
- Minimal brand setup

Phase 1 (current):
- ✅ Auth routes (GitHub/Google/Email)
- ✅ Feed with React Query + infinite scroll
- ✅ Post composer, follows, comments
- ✅ Media upload (Supabase Storage)
- ✅ Realtime updates with staged banner
- ✅ Optimistic updates for comments and follows

Next (Phase 2):
- Enhanced personalization (follow-based feed)
- Search functionality
- Notifications system
- Performance optimizations

---

## Phase 1 — M5: GitHub Connect Setup

This project uses Supabase Auth to handle the GitHub OAuth handshake. You do not need to craft GitHub URLs manually — the app calls `supabase.auth.signInWithOAuth({ provider: "github" })` which uses the GitHub Client ID/Secret configured in Supabase.

### 1) Create/Configure GitHub OAuth App

- Go to GitHub → Settings → Developer Settings → OAuth Apps
- Create an OAuth App (or edit existing)
  - Authorization callback URL:
    ```
    https://aehiqptugvakjtlvuixb.supabase.co/auth/v1/callback
    ```
- Copy the “Client ID” and “Client Secret”

> Do NOT commit these to the repo. You will paste them into Supabase Provider settings.

### 2) Configure Supabase Provider (GitHub)

- Supabase Dashboard → Authentication → Providers → GitHub
  - Enable GitHub provider
  - Paste your GitHub OAuth “Client ID” and “Client Secret”
  - Save

### 3) Supabase URL Settings

- Supabase Dashboard → Authentication → URL Configuration:
  - Site URL: your deployed app URL (e.g., `https://project-spore.vercel.app`)
  - Additional redirect URLs: include `http://localhost:3000` for local development

### 4) Vercel Environment

Set the following in Vercel project environment (Production/Preview/Development as appropriate):
```
NEXT_PUBLIC_SUPABASE_URL=https://aehiqptugvakjtlvuixb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL=https://project-spore.vercel.app
# Server-only (not exposed to client)
SUPABASE_SERVICE_ROLE=YOUR_SERVICE_ROLE
```
Redeploy after updating env.

### 5) Test Flow

- Go to `/auth/signin` and click “Continue with GitHub”
- After GitHub → Supabase callback, you’ll be redirected (default to `/dev/profiles`)
- On your profile page `/u/[handle]`:
  - If not already connected, click “Connect GitHub”
  - After connecting, top public repos will display

### Notes

- Phase 1 scope lists public repositories without requesting additional token scopes. Private repos can be added later with appropriate scopes.
- The app never stores your GitHub Client ID/Secret in this repo. They live in Supabase provider settings.
