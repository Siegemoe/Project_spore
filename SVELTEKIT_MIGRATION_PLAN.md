# Project Spore - SvelteKit Migration Plan

**Date**: 2025-11-23
**Status**: Planning Phase
**Focus**: Mobile-first Projects platform with WebSockets (**No Kanban in MVP**)

---

## 🎯 Migration Overview

### From → To

| Component | Current | New |
|-----------|---------|-----|
| **Frontend** | Next.js 14 (React) | SvelteKit 2 |
| **Real-time** | Supabase Realtime | WebSockets (native) |
| **Database** | Supabase PostgreSQL | Self-hosted PostgreSQL + Prisma |
| **Auth** | Supabase Auth | ❓ **Decision needed** |
| **Storage** | Supabase Storage | ❓ **Decision needed** |
| **Hosting** | Vercel | Cloudflare Pages/Workers + Docker |
| **State** | React Query | Svelte stores + WebSocket sync |

---

## ❓ Critical Architecture Decisions Needed

### 1. **Database Choice**
- **Option A**: PostgreSQL (recommended - minimal migration from Supabase)
  - ✅ Existing schema compatible
  - ✅ Prisma has excellent Postgres support
  - ✅ Docker deployment straightforward
  - ❌ Requires self-hosting/managed service (Railway, Render, Neon)

- **Option B**: Cloudflare D1 (SQLite)
  - ✅ Integrated with Cloudflare Workers
  - ✅ Edge-native, low latency
  - ✅ No separate DB hosting needed
  - ❌ Limited to 10GB database size
  - ❌ Schema migration from Postgres required
  - ❌ No full-text search, limited JSON support

**Recommendation**: PostgreSQL on Railway/Neon + Prisma ORM

---

### 2. **Authentication Strategy**
- **Option A**: Lucia Auth (recommended for SvelteKit)
  - ✅ Session-based auth designed for SvelteKit
  - ✅ OAuth providers supported (GitHub, Google)
  - ✅ Lightweight, no external service
  - ❌ Manual implementation of OAuth flows

- **Option B**: Auth.js (formerly NextAuth)
  - ✅ Mature OAuth support
  - ✅ SvelteKit adapter available
  - ❌ Heavier than Lucia

- **Option C**: Clerk/Supabase Auth (managed)
  - ✅ Fully managed
  - ❌ External dependency (defeats purpose of leaving Supabase)

**Recommendation**: Lucia Auth with OAuth providers

---

### 3. **File Storage**
- **Option A**: Cloudflare R2
  - ✅ S3-compatible API
  - ✅ No egress fees
  - ✅ Integrated with Cloudflare ecosystem
  - ✅ 10GB free tier

- **Option B**: Self-hosted MinIO
  - ✅ S3-compatible
  - ✅ Full control
  - ❌ Extra Docker container to manage

**Recommendation**: Cloudflare R2

---

### 4. **WebSocket Server Architecture**
- **Option A**: Cloudflare Durable Objects (recommended)
  - ✅ Edge-native WebSocket support
  - ✅ Built-in state management
  - ✅ Auto-scaling
  - ✅ Integrated with Cloudflare Workers
  - ❌ Learning curve
  - ❌ $5/month minimum

- **Option B**: Separate Docker container (Socket.io/ws)
  - ✅ Familiar API
  - ✅ Full control
  - ✅ Works with existing server infrastructure
  - ❌ Separate deployment
  - ❌ Manual scaling

- **Option C**: Hybrid (Cloudflare Pages + Worker for WS)
  - ✅ SvelteKit on Cloudflare Pages
  - ✅ WebSocket Worker handles real-time
  - ✅ Clean separation of concerns
  - ✅ Leverage Cloudflare's edge network

**Recommendation**: Cloudflare Durable Objects for production-grade real-time

---

