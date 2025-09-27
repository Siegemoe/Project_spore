# Spore — Feed‑First UX Plan (Phased, small PRs)

This plan implements:
- Auth chrome: profile badge when signed in (w/ dropdown placeholders)
- Feed becomes “Home”, current landing moves to `/promo`
- “Search” label becomes “Explore”
- Profile visual overhaul (V2) with placeholders and progressive wiring
- QA and SSR auth hardening

Follow Core_Build_Rule: small PRs, revertable, behind flags where useful.

---

## Phase 0 — Auth Chrome and Nav Consistency (1–2 PRs)

### Goals
- When authenticated, show a GitHub-style profile badge in the top bar instead of “Login/Sign Up”.
- Badge opens a lightweight menu:
  - Settings (placeholder → `/settings`)
  - Log Out (placeholder until sign-out flow is implemented)
- Ensure profile routing is robust and sessions persist across pages.

### Scope
- TopBar (client):
  - If authed, show Avatar (from `users.avatar_url` or fallback initial).
  - On click → menu with:
    - “Settings” → `/settings`
    - “Log Out” → placeholder action (no-op for now)
  - If unauthenticated, keep “Login/Sign Up”.
- Add Settings placeholder at `app/settings/page.tsx`.

### Acceptance
- Signed-in users see an avatar with a dropdown instead of buttons.
- Profile bottom tab routes via `/u/me` → SSR redirect to `/u/{handle}` or `/auth/signin?returnTo=/u/me`.

---

## Phase 1 — Feed as Home, Landing to `/promo`, “Search”→“Explore” (2–3 PRs)

### Goals
- Users land on a minimal global “Feed” page.
- Current landing page moves to `/promo`.
- “Search” label becomes “Explore” (no functional changes).

### Scope
- Move `app/page.tsx` (landing) → `app/promo/page.tsx`.
- New `app/page.tsx` (server):
  - Use SSR to read viewer (optional) and call `listFeed({ limit, userId })`.
  - Render `<FeedClient initialItems initialNextCursor />`.
  - Theme: black/white + green accents, borderless cards (uses existing tokens).
- Bottom tab text: “Explore” instead of “Search”.

### Acceptance
- `https://project-spore.vercel.app/` loads the Feed.
- `/promo` shows the previous hero/waitlist.
- Mobile tab reads “Explore” and navigates to our stub.

---

## Phase 2 — Profile V2 (3–5 PRs)

### Goals
- Implement the new profile layout (mobile-first), with placeholders and progressive wiring.

### Layout Spec
- Header
  - Banner background (placeholder gradient; user-customizable later).
  - Circular profile photo.
  - User name (bold), handle (UPIH), verification badge placeholder.
  - Follower/Following counts (clickable → `/u/[handle]/followers` & `/u/[handle]/following` placeholders).
  - Back button (top-left) always visible.
  - “Follow/Unfollow” near header (wired to existing `FollowButton`).
  - “Edit Profile” if viewing self (placeholder sheet).
- Stats (pills)
  - Repos: public repo count (if GitHub connected).
  - Contributions: posts + comments (server count; stub allowed first).
  - Account Age: years+months since user `created_at`.
- Tabs / Content
  - Posts: user posts list (existing PostCard; filter by `user_id`).
  - Comments: user comments list (new minimal endpoint).
  - About: bio, links; show repos list if connected; toggle visibility placeholder.
- UX polish
  - Infinite scroll in Posts and Comments.
  - Banner fades behind avatar; spacing consistent.
  - Stats compress into horizontal scroll on mobile.

### Deliverables
- `components/profile/HeaderV2.tsx` / `StatsRow.tsx` / `TabsV2.tsx`
- Placeholder pages:
  - `/u/[handle]/followers`
  - `/u/[handle]/following`
- Optional: compact server queries for counts to avoid N+1.

### Acceptance
- Spec visually implemented (banner, circle avatar, handle/name, counts, CTA).
- Tabs switch views; lists use skeletons; no auth re-prompts.

---

## Phase 3 — Explore polish (1–2 PRs)

### Goals
- Copy change to “Explore”, keep stub page.
- Prepare for future MCP discovery.

---

## Phase 4 — Cleanup & Quality (small PRs)

- Extract `AvatarWithBadge` (verification placeholder).
- `StatPill` component.
- Standard Skeleton components for cards/lists.
- A11y: keyboard nav, focus rings, roles.
- Feature flag for `profile_v2` if staging needed.

---

## Data/Backend (deferred where possible)

- `Contributions` count endpoint (posts+comments by user).
- Followers/Following lists — minimal list endpoint for usernames/handles.
- Optional: profile posts list endpoint with pagination.

---

## Testing/QA

- Auth persistence on Vercel/mobile:
  - Profile tab → `/u/me` → `/u/{handle}` (authed), or Sign In then returnTo.
- Feed:
  - Loads globally; renders items (Bob/Anna seeds if present).
- Profile:
  - Header + stats + tabs render without errors; skeletons on load.

---

## PR Slicing (example)

- PR1: TopBar profile badge + Settings placeholder.
- PR2: Move landing → `/promo`; Feed as Home.
- PR3: “Search” label → “Explore”.
- PR4: Profile header v2 (banner/avatar/name/handle/CTA).
- PR5: Profile tabs v2 (Posts/Comments/About) + skeletons.
- PR6: Followers/following placeholder pages + server counts polish.
- PR7: Infinite scroll for Posts/Comments + a11y/perf passes.

---

## Notes & Guidelines

- Keep PRs ≤ 400 LOC per Core_Build_Rule.
- Prefer server helpers for auth-aware pages (SSR Supabase w/ cookies).
- Use existing tokens (black/white + green accent), borderless visuals.
- All new endpoints should have simple contract tests where applicable.
