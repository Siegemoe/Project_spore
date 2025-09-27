# Spore — Mobile-First UX Action Plan

## Purpose
Create a cohesive, professional mobile experience around user profiles and feeds, aligned with modern social platforms (Instagram’s visual feed polish, Facebook’s connection/media utility, LinkedIn’s clarity and professional framing). Ship the core social loop with pro-level UX: signup → create post → follow → comment.

## References
- User_Stories.md: single working flow; black/white borderless look with green accents (Image_1).
- Cline_TODO.md (Stage 1): mobile-first UI, Supabase-backed feed/follows/comments/media upload, GitHub connect skeleton.
- Core_Build_Rule.md: ship small behind flags, contracts-first, strict CI, revertable.

## Design Principles
- Mobile-first: thumb reach, large tap targets, bottom tabs, bottom sheets.
- Borderless, light UI: high whitespace, subtle separators, green accent for actions.
- Fast and tangible: skeletons, optimistic updates, minimal blocking spinners.
- Accessible and resilient: clear focus, AA contrast, empty/error states, offline-aware hints.
- Ship safe: feature-flag `new_mobile_ui`; small PRs; end-to-end smoke tests for the core loop.

---

## A. Design System (tokens + primitives)
### 1) Tokens
- Colors: base black/white/stone palette; accent green from Image_1.
  - Semantic: `text-primary`, `text-secondary`, `surface`, `surface-muted`, `border-subtle`, `accent`, `success`, `warn`, `error`.
- Typography: mobile scale (`xs`, `sm`, `base`, `lg`, `xl`); line-height tuned for dense content.
- Spacing: 4px scale; radii `sm`/`md`/`lg`; shadows only for focus and sheets.

### 2) Primitives
- Buttons: primary (accent), secondary (outline), ghost (icon-only).
- Inputs: text, textarea (composer), file picker, search.
- Avatars/badges; Tabs/Segmented; Sheet/Drawer (bottom sheet); Toasts.

### Deliverables
- Tailwind config updated with tokens (colors, radius, shadows).
- `components/ui/*`: `Button`, `Input`, `Textarea`, `Avatar`, `Sheet`, `Tabs`, `Toast`.
- Global styles: tap target sizing, focus rings, reduced motion support.

---

## B. Navigation & App Chrome
### 1) Bottom Tab Bar (mobile)
- Tabs: Home, Search (stub), Create, Notifications (stub), Profile.
- Center Create opens Composer bottom sheet; active tab shows accent indicator; safe-area padding.

### 2) Top App Bar
- Left: Spore wordmark.
- Right: actions (Search, Notifications) for larger screens; fallback when tabs are hidden.

### Deliverables
- `components/nav/MobileTabBar.tsx`, `components/nav/TopBar.tsx`.
- Integrated in `app/layout.tsx` with responsive behavior.

---

## C. Home Feed
### 1) PostCard polish
- Header: avatar, display name, handle, timestamp, follow button (if not following), overflow menu.
- Body: text (linkified), media (single image/video now), fixed aspect ratio (e.g., 16:9) to prevent layout shifts.
- Footer: comment (opens sheet), share (copy link), view/save placeholders; small timestamp/meta.

### 2) Feed behavior
- Infinite scroll with `IntersectionObserver` + skeletons.
- “New posts” banner on background refresh; simple periodic refetch (realtime later).
- Compose FAB as an additional entry point on scroll-up.

### Deliverables
- Polished `components/posts/PostCard.tsx` (a11y labels, loading/error).
- `components/posts/FeedClient.tsx` pagination, skeletons, new-posts banner.
- Reuse `features/posts/queries.ts`; no contract changes.

### Acceptance
- Smooth scroll on mobile; p95 image paint < 2.5s on 4G.
- New post appears within ~5s (realtime or refresh CTA).

---

## D. Composer (bottom sheet)
### 1) Flow
- Entry: Create tab, Feed FAB, profile empty-state CTA.
- Sheet: avatar + “What are you building?” textarea; add image/video (MVP: image), preview/removal.
- Upload: Supabase Storage signed URL; progress indicator; disable Post until content present.
- Optimistic post insert with rollback on error; toasts for success/failure.

### 2) Constraints
- MVP: 1 image, optional caption; client-side image resize/compress for performance.

### Deliverables
- Refactor `components/posts/Composer.tsx` to bottom sheet pattern with media picker and progress.
- Use existing `features/posts/actions.ts`.

### Acceptance
- Post with image from camera roll; visible in feed within ~5s; robust failure handling.