### 5. **Deployment Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Network                        │
│                                                              │
│  ┌──────────────────┐       ┌──────────────────┐            │
│  │ Cloudflare Pages │       │ Durable Objects  │            │
│  │  (SvelteKit SSR) │◄─────►│   (WebSockets)   │            │
│  └──────────────────┘       └──────────────────┘            │
│           │                          │                       │
│           │                          │                       │
│  ┌────────▼──────────┐      ┌───────▼──────────┐            │
│  │ Cloudflare Workers│      │  Cloudflare R2   │            │
│  │   (API Routes)    │      │  (File Storage)  │            │
│  └────────┬──────────┘      └──────────────────┘            │
└───────────┼──────────────────────────────────────────────────┘
            │
            │ (Database queries)
            ▼
┌─────────────────────────────┐
│   PostgreSQL + Prisma       │
│   (Railway/Neon/Docker)     │
└─────────────────────────────┘
```

**Alternative: All-Docker Deployment**
```
┌─────────────────────────────────────────────────────────────┐
│                      Docker Compose                          │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────┐ │
│  │  SvelteKit SSR   │  │  WebSocket Server│  │  Postgres  │ │
│  │  (Node adapter)  │  │   (Socket.io)    │  │            │ │
│  └──────────────────┘  └──────────────────┘  └────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
         ▲
         │ (via Nginx reverse proxy)
         │
   [Public Internet]
```

---

## 📱 Mobile-First Design Principles

### Core Focus
1. **Touch-first interactions** - All UI elements optimized for touch
2. **Responsive by default** - Mobile → Tablet → Desktop (progressive enhancement)
3. **Gesture support** - Swipe navigation, pull-to-refresh
4. **Offline-capable** - Service worker caching
5. **Performance** - <3s initial load on 3G

### Mobile Breakpoints (Tailwind)
```css
/* Mobile-first approach */
.component { /* 0-640px: mobile */ }
@media (min-width: 640px) { /* sm: large phone */ }
@media (min-width: 768px) { /* md: tablet */ }
@media (min-width: 1024px) { /* lg: desktop */ }
```

---

## 🏗️ SvelteKit Project Structure

```
project-spore-v2/
├── src/
│   ├── lib/
│   │   ├── server/              # Server-only code
│   │   │   ├── db/              # Prisma client, queries
│   │   │   │   ├── schema.prisma
│   │   │   │   ├── client.ts
│   │   │   │   └── migrations/
│   │   │   ├── auth/            # Lucia auth setup
│   │   │   │   ├── lucia.ts
│   │   │   │   └── oauth.ts
│   │   │   ├── websocket/       # WebSocket server logic
│   │   │   │   ├── events.ts    # Event types
│   │   │   │   ├── handlers.ts  # Event handlers
│   │   │   │   └── rooms.ts     # Room management
│   │   │   └── storage/         # R2/file upload
│   │   │       └── r2.ts
│   │   │
│   │   ├── stores/              # Svelte stores (client-side state)
│   │   │   ├── user.ts          # Current user
│   │   │   ├── websocket.ts     # WS connection
│   │   │   ├── projects.ts      # Project state
│   │   │   └── notifications.ts # Real-time notifications
│   │   │
│   │   ├── components/          # Reusable components
│   │   │   ├── projects/        # Project components
│   │   │   │   ├── ProjectCard.svelte
│   │   │   │   ├── ProjectFeed.svelte
│   │   │   │   ├── ProjectDetail.svelte
│   │   │   │   └── MemberList.svelte
│   │   │   ├── posts/           # Post components
│   │   │   │   ├── PostCard.svelte
│   │   │   │   ├── PostComposer.svelte
│   │   │   │   └── CommentList.svelte
│   │   │   ├── shared/          # Shared UI
│   │   │   │   ├── Button.svelte
│   │   │   │   ├── Card.svelte
│   │   │   │   └── Modal.svelte
│   │   │   └── layout/          # Layout components
│   │   │       ├── MobileNav.svelte
│   │   │       ├── BottomTabBar.svelte
│   │   │       └── TopBar.svelte
│   │   │
│   │   ├── utils/               # Utilities
│   │   │   ├── validation.ts    # Zod schemas
│   │   │   ├── sanitize.ts      # Input sanitization
│   │   │   └── dates.ts         # Date formatting
│   │   │
│   │   └── types/               # TypeScript types
│   │       ├── project.ts
│   │       ├── user.ts
│   │       └── websocket.ts
│   │
│   ├── routes/                  # SvelteKit routes
│   │   ├── +layout.svelte       # Root layout
│   │   ├── +layout.server.ts    # Root layout server load
│   │   ├── +page.svelte         # Home (project feed)
│   │   ├── +page.server.ts      # Home data loading
│   │   │
│   │   ├── auth/                # Auth routes
│   │   │   ├── login/
│   │   │   │   └── +page.svelte
│   │   │   ├── signup/
│   │   │   │   └── +page.svelte
│   │   │   └── callback/
│   │   │       └── +server.ts   # OAuth callback
│   │   │
│   │   ├── projects/            # Project routes
│   │   │   ├── +page.svelte     # Project discovery/explore
│   │   │   ├── new/
│   │   │   │   └── +page.svelte # Create project
│   │   │   └── [slug]/          # Individual project
│   │   │       ├── +page.svelte
│   │   │       ├── +page.server.ts
│   │   │       └── settings/
│   │   │           └── +page.svelte
│   │   │
│   │   ├── api/                 # API routes (REST endpoints)
│   │   │   ├── projects/
│   │   │   │   └── +server.ts   # CRUD endpoints
│   │   │   ├── upload/
│   │   │   │   └── +server.ts   # File upload
│   │   │   └── ws/              # WebSocket endpoint
│   │   │       └── +server.ts
│   │   │
│   │   └── u/                   # User profiles
│   │       └── [handle]/
│   │           └── +page.svelte
│   │
│   ├── app.html                 # HTML template
│   ├── app.css                  # Global CSS (Tailwind)
│   └── hooks.server.ts          # Server hooks (auth, logging)
│
├── prisma/
│   ├── schema.prisma            # Database schema
│   └── migrations/              # Migration files
│
├── static/                      # Static assets
├── tests/                       # Playwright tests
├── cloudflare/                  # Cloudflare-specific
│   └── durable-objects/
│       └── WebSocketRoom.ts
│
├── docker/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── nginx.conf
│
├── package.json
├── svelte.config.js
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

