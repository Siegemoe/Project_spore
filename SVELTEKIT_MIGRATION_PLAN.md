# Project Spore - SvelteKit Migration Plan

**Date**: 2025-11-23
**Status**: Planning Phase
**Focus**: Mobile-first Projects platform with WebSockets

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
│   │   │   │   ├── KanbanBoard.svelte
│   │   │   │   └── MemberList.svelte
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
│   │   │       ├── kanban/
│   │   │       │   └── +page.svelte
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

  // Kanban
  | { type: 'kanban:card_created', projectId: string, card: KanbanCard }
  | { type: 'kanban:card_moved', projectId: string, cardId: string, columnId: string, position: number }
  | { type: 'kanban:card_updated', projectId: string, card: KanbanCard }

  // Feed
  | { type: 'feed:new_post', projectId: string, post: Post }
  | { type: 'feed:post_updated', projectId: string, postId: string, data: Partial<Post> }
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
  | `project:${projectId}`        // Project updates
  | `project:${projectId}:kanban` // Kanban board changes
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
    case 'kanban:card_moved':
      // Update kanban store
      break;
    case 'feed:new_post':
      // Update feed store
      break;
    // ... more handlers
  }
}
```

---

## 🗄️ Prisma Schema (Projects Focus)

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
  createdAt    DateTime @default(now()) @map("created_at")

  // Relations
  projects         ProjectMember[]
  createdProjects  Project[]        @relation("ProjectCreator")
  posts            Post[]
  comments         Comment[]
  sessions         Session[]
  kanbanCards      KanbanCard[]     @relation("CardAssignee")

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

  createdBy String   @map("created_by")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  creator      User            @relation("ProjectCreator", fields: [createdBy], references: [id])
  members      ProjectMember[]
  posts        Post[]
  kanbanColumns KanbanColumn[]
  kanbanCards   KanbanCard[]

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

// KANBAN
model KanbanColumn {
  id        String   @id @default(uuid())
  projectId String   @map("project_id")
  name      String
  position  Int
  createdAt DateTime @default(now()) @map("created_at")

  project Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  cards   KanbanCard[]

  @@map("kanban_columns")
}

model KanbanCard {
  id          String   @id @default(uuid())
  columnId    String   @map("column_id")
  projectId   String   @map("project_id")
  title       String
  description String?
  assigneeId  String?  @map("assignee_id")
  position    Int
  createdBy   String   @map("created_by")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  column   KanbanColumn @relation(fields: [columnId], references: [id], onDelete: Cascade)
  project  Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  assignee User?        @relation("CardAssignee", fields: [assigneeId], references: [id])

  @@map("kanban_cards")
}

// POSTS (simplified - project-focused)
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

  @@map("comments")
}
```

---

## 📋 Migration Phases

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
**Goal**: Basic project creation and viewing

- [ ] Migrate `projects` schema to Prisma
- [ ] Create project creation flow
  - Mobile-optimized form
  - GitHub repo linking
  - Image upload to R2
- [ ] Project detail page
  - Project info display
  - Member list
  - Invite flow (email)
- [ ] Project discovery feed
  - Card grid (mobile: 1 col, tablet: 2 col, desktop: 3 col)
  - Infinite scroll
- [ ] Permission system (owner/admin/contributor)

**Deliverable**: Users can create, view, and join projects

---

### Phase 3: WebSockets + Kanban (Week 4-5)
**Goal**: Real-time collaborative kanban boards

- [ ] Set up Cloudflare Durable Objects for WebSocket
- [ ] Implement WebSocket connection store
- [ ] Create room-based event system
- [ ] Migrate kanban schema to Prisma
- [ ] Build mobile-first kanban board
  - Touch-optimized drag & drop (svelte-dnd-action)
  - Column view (swipe horizontally on mobile)
  - Card creation/editing
  - Assignment UI