---

## E. Profile (public and self)
### 1) ProfileHeader
- Avatar, display name, handle, bio (2-line clamp + “more”), links.
- Stats: posts, followers, following.
- Primary action: Follow/Following with loading; Edit Profile for self.

### 2) ProfileTabs
- Posts (list using `PostCard`).
- Repos (from GitHub connect; language + stars; placeholder when not connected).
- About (interests, links; MVP lightweight).

### 3) States
- Private/profile visibility badge if `is_public` false; appropriate gating.
- Empty states: prompt to post/connect GitHub.

### Deliverables
- `app/u/[handle]/page.tsx` integrates ProfileHeader + Tabs.
- `components/profile/*`: `Header`, `Tabs`, `RepoList`, `StatsRow`, `EditProfileSheet` (bio + links MVP).
- Integrate `features/follows/actions.ts` and `features/github/actions.ts`.

### Acceptance
- Public profile loads; follow/unfollow works; counts reflect changes; edit bio persists immediately.

---

## F. Comments
- `CommentSheet` bottom sheet: threaded list; input at bottom with safe-area padding; send disabled until text.
- Optimistic insert; keyboard-safe sheet behavior; pull to close.
- Start with polling; consider Supabase Realtime for this path first.

### Deliverables
- Refactor `components/comments/CommentsClient.tsx` to sheet.
- Reuse `features/comments/actions.ts`.

### Acceptance
- Open from `PostCard`; post comment; appears immediately (optimistic); accessible.

---

## G. Discovery + Notifications (stubs)
- Search page stub with seed trending users and inline Follow.
- Notifications stub: unified list from existing events (can reuse feed endpoint temporarily).

### Deliverables
- `app/search/page.tsx` (stub).
- `app/notifications/page.tsx` (stub).

---

## H. Professional Polish
- Skeletons across feed/profile/repos.
- Empty and error states with subtle icons and retries.
- Micro-interactions: pressed states, focus rings; haptics hint (mobile).
- Accessibility: roles/labels, contrast (AA), reduced motion.
- Performance: lazy-load media, defined width/height to avoid CLS, route prefetch for critical paths.

---

## I. Delivery & Quality (build rules aligned)
- Feature flag: `new_mobile_ui` for progressive rollout and quick rollback.
- Small PRs: tokens, nav, feed, composer, profile, comments.
- End-to-end smoke in CI: signup → post → follow → comment.
- Contract tests: reuse existing endpoints; add only if new APIs required.
- PR naming convention: `feat/<ticket>-short-desc` (e.g., `feat/DS-1-ui-tokens`).

---

## Implementation Tickets
1) DS-1: Tailwind tokens + UI primitives.  
2) NAV-1: MobileTabBar + TopBar.  
3) FEED-1: PostCard polish + skeletons.  
4) FEED-2: FeedClient infinite scroll + new-posts banner.  
5) CMP-1: Composer bottom sheet + media picker + upload.  
6) PRF-1: ProfileHeader + Stats + FollowButton polish.  
7) PRF-2: ProfileTabs + RepoList + GitHub connect CTA.  
8) CMT-1: CommentSheet with optimistic updates.  
9) STB-1: Search/Notifications stubs.  
10) POL-1: Empty/error states, toasts, a11y, perf.

---

## Metrics to Watch
- Home feed TTI p75 < 2.5s on 4G.
- Post success rate > 98%.
- Comment visible latency < 2s.
- Follows per session (baseline target).
- DAU and posts per user (1–3/week initially).

---

## Wireframe-Level Spec
- Bottom Tab Bar: 5 icons; center Create highlighted; safe-area padding; label on active only.
- PostCard: Header → Text → Media (16:9, cover) → Actions → Small meta/timestamp.
- Composer: Bottom sheet max 88% height; sticky action bar; media preview chips; progress on upload.
- Profile: Avatar 72px; name, handle, bio; stats row; follow/edit button; segmented tabs.

---

## Risks & Mitigations
- Media perf: client-side compression; set width/height; lazy loading.
- Realtime cost/complexity: start with simple refetch + banner; enable realtime for comments first.
- Feature creep: keep likes/video out of MVP; show placeholders only.

---

## Next Steps
- File saved as `Cline_Info/Mobile_UX_Action_Plan.md` (behind `new_mobile_ui` feature flag noted here).
- Implement in small PRs in the order: tokens → nav → feed → composer → profile → comments → stubs → polish.
- Add/verify CI smoke test for the core loop.
