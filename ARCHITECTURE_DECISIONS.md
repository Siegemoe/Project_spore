# Architecture Decisions - Final

**Date**: 2025-11-23
**Status**: ✅ Decided - Ready to Build

---

## ✅ Final Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Database** | PostgreSQL (Docker local, Railway/Neon prod) | Easy migration from Supabase, Prisma support |
| **Auth** | Lucia Auth + GitHub OAuth | Lightweight, SvelteKit-native, no external deps |
| **Storage** | Local filesystem (dev) → MinIO/S3 (prod) | Test locally first, production-ready later |
| **WebSockets** | Socket.io in Docker container | Full control, familiar API, easy local testing |
| **Deployment** | Full Docker Compose | Self-contained, VPS-ready, no vendor lock-in |
| **Frontend** | SvelteKit 2 + Tailwind CSS | Mobile-first, fast, small bundle |
| **ORM** | Prisma | Type-safe, great PostgreSQL support |

---

## 🐳 Docker Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Docker Compose Network                      │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  SvelteKit   │  │   Socket.io  │  │  PostgreSQL  │  │
│  │  (Port 5173) │  │  (Port 3001) │  │  (Port 5432) │  │
│  │              │  │              │  │              │  │
│  │  SSR + API   │←→│  WebSocket   │  │   Database   │  │
│  │  Routes      │  │   Server     │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         ↓                                       ↑        │
│         └───────── Prisma Client ──────────────┘        │
│                                                          │
│  ┌──────────────┐                                        │
│  │   uploads/   │  (Local volume for dev)                │
│  │  (storage)   │                                        │
│  └──────────────┘                                        │
│                                                          │
└─────────────────────────────────────────────────────────┘
         ↑
         │ (Nginx reverse proxy in production)
         │
   [Public: localhost:3000]
```

---

## 📁 Project Structure

```
project-spore-v2/
├── apps/
│   ├── web/                    # SvelteKit app
│   │   ├── src/
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   └── websocket/              # Socket.io server
│       ├── src/
│       ├── package.json
│       └── Dockerfile
│
├── packages/
│   ├── database/               # Prisma shared package
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── package.json
│   │
│   └── types/                  # Shared TypeScript types
│       └── src/
│
├── docker-compose.yml          # Local dev environment
├── docker-compose.prod.yml     # Production environment
├── .env.example
├── pnpm-workspace.yaml         # Monorepo config
└── README.md
```

---

## 🔧 Development Workflow

### Local Development
```bash
# Start all services
docker-compose up

# Access points:
# - SvelteKit: http://localhost:5173
# - WebSocket: ws://localhost:3001
# - PostgreSQL: localhost:5432

# Run migrations
docker-compose exec web npx prisma migrate dev

# Run tests
docker-compose exec web npm test
docker-compose exec websocket npm test
```

### Testing Strategy
- **Unit tests**: Vitest for SvelteKit components
- **Integration tests**: Playwright for E2E
- **API tests**: Supertest for endpoints
- **WebSocket tests**: Socket.io client tests
- **Database tests**: Prisma migrations tested in CI

---

## 🚀 Production Deployment (VPS)

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy to VPS
docker-compose -f docker-compose.prod.yml up -d

# Nginx reverse proxy handles:
# - SSL termination
# - Load balancing
# - Static asset serving
```

---

## 🔐 Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/spore

# Auth (Lucia + GitHub OAuth)
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
AUTH_SECRET=xxx

# WebSocket
WEBSOCKET_URL=ws://localhost:3001
WEBSOCKET_SECRET=xxx

# Storage (local dev)
UPLOAD_DIR=/app/uploads

# App
PUBLIC_APP_URL=http://localhost:5173
NODE_ENV=development
```

---

## 📊 Performance Targets

| Metric | Local Dev | Production |
|--------|-----------|------------|
| **Container startup** | <10s | <30s |
| **Hot reload (SvelteKit)** | <200ms | N/A |
| **Database query (p95)** | <50ms | <50ms |
| **WebSocket latency** | <10ms | <100ms |
| **Page load (SSR)** | <500ms | <2s |

---

## 🧪 Testing Requirements

### Must Test Before Commit
1. All unit tests pass (`npm test`)
2. E2E tests pass for critical flows
3. Database migrations run successfully
4. No TypeScript errors (`npm run typecheck`)
5. Linting passes (`npm run lint`)

### Continuous Testing
- Run tests on every file save (watch mode)
- Pre-commit hooks run tests
- GitHub Actions run full test suite

---

## 📝 Key Decisions Explained

### Why Docker for Everything?
- **Consistency**: Same environment dev → prod
- **Isolation**: No global dependencies
- **Easy onboarding**: `docker-compose up` and done
- **Testing**: Spin up clean DB for each test run

### Why Socket.io over Durable Objects?
- **Local testing**: Can't test Durable Objects locally
- **Full control**: Own the scaling, monitoring, debugging
- **Familiar**: Mature library, lots of examples
- **Cost**: Free in Docker, Durable Objects costs $5/mo minimum

### Why Local Storage First?
- **Test thoroughly**: File upload logic without S3 costs
- **Fast iteration**: No network latency
- **Simple**: Just map Docker volume
- **Production ready**: Easy to swap for S3/MinIO later

### Why Lucia Auth?
- **SvelteKit native**: Built for SvelteKit hooks
- **No external service**: Fully self-hosted
- **Flexible**: Easy to add OAuth providers
- **Lightweight**: No heavy SDK

---

## 🎯 MVP Timeline (5 Weeks)

### Week 1: Foundation ✅
- [x] Docker Compose setup
- [ ] SvelteKit + Tailwind initialized
- [ ] Prisma + PostgreSQL connected
- [ ] Lucia Auth + GitHub OAuth working
- [ ] Socket.io server running
- [ ] Basic test suite

### Week 2: Mobile UI
- [ ] Bottom tab navigation
- [ ] Responsive layouts
- [ ] Loading states
- [ ] Error boundaries
- [ ] Test: All UI components

### Week 3: Projects CRUD 🎯
- [ ] Project creation flow
- [ ] Project discovery feed
- [ ] GitHub repo linking
- [ ] Member management
- [ ] Test: Full project lifecycle

### Week 4: Real-time
- [ ] WebSocket connection
- [ ] Room management
- [ ] Live project updates
- [ ] Presence indicators
- [ ] Test: WebSocket reliability

### Week 5: Project Feed
- [ ] Post composer
- [ ] Comment system
- [ ] Real-time feed updates
- [ ] Pull-to-refresh
- [ ] Test: End-to-end flow

---

## ✅ Ready to Build!

All architecture decisions made. Starting implementation now.

Next steps:
1. Create Docker Compose configuration
2. Initialize SvelteKit monorepo
3. Set up Prisma schema
4. Implement Lucia Auth
5. Build Socket.io server
6. Write tests for everything

**Focus**: Test relentlessly at every step! 🧪