- [ ] Real-time card movement
  - Optimistic updates
  - Conflict resolution
  - Presence indicators (who's viewing)
- [ ] Mobile gestures
  - Swipe card to move column
  - Pull to refresh
  - Long-press for options

**Deliverable**: Real-time collaborative kanban on mobile

---

### Phase 4: Project Feed & Posts (Week 6)
**Goal**: Project-specific activity feed

- [ ] Migrate posts/comments schema
- [ ] Project feed component
  - Filter: all posts / my projects / specific project
  - Mobile-optimized cards
- [ ] Post composer (mobile-first)
  - Image/video upload to R2
  - Project selector
  - Caption input
- [ ] Real-time new posts via WebSocket
  - Toast notification
  - Auto-insert at top
- [ ] Comments
  - Mobile sheet/modal
  - Real-time updates

**Deliverable**: Users can post to projects and see real-time updates

---

### Phase 5: Polish & Mobile Features (Week 7)
**Goal**: PWA features and mobile optimization

- [ ] Service Worker for offline caching
- [ ] PWA manifest (installable)
- [ ] Pull-to-refresh on feed
- [ ] Swipe gestures (back navigation)
- [ ] Push notifications (via WebSocket)
- [ ] Image optimization (lazy loading, blur-up)
- [ ] Haptic feedback (mobile)
- [ ] Dark mode
- [ ] Performance audit
  - Lighthouse score >90 on mobile
  - Core Web Vitals optimization

**Deliverable**: Production-ready mobile PWA

---

### Phase 6: GitHub Integration (Week 8)
**Goal**: Deep GitHub integration for projects

- [ ] GitHub repo syncing
  - Fetch commits, issues, PRs
  - Display in project sidebar
- [ ] Automatic project updates from GitHub
  - Webhook handler
  - Commit activity feed
- [ ] Contributor sync
  - Auto-invite GitHub collaborators
- [ ] GitHub-linked kanban cards
  - Link card to issue/PR
  - Status sync

**Deliverable**: Projects auto-sync with GitHub repos

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

**Option A: Full Cloudflare**
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

### MVP (Must-Have)
1. ✅ Auth (GitHub OAuth)
2. ✅ Project creation & discovery
3. ✅ Project members & permissions
4. ✅ Kanban board (basic)
5. ✅ Real-time kanban updates (WebSocket)
6. ✅ Mobile-first UI

### Phase 2 (Nice-to-Have)
1. Project feed & posts
2. Comments
3. GitHub integration
4. Project settings
5. Member invites

### Phase 3 (Future)
1. Project analytics
2. Advanced kanban (labels, due dates)
3. Project templates
4. Export/import
5. API for integrations

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

    <!-- Footer: GitHub link -->
    {#if project.githubRepoUrl}
      <div class="flex items-center gap-2 text-xs text-gray-500">
        <svg class="w-4 h-4"><!-- GitHub icon --></svg>
        <span class="truncate">{project.githubRepoUrl}</span>
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
    { name: 'Notifications', href: '/notifications', icon: 'bell' },
    { name: 'Profile', href: '/u/me', icon: 'user' }
  ];
</script>

<nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden safe-area-bottom">
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
| **Bundle Size** | <200KB | Tree shaking, dynamic imports |

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

### User Experience
- [ ] Can create project in <60s (mobile)
- [ ] Kanban drag works on first try (mobile)
- [ ] Real-time updates appear <1s after change
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
- **Svelte DnD Action** (drag & drop): https://github.com/isaacHagoel/svelte-dnd-action
- **TailwindCSS**: https://tailwindcss.com/

---

## ✅ Next Steps

1. **Answer Architecture Questions** (see top of document)
2. **Choose deployment strategy** (Full Cloudflare vs Hybrid vs Docker)
3. **Set up new repo** (`project-spore-v2`)
4. **Begin Phase 0** (SvelteKit + Auth)
5. **Parallel work**: Design mobile mockups for key screens

---

**Questions? Let's discuss the architecture decisions and get started! 🚀**