---

## 🔄 WebSocket Event System

### Event Types
```typescript
// lib/types/websocket.ts

type WSEvent =
  // Projects
  | { type: 'project:update', projectId: string, data: Partial<Project> }
  | { type: 'project:member_joined', projectId: string, user: User }
  | { type: 'project:member_left', projectId: string, userId: string }

  // Feed
  | { type: 'feed:new_post', projectId: string, post: Post }
  | { type: 'feed:post_updated', projectId: string, postId: string, data: Partial<Post> }
  | { type: 'feed:post_deleted', projectId: string, postId: string }
  | { type: 'feed:new_comment', postId: string, comment: Comment }

  // Presence
  | { type: 'presence:join', room: string, user: User }
  | { type: 'presence:leave', room: string, userId: string }
  | { type: 'presence:typing', room: string, userId: string, isTyping: boolean }

  // Notifications
  | { type: 'notification:new', userId: string, notification: Notification };
```

### Room Structure
```typescript
// Users auto-join rooms based on context
type Room =
  | `user:${userId}`              // Personal notifications
  | `project:${projectId}`        // Project updates & posts
  | `post:${postId}`              // Post comments
```

### Client WebSocket Store
```typescript
// lib/stores/websocket.ts
import { writable } from 'svelte/store';

export const websocket = writable<WebSocket | null>(null);
export const connected = writable(false);

export function connectWebSocket() {
  const ws = new WebSocket('wss://api.yourapp.com/ws');

  ws.onopen = () => {
    connected.set(true);
    websocket.set(ws);
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleWSEvent(data);
  };

  ws.onclose = () => {
    connected.set(false);
    // Reconnect logic
    setTimeout(connectWebSocket, 3000);
  };
}

function handleWSEvent(event: WSEvent) {
  switch (event.type) {
    case 'feed:new_post':
      // Update feed store
      break;
    case 'feed:new_comment':
      // Update comments
      break;
    case 'project:member_joined':
      // Update member list
      break;
    // ... more handlers
  }
}
```

---

## 🗄️ Prisma Schema (Projects Focus - No Kanban)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// USERS
model User {
  id           String   @id @default(uuid())
  handle       String   @unique
  displayName  String?  @map("display_name")
  avatarUrl    String?  @map("avatar_url")
  bio          String?
  email        String   @unique
  emailPublic  Boolean  @default(false) @map("email_public")
  websites     Json?    // Array of URLs
  githubLogin  String?  @map("github_login")
  githubUserId String?  @map("github_user_id")
  createdAt    DateTime @default(now()) @map("created_at")

  // Relations
  projects         ProjectMember[]
  createdProjects  Project[]        @relation("ProjectCreator")
  posts            Post[]
  comments         Comment[]
  sessions         Session[]

  @@map("users")
}

// AUTH (Lucia)
model Session {
  id        String   @id
  userId    String   @map("user_id")
  expiresAt DateTime @map("expires_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

// PROJECTS
model Project {
  id            String   @id @default(uuid())
  slug          String   @unique
  name          String
  description   String?
  avatarUrl     String?  @map("avatar_url")
  websiteUrl    String?  @map("website_url")
  githubRepoUrl String?  @map("github_repo_url")
  isPublic      Boolean  @default(true) @map("is_public")

  // GitHub sync metadata
  githubStars   Int?     @map("github_stars")
  githubForks   Int?     @map("github_forks")
  lastSyncedAt  DateTime? @map("last_synced_at")

  createdBy String   @map("created_by")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  creator      User            @relation("ProjectCreator", fields: [createdBy], references: [id])
  members      ProjectMember[]
  posts        Post[]

  @@map("projects")
}

model ProjectMember {
  id        String   @id @default(uuid())
  projectId String   @map("project_id")
  userId    String   @map("user_id")
  role      String   // "owner" | "admin" | "contributor"
  joinedAt  DateTime @default(now()) @map("joined_at")

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([projectId, userId])
  @@map("project_members")
}

// POSTS (project-focused)
model Post {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  projectId String?  @map("project_id") // Optional: null = personal post
  caption   String?
  mediaUrl  String?  @map("media_url")
  mediaType String?  @map("media_type") // "image" | "video"
  createdAt DateTime @default(now()) @map("created_at")

  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  project  Project?  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  comments Comment[]

  @@index([projectId, createdAt])
  @@map("posts")
}

model Comment {
  id        String   @id @default(uuid())
  postId    String   @map("post_id")
  userId    String   @map("user_id")
  body      String
  createdAt DateTime @default(now()) @map("created_at")

  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([postId, createdAt])
  @@map("comments")
}
```

---

## 📋 Migration Phases (Simplified - 5 Weeks)

### Phase 0: Foundation (Week 1)
**Goal**: Set up new SvelteKit project with authentication

- [ ] Initialize SvelteKit project with TypeScript
- [ ] Configure Tailwind CSS (mobile-first)
- [ ] Set up Prisma with PostgreSQL (Railway/Neon)
- [ ] Implement Lucia Auth (GitHub OAuth)
- [ ] Create basic auth pages (login, signup, callback)
- [ ] Set up session management
- [ ] Deploy to Cloudflare Pages (basic SSR)

**Deliverable**: Working auth flow on Cloudflare Pages

---

### Phase 1: Core UI (Week 2)
**Goal**: Mobile-first layout and navigation

- [ ] Create mobile bottom tab bar
- [ ] Create top bar with user menu
- [ ] Implement responsive breakpoints
- [ ] Design project card component (mobile-optimized)
- [ ] Create basic feed layout
- [ ] Set up Svelte stores (user, theme)
- [ ] Add loading skeletons

**Deliverable**: Responsive shell app with navigation

---

### Phase 2: Projects CRUD (Week 3)
**Goal**: Basic project creation and viewing - **Make projects explorable!**

- [ ] Migrate `projects` schema to Prisma
- [ ] Create project creation flow
  - Mobile-optimized form
  - GitHub repo linking
  - Image upload to R2
- [ ] Project detail page
  - Project info display
  - Member list
  - Invite flow (email or username)
- [ ] Project discovery feed
  - Card grid (mobile: 1 col, tablet: 2 col, desktop: 3 col)
  - Infinite scroll
  - Search/filter (by name, GitHub repo)
- [ ] Permission system (owner/admin/contributor)
- [ ] GitHub integration
  - Fetch repo metadata (stars, forks, description)
  - Display on project card

**Deliverable**: ✨ **Users can explore, create, view, and join projects!**

---

### Phase 3: Real-time Project Updates (Week 4)
**Goal**: WebSocket integration for live project activity

- [ ] Set up Cloudflare Durable Objects for WebSocket
- [ ] Implement WebSocket connection store
- [ ] Create room-based event system
- [ ] Real-time project updates
  - New member joins → update member count
  - Project info changes → update card
  - Member presence (who's viewing)
- [ ] Real-time notifications
  - New member joined your project
  - Someone invited you to a project
  - Project updates

**Deliverable**: Live project updates via WebSocket

---

### Phase 4: Project Feed & Posts (Week 5)
**Goal**: Project-specific activity feed

- [ ] Migrate posts/comments schema
- [ ] Project feed component
  - Filter: all posts / my projects / specific project
  - Mobile-optimized post cards
- [ ] Post composer (mobile-first)
  - Image/video upload to R2
  - Project selector
  - Caption input
- [ ] Real-time new posts via WebSocket
  - Toast notification
  - Auto-insert at top of feed
- [ ] Comments
  - Mobile sheet/modal
  - Real-time comment updates
- [ ] Pull-to-refresh on mobile

**Deliverable**: Users can post to projects and see real-time activity

---

### Phase 5: Polish & PWA (Week 6 - Optional)
**Goal**: Production-ready mobile experience

- [ ] Service Worker for offline caching
- [ ] PWA manifest (installable)
- [ ] Swipe gestures (back navigation)
- [ ] Image optimization (lazy loading, blur-up)
- [ ] Haptic feedback (mobile)
- [ ] Dark mode
- [ ] Performance audit
  - Lighthouse score >90 on mobile
  - Core Web Vitals optimization

**Deliverable**: Production-ready mobile PWA

---

## 🚀 Deployment Strategy

### Development
```bash
# Local development
npm run dev

# Prisma migrations
npx prisma migrate dev

# Run WebSocket server locally (Docker)
docker-compose up websocket
```

### Staging (Cloudflare)
```bash
# Deploy to Cloudflare Pages (preview)
npm run build
wrangler pages publish .svelte-kit/cloudflare

# Deploy Durable Objects
wrangler publish
```

### Production Options

**Option A: Full Cloudflare (Recommended)**
- SvelteKit on Cloudflare Pages
- WebSockets via Durable Objects
- R2 for storage
- External PostgreSQL (Neon/Railway)

**Option B: Hybrid (Cloudflare + Docker)**
- SvelteKit on Cloudflare Pages
- WebSocket + DB in Docker (VPS/Railway)
- R2 for storage

**Option C: Full Docker (VPS)**
- All services in Docker Compose
- Nginx reverse proxy
- Self-hosted PostgreSQL
- MinIO for storage

---

## 📊 Feature Priority (Projects Focus)

### MVP (Must-Have - 5 Weeks)
1. ✅ Auth (GitHub OAuth)
2. ✅ Project creation & discovery
3. ✅ Project members & permissions
4. ✅ Real-time project updates (WebSocket)
5. ✅ Mobile-first UI
6. ✅ Project feed & posts

### Phase 2 (Nice-to-Have)
1. Comments
2. Advanced GitHub integration (commits, issues sync)
3. Project settings page
4. User profiles
5. Notifications page

### Phase 3 (Future - Post-Launch)
1. Kanban boards (collaborative task management)
2. Project analytics
3. Project templates
4. Export/import
5. API for integrations
6. Direct messaging

---

## 🎨 Mobile-First Component Examples

### ProjectCard (Mobile)
```svelte
<!-- lib/components/projects/ProjectCard.svelte -->
<script lang="ts">
  import type { Project } from '$lib/types/project';

  export let project: Project;
</script>

<a
  href="/projects/{project.slug}"
  class="block touch-manipulation"
>
  <div class="card p-4 active:scale-98 transition-transform">
    <!-- Avatar + Name -->
    <div class="flex items-center gap-3 mb-3">
      <img
        src={project.avatarUrl || '/default-project.png'}
        alt={project.name}
        class="w-12 h-12 rounded-lg object-cover"
      />
      <div class="flex-1 min-w-0">
        <h3 class="font-semibold text-base truncate">
          {project.name}
        </h3>
        <p class="text-sm text-gray-500">
          {project.memberCount} members
        </p>
      </div>
    </div>

    <!-- Description -->
    {#if project.description}
      <p class="text-sm text-gray-700 line-clamp-2 mb-3">
        {project.description}
      </p>
    {/if}

    <!-- Footer: GitHub link + stats -->
    {#if project.githubRepoUrl}
      <div class="flex items-center gap-3 text-xs text-gray-500">
        <div class="flex items-center gap-1">
          <svg class="w-4 h-4"><!-- GitHub icon --></svg>
          <span class="truncate flex-1">{project.githubRepoUrl.split('/').slice(-2).join('/')}</span>
        </div>
        {#if project.githubStars}
          <div class="flex items-center gap-1">
            <svg class="w-3 h-3"><!-- Star icon --></svg>
            <span>{project.githubStars}</span>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</a>

<style>
  .active\:scale-98:active {
    transform: scale(0.98);
  }
</style>
```

### BottomTabBar (Mobile Navigation)
```svelte
<!-- lib/components/layout/BottomTabBar.svelte -->
<script lang="ts">
  import { page } from '$app/stores';

  const tabs = [
    { name: 'Projects', href: '/', icon: 'home' },
    { name: 'Explore', href: '/explore', icon: 'compass' },
    { name: 'Create', href: '/projects/new', icon: 'plus' },
    { name: 'Activity', href: '/activity', icon: 'bell' },
    { name: 'Profile', href: '/u/me', icon: 'user' }
  ];
</script>

<nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden safe-area-bottom z-50">
  <div class="flex justify-around">
    {#each tabs as tab}
      <a
        href={tab.href}
        class="flex-1 flex flex-col items-center py-2 touch-manipulation"
        class:active={$page.url.pathname === tab.href}
      >
        <!-- Icon (44x44 touch target) -->
        <div class="w-11 h-11 flex items-center justify-center">
          <div class="w-6 h-6">
            <!-- Icon SVG -->
          </div>
        </div>

        <!-- Label -->
        <span class="text-xs mt-0.5">
          {tab.name}
        </span>
      </a>
    {/each}
  </div>
</nav>

<style>
  .safe-area-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }

  .active {
    color: #10b981; /* green accent */
  }
</style>
```

---

## ⚡ Performance Targets (Mobile)

| Metric | Target | How to Achieve |
|--------|--------|----------------|
| **First Contentful Paint** | <1.5s | SSR, minimal JS, preload critical assets |
| **Largest Contentful Paint** | <2.5s | Image optimization, lazy loading |
| **Time to Interactive** | <3.0s | Code splitting, defer non-critical JS |
| **Cumulative Layout Shift** | <0.1 | Reserve space for images, no dynamic ads |
| **First Input Delay** | <100ms | Optimize event handlers, use Web Workers |
| **Bundle Size** | <150KB | Tree shaking, dynamic imports, no Kanban libs |

---

## 🔐 Security Checklist

- [ ] Lucia session tokens (HTTP-only cookies)
- [ ] CSRF protection on mutations
- [ ] Rate limiting (Cloudflare Workers KV)
- [ ] Input sanitization (DOMPurify)
- [ ] SQL injection protection (Prisma)
- [ ] XSS protection (Svelte auto-escaping)
- [ ] Content Security Policy headers
- [ ] Secure WebSocket authentication
- [ ] OAuth state parameter validation
- [ ] File upload validation (type, size, malware scan)

---

## 📱 Mobile Testing Devices

- **iOS**: iPhone SE (small), iPhone 14 Pro (notch)
- **Android**: Pixel 5 (mid), Samsung Galaxy S23 (large)
- **Tablet**: iPad Air, Samsung Tab S8
- **Desktop**: 1920x1080, 1366x768

---

## 🎯 Success Metrics

### Technical
- [ ] Lighthouse mobile score >90
- [ ] WebSocket latency <100ms
- [ ] Database query time <50ms (p95)
- [ ] Page load <3s on 3G
- [ ] Zero layout shift (CLS = 0)

### User Experience (Updated)
- [ ] Can create project in <60s (mobile)
- [ ] Can browse and join projects easily
- [ ] Real-time updates appear <1s after change
- [ ] GitHub repo info displays correctly
- [ ] App installable as PWA
- [ ] Works offline (cached pages)

---

## 🚨 Migration Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| **WebSocket scaling** | High | Use Cloudflare Durable Objects (auto-scale) |
| **Database migration errors** | Critical | Test migrations on staging DB first |
| **Auth migration (users locked out)** | Critical | Dual-run Supabase + Lucia during transition |
| **Mobile performance** | Medium | Continuous Lighthouse CI checks |
| **Cloudflare limits** | Medium | Monitor usage, have VPS backup plan |
| **Learning curve (Svelte)** | Low | Start with simple components, iterative |

---

## 📚 Technology References

- **SvelteKit**: https://kit.svelte.dev/
- **Prisma**: https://www.prisma.io/docs/
- **Lucia Auth**: https://lucia-auth.com/
- **Cloudflare Pages**: https://developers.cloudflare.com/pages/
- **Cloudflare Durable Objects**: https://developers.cloudflare.com/durable-objects/
- **Cloudflare R2**: https://developers.cloudflare.com/r2/
- **TailwindCSS**: https://tailwindcss.com/

---

## ✅ Next Steps

1. **Answer Architecture Questions** (see top of document)
2. **Choose deployment strategy** (Full Cloudflare vs Hybrid vs Docker)
3. **Set up new repo** (`project-spore-v2`)
4. **Begin Phase 0** (SvelteKit + Auth)
5. **Optional**: Design mobile mockups for project cards

---

## 📝 Summary of Changes

**What's Different (No Kanban):**
- ✅ Timeline reduced from 8 weeks to **5-6 weeks**
- ✅ Simpler database schema (no kanban tables)
- ✅ Fewer WebSocket events (no kanban:* events)
- ✅ Focus on **project discovery and exploration**
- ✅ GitHub integration prioritized
- ✅ Faster time to MVP
- 🚀 **Users can explore projects immediately after Phase 2 (Week 3)**

**What's Kept:**
- ✅ Mobile-first design
- ✅ WebSockets for real-time updates
- ✅ Project permissions & members
- ✅ Project feed & posts
- ✅ PWA capabilities

**Kanban can be added later as Phase 3+ feature after users are actively exploring projects!**

---

**Questions? Let's discuss the architecture decisions and get started! 🚀**
