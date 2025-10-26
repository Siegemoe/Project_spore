# Project Spore - Phase 2: Detailed Implementation Plan
**Total Effort**: 167 hours | **Phases**: 5 | **Features**: 10+

**This is the definitive guide for implementing Phase 2 features with minimal deviation.**

---

## 🎯 Implementation Order (STRICT)

**DO NOT deviate from this order without discussion:**

1. **Phase A**: Quick Wins + Config (24h)
2. **Phase B**: Profile Refactor (12h) ← MUST complete before Projects
3. **Phase C**: Engagement Features (26h)  
4. **Phase D**: Projects (45h)
5. **Phase E**: Direct Messaging E2E (60h)

---

## Phase A: Quick Wins + System Config (24 hours)

### A.1: Character Limits + Admin Config (2 hours)

**Hour 1: Database & Backend**
- [ ] Create migration `0012_system_config.sql`
- [ ] Create `system_config` table with RLS
- [ ] Create `features/config/actions.ts`
- [ ] Implement `getSystemConfig()` and `updateSystemConfig()`
- [ ] Add audit logging to config changes

**Hour 2: UI & Enforcement**
- [ ] Update `features/posts/contract.ts` - maxLength: 2000
- [ ] Update `features/comments/contract.ts` - maxLength: 1000
- [ ] Add character counter to Composer component
- [ ] Add character counter to CommentsClient
- [ ] Test: Try posting >2000 chars (should fail)

**Acceptance Criteria**:
✅ Posts capped at 2000 characters
✅ Comments capped at 1000 characters  
✅ UI shows "X/2000 characters" counter
✅ Server validates limits
✅ Super admin can change limits via config page (built in A.5)

---

### A.2: Profile Websites + Email Visibility (3 hours)

**Hour 1: Database Schema**
- [ ] Create migration `0013_profile_enhancements.sql`
- [ ] Add `websites JSONB` column to users table
- [ ] Add `email_public BOOLEAN` column to users table
- [ ] Create index on email_public
- [ ] Test migration in Supabase

**Hour 2: Edit Profile UI**
- [ ] Update `features/profile/contract.ts`
  - websites: array of URLs (max 5)
  - email_public: boolean
- [ ] Update `components/profile/EditProfileSheet.tsx`
  - Multi-website input (array state)
  - "Add Website" button (disabled at 5)
  - "Remove" button for each website
  - Email visibility checkbox
- [ ] URL validation on blur

**Hour 3: Profile Display + Navigation**
- [ ] Update `components/profile/ProfileHeader.tsx`
  - Display websites in about section
  - Show first 3, "Show X more" button for rest
  - Show email if email_public = true
  - Move GitHub link to about section
- [ ] Update TopBar account dropdown
  - Add "Edit Profile" menu item (first position)
  - Remove edit button from profile header
- [ ] Test on own profile

**Acceptance Criteria**:
✅ Users can add 0-5 websites
✅ URLs validated (must start with http/https)
✅ About shows first 3 websites
✅ "Show more" expands to show all
✅ Email checkbox works
✅ GitHub link in about section
✅ Edit profile in account dropdown

---

### A.3: Mobile/Desktop UX Standards (8 hours)

**Hours 1-2: Desktop Sidebar**
- [ ] Create `components/nav/DesktopSidebar.tsx`
- [ ] Navigation items: Home, Explore, Notifications, Profile, Settings
- [ ] Fixed left position, 240px width
- [ ] Icons + labels
- [ ] Active state highlighting
- [ ] User avatar at bottom

**Hours 3-4: Responsive Layout**
- [ ] Update `components/nav/AppChrome.tsx`
  - Show DesktopSidebar on `md:` breakpoint
  - Show MobileTabBar on mobile only
  - Adjust content padding for sidebar
- [ ] Hide MobileTabBar on desktop (`md:hidden`)
- [ ] Show DesktopSidebar on desktop (`hidden md:block`)
- [ ] Test transitions between breakpoints

**Hours 5-6: Breakpoint Utilities**
- [ ] Create `hooks/useMediaQuery.ts`
- [ ] Create `hooks/useBreakpoint.ts` (mobile/tablet/desktop)
- [ ] Update components using window.innerWidth to use hooks
- [ ] Document in `Cline_Info/UX_STANDARDS.md`

**Hours 7-8: Testing & Polish**
- [ ] Test every page on mobile (iPhone, Android sizes)
- [ ] Test every page on tablet (iPad)
- [ ] Test every page on desktop (1920x1080)
- [ ] Fix any overflow or layout issues
- [ ] Verify touch targets ≥44px on mobile

**Acceptance Criteria**:
✅ MobileTabBar only shows on mobile (<768px)
✅ DesktopSidebar only shows on desktop (≥768px)
✅ All pages responsive on all screen sizes
✅ No horizontal scroll
✅ Touch targets accessible on mobile
✅ UX standards documented

---

### A.4: Admin Promo Post System (4 hours)

**Hour 1: Database & Backend**
- [ ] Create migration `0014_promo_posts.sql`
- [ ] Create `promo_posts` table with RLS
- [ ] Create `features/promo/actions.ts`
  - `createPromoPost()`
  - `listPromoPosts(limit)`
  - `deletePromoPost(id)`
- [ ] Image upload to Supabase Storage

**Hour 2: Admin UI**
- [ ] Create `app/admin/promo/page.tsx`
- [ ] Form: Title (100 chars), Image upload, Content (5000 chars)
- [ ] Rich text editor for content
- [ ] Image preview
- [ ] List existing promo posts

**Hour 3: Public Promo Page**
- [ ] Update `app/promo/page.tsx`
- [ ] Query last 2 promo posts
- [ ] Beautiful card layout with image
- [ ] Responsive design
- [ ] Link to admin promo page (if super admin)

**Hour 4: Polish & Testing**
- [ ] Image optimization
- [ ] Loading states
- [ ] Error handling
- [ ] Test create/view/delete flow
- [ ] Verify only 2 posts show

**Acceptance Criteria**:
✅ Super admins can create promo posts
✅ /promo shows last 2 posts only
✅ Images optimized and cached
✅ Responsive on all devices
✅ Audit logged

---

### A.5: System Config Page (7 hours)

**Hours 1-2: Config Infrastructure**
- [ ] Expand `features/config/actions.ts`
- [ ] Config sections: Limits, Moderation, Features, Rate Limits
- [ ] Type-safe getters for each section
- [ ] Cache layer (5 min TTL)
- [ ] Invalidation on update

**Hours 3-4: Config UI**
- [ ] Create `app/admin/config/page.tsx`
- [ ] Tabbed interface (4 tabs)
- [ ] **Tab 1: Character Limits**
  - Posts, Comments, Bio, Display Name
  - Number inputs with validation
- [ ] **Tab 2: Moderation**
  - Auto-flag thresholds
  - Auto-hide thresholds
  - Spam sensitivity slider

**Hours 5-6: More Config Tabs**
- [ ] **Tab 3: Features**
  - Toggle switches for features
  - Likes enabled, Dislikes enabled
  - DMs enabled, Projects enabled
- [ ] **Tab 4: Rate Limits**
  - Posts per hour, Comments per hour
  - Follows per hour
  - Number inputs

**Hour 7: Integration & Testing**
- [ ] Update `lib/config.ts` to read from database
- [ ] Update contracts to use dynamic limits
- [ ] Test config changes take effect
- [ ] Test cache invalidation
- [ ] Document in admin guide

**Acceptance Criteria**:
✅ Super admins access /admin/config
✅ All 4 tabs functional
✅ Changes take effect immediately
✅ Config cached for performance
✅ Defaults can be restored
✅ All changes audit logged

---

## Phase B: Profile Refactor (12 hours)

### Overview
**CRITICAL**: This MUST be completed before Phase D (Projects) as it establishes the card-based UI and navigation structure.

---

### B.1: Card-Based Profile Layout (6 hours)

**Hours 1-2: ProfileCard Component**
- [ ] Create `components/profile/ProfileCard.tsx`
- [ ] Compact card design:
  - Avatar (large, left)
  - Name + handle (right of avatar)
  - Follower/following stats
  - Follow button
  - Link to GitHub (in card, not just about)
- [ ] Click avatar/name → stays on profile (no redirect to GitHub)
- [ ] Responsive: Stack on mobile

**Hours 3-4: AboutCard Component**
- [ ] Create `components/profile/AboutCard.tsx`
- [ ] Sections:
  - Bio text
  - Email (if public)
  - Websites (max 5, show 3 with expand)
  - GitHub link
- [ ] "Show more" button for websites
- [ ] Copy email/website buttons
- [ ] Responsive design

**Hours 5-6: Refactor Profile Page**
- [ ] Update `app/u/[handle]/page.tsx`
- [ ] Card-based layout:
  1. ProfileCard at top
  2. AboutCard below
  3. Tabs: Posts | Projects (coming soon)
- [ ] Remove old ProfileHeader (replace with ProfileCard)
- [ ] Test on multiple profiles
- [ ] Verify follow button works
- [ ] Mobile responsive check

**Acceptance Criteria**:
✅ Profile uses card-based layout
✅ ProfileCard shows avatar, name, stats, follow button
✅ AboutCard shows bio, websites, email, GitHub
✅ Photo/name click doesn't redirect to GitHub
✅ Responsive on mobile/tablet/desktop
✅ Edit profile moved to account dropdown (from A.2)

---

### B.2: Projects Tab Preparation (3 hours)

**Hour 1: Tab Navigation**
- [ ] Update `components/profile/ProfileTabs.tsx`
- [ ] Add "Projects" tab (alongside Posts)
- [ ] "Coming Soon" badge on Projects tab
- [ ] Tab switching works
- [ ] URL state: /u/[handle]?tab=posts or ?tab=projects

**Hour 2: Coming Soon UI**
- [ ] Create `components/profile/ProjectsTab.tsx`
- [ ] Beautiful "Coming Soon" message
- [ ] Teaser: "Projects will let @user showcase their work"
- [ ] Email signup for updates (optional)
- [ ] Mockup/preview image

**Hour 3: Navigation Architecture**
- [ ] Document tab structure in code
- [ ] Prepare for Projects data fetching
- [ ] Create placeholder `features/projects/` folder
- [ ] Document Projects integration points

**Acceptance Criteria**:
✅ Projects tab visible on profile
✅ Coming soon message displays
✅ Tab navigation works
✅ URL state preserved
✅ Ready for Projects implementation

---

### B.3: Final Profile Polish (3 hours)

**Hour 1: Profile Edit in Dropdown**
- [ ] Verify edit profile in account dropdown works
- [ ] Remove any lingering edit buttons
- [ ] Test edit flow end-to-end
- [ ] Verify all profile fields save correctly

**Hour 2: About Section Polish**
- [ ] Ensure about section looks great
- [ ] Test website expand/collapse
- [ ] Test email visibility toggle
- [ ] Test GitHub link
- [ ] Copy to clipboard for all links

**Hour 3: Cross-Browser Testing**
- [ ] Test on Chrome, Firefox, Safari
- [ ] Test on iOS Safari, Android Chrome  
- [ ] Fix any browser-specific issues
- [ ] Verify animations smooth
- [ ] Load testing with many websites

**Acceptance Criteria**:
✅ Profile works on all browsers
✅ All features tested and working
✅ No bugs in edit flow
✅ Performance acceptable
✅ Ready for Projects integration

---

## Phase C: Engagement Features (26 hours)

### Overview
Core social features that drive user engagement and platform quality.

---

### C.1: Likes & Dislikes System (8 hours)

**Hours 1-2: Database Schema**
- [ ] Create migration `0015_reactions.sql`
```sql
CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id UUID NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id)
);

CREATE INDEX idx_reactions_target ON reactions(target_type, target_id);
CREATE INDEX idx_reactions_user ON reactions(user_id);

-- Aggregate counts (for performance)
CREATE TABLE reaction_counts (
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  likes INTEGER DEFAULT 0,
  dislikes INTEGER DEFAULT 0,
  PRIMARY KEY (target_type, target_id)
);
```
- [ ] RLS policies for reactions
- [ ] Triggers to update counts

**Hours 3-4: React Hooks**
- [ ] Create `features/reactions/hooks.ts`
- [ ] `useReactions(targetType, targetId)` - Get counts
- [ ] `useUserReaction(targetType, targetId)` - User's reaction
- [ ] `useToggleReaction(targetType, targetId, type)` - Toggle like/dislike
- [ ] Optimistic updates

**Hours 5-6: UI Components**
- [ ] Create `components/reactions/ReactionButtons.tsx`
- [ ] 👍 Like button with count
- [ ] 👎 Dislike button with count
- [ ] Active state when user reacted
- [ ] Animated count updates
- [ ] Hover states

**Hours 7-8: Integration & Testing**
- [ ] Add ReactionButtons to PostCard
- [ ] Add ReactionButtons to each comment
- [ ] Test like/dislike toggle
- [ ] Test counts update in real-time
- [ ] Test multiple users liking same post
- [ ] Auto-flag posts with -10 dislikes (config)

**Acceptance Criteria**:
✅ Users can like/dislike posts and comments
✅ Counts display accurately
✅ Toggle works (like→dislike→none)
✅ Optimistic UI updates
✅ Real-time count updates
✅ Auto-flagging at threshold

---

### C.2: Quick Report System (8 hours)

**Hours 1-2: Report Modal UI**
- [ ] Create `components/moderation/QuickReportModal.tsx`
- [ ] Trigger: "Report" button on posts/comments
- [ ] Modal with predefined categories (checkboxes):
  - Hate Speech
  - Harassment/Bullying
  - Self-Harm Encouragement
  - Spam
  - Violence
  - Sexual Content
  - Misinformation
  - Copyright Violation
  - Other
- [ ] Allow multiple selections
- [ ] Optional details textarea
- [ ] Submit button

**Hours 3-4: Report Flow Integration**
- [ ] Add "Report" button to PostCard (in action row)
- [ ] Add "Report" button to comments
- [ ] Wire up to `createReport()` action
- [ ] Success toast: "Report submitted"
- [ ] Close modal on success
- [ ] Disable report if already reported

**Hours 5-6: Quick Dislike-Report Flow**
- [ ] If user dislikes AND clicks report
- [ ] Modal pre-selects likely category based on:
  - Recent reports on same content
  - AI keyword detection (future)
- [ ] Streamlined 2-click flow:
  1. Dislike (tallies)
  2. Report (modal with suggested categories)

**Hours 7-8: Testing & Polish**
- [ ] Test report submission
- [ ] Verify reports appear in admin moderation queue
- [ ] Test category selection
- [ ] Test dislike + report flow
- [ ] Prevent duplicate reports
- [ ] Loading states

**Acceptance Criteria**:
✅ Report button on all posts/comments
✅ Modal with predefined categories
✅ Multiple categories selectable
✅ Reports go to moderation queue
✅ Dislike + report flow smooth
✅ Can't report same content twice

---

### C.3: Notifications System (12 hours)

**Hours 1-3: Database Schema**
- [ ] Create migration `0016_notifications.sql`
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'comment_reply',
    'post_like',
    'comment_like',
    'post_dislike',
    'new_follower',
    'dm_received',
    'mention'
  )),
  actor_id UUID REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT CHECK (target_type IN ('post', 'comment', 'dm')),
  target_id UUID,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, read, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, created_at DESC) WHERE read = false;
```
- [ ] RLS policies
- [ ] Cleanup policy (delete after 30 days)

**Hours 4-6: Notification Actions**
- [ ] Create `features/notifications/actions.ts`
  - `createNotification()`
  - `listNotifications(userId, unreadOnly)`
  - `markAsRead(notificationId)`
  - `markAllAsRead(userId)`
  - `getUnreadCount(userId)`
- [ ] Integrate into:
  - Comment creation → notify post author
  - Like/dislike → notify content owner
  - New follower → notify user
  - DM received → notify recipient

**Hours 7-9: Notification UI**
- [ ] Create `components/notifications/NotificationBell.tsx`
- [ ] Bell icon with unread badge
- [ ] Dropdown list of notifications
- [ ] Mark as read on view
- [ ] Click notification → navigate to target
- [ ] "Mark all read" button

**Hours 10-12: Real-Time Updates**
- [ ] Supabase Realtime subscription
- [ ] Subscribe to notifications table
- [ ] Update unread count in real-time
- [ ] Toast for new notifications
- [ ] Sound notification (optional, user pref)

**Acceptance Criteria**:
✅ Notifications created for: comments, likes, follows, DMs
✅ Bell shows unread count
✅ Dropdown lists recent notifications
✅ Click notification navigates to content
✅ Real-time updates via Supabase Realtime
✅ Mark as read works
✅ Performant (no lag with 100+ notifications)

---

### C.4: Modular Posts/Comments Architecture (6 hours)

**Hours 1-2: Database Refactor**
- [ ] Create migration `0017_modular_content.sql`
```sql
-- Add polymorphic columns
ALTER TABLE posts ADD COLUMN parent_type TEXT DEFAULT 'user' CHECK (parent_type IN ('user', 'project'));
ALTER TABLE posts ADD COLUMN parent_id UUID NOT NULL DEFAULT auth.uid();

-- Update foreign key to be polymorphic (handled in app logic)
-- Index for querying by parent
CREATE INDEX idx_posts_parent ON posts(parent_type, parent_id, created_at DESC);

-- Same for comments if needed
ALTER TABLE comments ADD COLUMN parent_type TEXT DEFAULT 'post' CHECK (parent_type IN ('post', 'project_post'));
```
- [ ] Backfill existing posts: `parent_type = 'user'`, `parent_id = user_id`

**Hours 3-4: Update Actions**
- [ ] Update `features/posts/actions.ts`
  - `listFeed()` - filter by parent_type
  - `createPost()` - accept parent_type and parent_id
  - `listPostsForParent(type, id)`
- [ ] Update `features/comments/actions.ts`
  - Support polymorphic parents

**Hours 5-6: UI Updates & Testing**
- [ ] Update Composer to accept parent context
- [ ] Update FeedClient to filter by parent
- [ ] Test user posts still work
- [ ] Test comments still work
- [ ] Prepare for project posts

**Acceptance Criteria**:
✅ Posts have parent_type and parent_id
✅ Can query posts for specific parent
✅ User posts: parent_type='user'
✅ Project posts: parent_type='project' (ready)
✅ Existing functionality unaffected
✅ Migration backward compatible

---

## Phase D: Projects Feature (45 hours)

### Overview
**MAJOR FEATURE**: Projects act as organizations with multi-user collaboration, permissions, kanban boards, and social features.

---

### D.1: Project Infrastructure (10 hours)

**Hours 1-3: Database Schema**
- [ ] Create migration `0018_projects.sql`
```sql
-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  website_url TEXT,
  github_repo_url TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project members with roles
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'contributor')),
  invited_by UUID REFERENCES users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);

-- Project stats
CREATE TABLE project_stats (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  member_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  follower_count INTEGER DEFAULT 0
);
```
- [ ] RLS policies for projects
- [ ] Permission helper functions

**Hours 4-6: Project Actions**
- [ ] Create `features/projects/actions.ts`
  - `createProject(name, description, github_repo)`
  - `updateProject(id, data)` - Owner/admin only
  - `deleteProject(id)` - Owner only
  - `listUserProjects(userId)`
  - `getProject(slug)`
- [ ] Create `features/projects/permissions.ts`
  - `canManageProject(userId, projectId)` - Owner/admin
  - `canContribute(userId, projectId)` - Any member
  - `canViewProject(userId, projectId)` - Public or member

**Hours 7-10: Project CRUD**
- [ ] Create `app/projects/[slug]/page.tsx` - Project detail page
- [ ] Create `app/projects/new/page.tsx` - Create project form
- [ ] Project settings page (owner/admin only)
- [ ] Test create/view/edit/delete flows

**Acceptance Criteria**:
✅ Users can create projects
✅ Projects have unique slugs
✅ Owners can manage projects
✅ Members can view projects
✅ Permission system works

---

### D.2: Permission System (8 hours)

**Hours 1-3: Permission Types**
```typescript
// Owner permissions (creator + can delete project)
- Manage all settings
- Delete project
- Transfer ownership
- Manage members (invite, remove, change roles)

// Admin permissions
- Manage settings (except delete)
- Manage members
- Manage content

// Contributor permissions
- Create posts
- Comment
- View kanban
- Cannot manage settings or members
```
- [ ] Implement in `features/projects/permissions.ts`
- [ ] Create helper: `requireProjectPermission()`
- [ ] RLS policies enforce permissions

**Hours 4-6: Member Management UI**
- [ ] Create `components/projects/MemberList.tsx`
- [ ] Show all members with roles
- [ ] Invite member button (owner/admin)
- [ ] Change role dropdown (owner only)
- [ ] Remove member button (owner/admin)
- [ ] Member search/autocomplete

**Hours 7-8: Testing & Edge Cases**
- [ ] Test permission enforcement
- [ ] Test member invite flow
- [ ] Test role changes
- [ ] Test removing members
- [ ] Test ownership transfer
- [ ] Security: Can't escalate own role

**Acceptance Criteria**:
✅ 3 roles: Owner, Admin, Contributor
✅ Permissions enforced at database + UI
✅ Members can be invited
✅ Roles can be changed (owner only)
✅ Members can be removed
✅ Ownership transferrable

---

### D.3: Interactive Kanban Board (12 hours)

**Hours 1-3: Kanban Database**
- [ ] Add to migration `0018_projects.sql`
```sql
CREATE TABLE kanban_columns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE kanban_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  column_id UUID NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES users(id),
  position INTEGER NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kanban_cards_column ON kanban_cards(column_id, position);
```
- [ ] Default columns: Backlog, In Progress, Review, Done

**Hours 4-6: Kanban Actions**
- [ ] Create `features/projects/kanban-actions.ts`
  - `createColumn()`
  - `updateColumn()`
  - `deleteColumn()`
  - `createCard()`
  - `updateCard()`
  - `moveCard(cardId, columnId, position)`
  - `assignCard(cardId, userId)`

**Hours 7-9: Drag & Drop UI**
- [ ] Create `components/projects/KanbanBoard.tsx`
- [ ] Use `@dnd-kit/core` for drag and drop
- [ ] Column components
- [ ] Card components  
- [ ] Drag preview
- [ ] Drop zones
- [ ] Smooth animations

**Hours 10-12: Polish & Real-Time**
- [ ] Supabase Realtime for kanban updates
- [ ] Optimistic updates on drag
- [ ] Collaborative editing (see others' changes)
- [ ] Undo functionality
- [ ] Mobile-friendly (swipe to move)

**Acceptance Criteria**:
✅ Kanban board displays columns and cards
✅ Drag and drop works smoothly
✅ Cards can be moved between columns
✅ Cards can be assigned to members
✅ Real-time updates (collaborative)
✅ Mobile touch-friendly

---

### D.4: Project Posts & Comments (8 hours)

**Hours 1-2: Integration**
- [ ] Wire Composer to accept project context
- [ ] `createPost(parent_type: 'project', parent_id: projectId)`
- [ ] Project posts show in project feed
- [ ] Comments work on project posts

**Hours 3-4: Project Feed UI**
- [ ] Create `components/projects/ProjectFeed.tsx`
- [ ] List posts for project
- [ ] Composer at top (members only)
- [ ] Same PostCard component
- [ ] Pagination

**Hours 5-6: Permissions**
- [ ] Only members can post
- [ ] Anyone can view public projects
- [ ] Private projects: members only
- [ ] Post author or project admin can delete posts

**Hours 7-8: Testing**
- [ ] Test create post as member
- [ ] Test view as non-member
- [ ] Test comments on project posts
- [ ] Test permissions
- [ ] Test feed pagination

**Acceptance Criteria**:
✅ Members can post to project
✅ Project feed shows project posts only
✅ Comments work on project posts
✅ Permissions enforced
✅ Feed paginated

---

### D.5: GitHub Integration (7 hours)

**Hours 1-2: GitHub API Integration**
- [ ] Create `features/projects/github-sync.ts`
- [ ] Fetch repo data (stars, forks, issues, contributors)
- [ ] Cache GitHub data (1 hour TTL)
- [ ] Handle rate limits
- [ ] Create GitHub webhook handler (for auto-updates)

**Hours 3-4: Display GitHub Data**
- [ ] Create `components/projects/GitHubStats.tsx`
- [ ] Show: Stars, Forks, Open Issues, Contributors
- [ ] Link to GitHub repo
- [ ] Last commit date
- [ ] Recent activity feed

**Hours 5-6: GitHub Sync UI**
- [ ] Manual sync button (refreshes GitHub data)
- [ ] Auto-sync on page load (if >1 hour old)
- [ ] Loading state while syncing
- [ ] Error handling (repo not found, private, etc.)

**Hour 7: Testing & Polish**
- [ ] Test with various GitHub repos
- [ ] Test rate limit handling
- [ ] Test private repos (show limited info)
- [ ] Verify caching works
- [ ] Performance optimization

**Acceptance Criteria**:
✅ GitHub repo data displays on project page
✅ Stats update (manually or auto)
✅ Handles errors gracefully
✅ Respects GitHub rate limits
✅ Cached for performance

---

## Phase E: Direct Messaging with E2E Encryption (60 hours)

### Overview
**MOST COMPLEX FEATURE**: Reddit-style DM system with end-to-end encryption, real-time messaging, and rich features.

**Architecture Decision**: Signal Protocol for E2E encryption
- Industry standard (used by WhatsApp, Signal)
- Well-documented libraries
- Forward secrecy

---

### E.1: DM Infrastructure (15 hours)

**Hours 1-4: Database Schema**
- [ ] Create migration `0019_direct_messaging.sql`
```sql
-- DM threads (conversations)
CREATE TABLE dm_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Thread participants
CREATE TABLE dm_participants (
  thread_id UUID NOT NULL REFERENCES dm_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY (thread_id, user_id)
);

CREATE INDEX idx_dm_participants_user ON dm_participants(user_id, thread_id);

-- Messages (encrypted content)
CREATE TABLE dm_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES dm_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  encrypted_content TEXT NOT NULL,  -- E2E encrypted
  content_iv TEXT NOT NULL,          -- Initialization vector
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_dm_messages_thread ON dm_messages(thread_id, sent_at DESC);

-- Encryption keys (per-user, per-device)
CREATE TABLE user_encryption_keys (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  identity_key TEXT NOT NULL,
  signed_prekey TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, device_id)
);
```
- [ ] RLS policies (users can only see their threads)
- [ ] Indexes for performance

**Hours 5-8: DM Actions**
- [ ] Create `features/dm/actions.ts`
  - `createThread(participantIds)`
  - `getOrCreateThread(otherUserId)` - 1-on-1 thread
  - `listThreads(userId)` - User's conversations
  - `sendMessage(threadId, encryptedContent, iv)`
  - `listMessages(threadId, limit, cursor)`
  - `markThreadAsRead(threadId)`
- [ ] Create `features/dm/queries.ts` for React Query

**Hours 9-12: Basic DM UI (No Encryption Yet)**
- [ ] Create `app/dm/page.tsx` - Inbox view
- [ ] Create `app/dm/[threadId]/page.tsx` - Conversation view
- [ ] Create `components/dm/ThreadList.tsx`
- [ ] Create `components/dm/MessageList.tsx`
- [ ] Create `components/dm/MessageInput.tsx`
- [ ] Test basic messaging (unencrypted for now)

**Hours 13-15: Navigation Updates**
- [ ] Replace "Alerts" with "DM" in navigation
- [ ] Update DesktopSidebar (DM icon + unread badge)
- [ ] Update MobileTabBar (DM icon)
- [ ] Move alerts to notification dropdown
- [ ] Test navigation flow

**Acceptance Criteria**:
✅ DM replaces Alerts in navigation
✅ Can start conversation with any user
✅ Thread list shows recent messages
✅ Can send/receive messages (unencrypted)
✅ Message history paginated
✅ Unread badge shows

---

### E.2: End-to-End Encryption (20 hours)

**Hours 1-5: Encryption Setup**
- [ ] Install `libsignal-protocol` or `@signalapp/libsignal-client`
- [ ] Create `lib/encryption/signal.ts`
  - Key generation
  - Identity key management
  - Prekey bundle creation
- [ ] Create `lib/encryption/message-crypto.ts`
  - Encrypt message
  - Decrypt message
  - Key exchange

**Hours 6-10: Key Management**
- [ ] Create `features/dm/key-actions.ts`
  - `generateUserKeys(userId, deviceId)`
  - `storePublicKeys()`
  - `getPublicKeys(userId)`
  - `rotateKeys()` - Periodic rotation
- [ ] Client-side key generation on first DM
- [ ] Secure key storage (IndexedDB)

**Hours 11-15: Encryption Integration**
- [ ] Update `features/dm/actions.ts`
  - Encrypt before `sendMessage()`
  - Decrypt in `listMessages()`
- [ ] Handle key exchange on new thread
- [ ] Forward secrecy (ratcheting)
- [ ] Handle device changes

**Hours 16-20: Testing & Security**
- [ ] Test message encryption/decryption
- [ ] Test key exchange
- [ ] Test multi-device (if user has multiple sessions)
- [ ] Security audit: Ensure admins can't decrypt
- [ ] Test key rotation
- [ ] Performance testing

**Acceptance Criteria**:
✅ All messages encrypted end-to-end
✅ Only sender/recipient can decrypt
✅ Admins cannot read message content
✅ Key exchange automatic
✅ Forward secrecy implemented
✅ Performance acceptable (<100ms encrypt/decrypt)

---

### E.3: Real-Time Messaging (15 hours)

**Hours 1-4: Supabase Realtime**
- [ ] Subscribe to dm_messages for active thread
- [ ] New message → append to list instantly
- [ ] Typing indicators
  - Track who's typing
  - Show "User is typing..." indicator
- [ ] Online/offline status

**Hours 5-8: Message Features**
- [ ] Message reactions (👍❤️😂 etc.)
- [ ] Reply to message (thread within thread)
- [ ] Edit message (shows "edited" badge)
- [ ] Delete message (soft delete, shows "deleted")
- [ ] Message search within thread

**Hours 9-12: Media in DMs**
- [ ] Image sharing (encrypted)
- [ ] File attachments (encrypted)
- [ ] Image preview
- [ ] File size limits
- [ ] Virus scanning

**Hours 13-15: Polish & Optimization**
- [ ] Lazy load old messages (infinite scroll up)
- [ ] Message batching (don't spam realtime)
- [ ] Offline support (queue messages)
- [ ] Auto-scroll to latest
- [ ] Unread message count per thread

**Acceptance Criteria**:
✅ Messages appear instantly (real-time)
✅ Typing indicators work
✅ Can send images/files (encrypted)
✅ Message editing/deletion works
✅ Search messages
✅ Performant with 1000+ messages

---

### E.4: DM UI/UX Polish (10 hours)

**Hours 1-3: Desktop Layout**
- [ ] Three-column layout:
  1. Thread list (left, 300px)
  2. Messages (center, flexible)
  3. Thread info (right, 250px, collapsible)
- [ ] Beautiful message bubbles
- [ ] Timestamps
- [ ] Read receipts
- [ ] User avatars

**Hours 4-6: Mobile Layout**
- [ ] Single-column views
- [ ] Thread list → tap thread → message view
- [ ] Back button to thread list
- [ ] Swipe gestures
- [ ] Mobile keyboard handling

**Hours 7-8: Thread Features**
- [ ] Thread settings (mute, archive, delete)
- [ ] Search threads
- [ ] Filter: All, Unread, Archived
- [ ] Thread sorting (most recent first)

**Hours 9-10: Final Polish**
- [ ] Loading states
- [ ] Empty states ("No messages yet")
- [ ] Error handling
- [ ] Accessibility (keyboard navigation)
- [ ] Cross-browser testing

**Acceptance Criteria**:
✅ Beautiful UI on desktop and mobile
✅ Three-column desktop layout
✅ Mobile optimized
✅ All features accessible
✅ Performant and smooth
✅ No bugs in common flows

---

## Testing Requirements

### Unit Tests (Per Phase)
Each phase must include unit tests:
- [ ] Utility function tests
- [ ] Hook tests
- [ ] Action tests (mocked Supabase)
- [ ] Component tests (React Testing Library)

**Coverage Target**: 70% for new code

### Integration Tests
- [ ] Create user → edit profile → add websites
- [ ] Like post → notification → mark read
- [ ] Report content → admin reviews → resolves
- [ ] Create project → invite member → assign kanban card
- [ ] Send DM → receive DM → reply (encrypted)

### E2E Tests
- [ ] Complete user journey: Signup → post → get likes → receive notification
- [ ] Moderation flow: User reports → admin reviews → content removed
- [ ] Project collaboration: Create project → invite team → kanban workflow
- [ ] Messaging flow: Start DM → encrypted messages → media sharing

---

## Migration Execution Order

**CRITICAL**: Run migrations in this exact order:

1. `0012_system_config.sql` (Phase A)
2. `0013_profile_enhancements.sql` (Phase A)
3. `0014_promo_posts.sql` (Phase A)
4. `0015_reactions.sql` (Phase C)
5. `0016_notifications.sql` (Phase C)
6. `0017_modular_content.sql` (Phase C)
7. `0018_projects.sql` (Phase D - includes kanban tables)
8. `0019_direct_messaging.sql` (Phase E)

**After Each Migration**:
- [ ] Test in Supabase SQL Editor
- [ ] Verify no errors
- [ ] Check indexes created
- [ ] Verify RLS policies active

---

## Dependencies & Prerequisites

### Required Packages (Install Before Starting)
```bash
# Phase D: Projects
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Phase E: Direct Messaging
npm install @signalapp/libsignal-client
npm install idb  # IndexedDB wrapper for key storage

# Testing
npm install --save-dev @testing-library/react @testing-library/user-event
```

### Environment Variables
```bash
# GitHub API (for Projects)
GITHUB_PERSONAL_ACCESS_TOKEN=  # For repo data fetching

# Encryption (for DMs)
SIGNAL_SERVER_URL=  # Optional: Use libsignal default
```

### Supabase Setup
- [ ] Enable Realtime on all tables
- [ ] Configure Storage bucket for promo images
- [ ] Set up database backups (before schema changes)
- [ ] Review RLS policies with team

---

## Success Metrics

### Phase A: Quick Wins
- [ ] Character counter visible on 100% of posts/comments
- [ ] 80%+ users add at least 1 website to profile
- [ ] Mobile/Desktop UX score: 95+ (Lighthouse)
- [ ] Admin uses config page within 1 week

### Phase B: Profile Refactor
- [ ] Profile page load time <500ms (p95)
- [ ] 0 layout shift (CLS score)
- [ ] Card-based layout on 100% of profiles

### Phase C: Engagement
- [ ] 50%+ posts receive likes/dislikes
- [ ] Report submissions increase 3x (easier flow)
- [ ] Notification engagement rate >40%

### Phase D: Projects
- [ ] 100+ projects created in first month
- [ ] Avg 3 members per project
- [ ] Kanban used by 60%+ of projects
- [ ] GitHub integration on 80%+ of projects

### Phase E: Direct Messaging
- [ ] 1000+ DM threads created
- [ ] 100% messages encrypted
- [ ] Avg response time <5 minutes
- [ ] 0 security incidents

---

## Risk Mitigation

### High-Risk Items

**1. E2E Encryption Complexity**
- **Risk**: Implementation bugs could expose messages
- **Mitigation**: 
  - Use battle-tested libraries (@signalapp/libsignal-client)
  - Comprehensive security testing
  - Code review by security expert
  - Gradual rollout (beta users first)

**2. Projects Feature Scope**
- **Risk**: 45 hours might not be enough
- **Mitigation**:
  - MVP first (basic projects without kanban)
  - Kanban as Phase D.5 (can delay if needed)
  - Use off-the-shelf kanban library

**3. Real-Time Performance**
- **Risk**: Supabase Realtime could be slow at scale
- **Mitigation**:
  - Implement message batching
  - Fallback to polling if Realtime fails
  - Load testing before launch

**4. Mobile UX Breaking Changes**
- **Risk**: Desktop sidebar might break existing mobile users
- **Mitigation**:
  - Gradual rollout via feature flag
  - Extensive testing on real devices
  - User feedback collection

---

## Timeline Estimates

**Full-Time (40 hrs/week)**:
- Phase A: 3 days
- Phase B: 1.5 days
- Phase C: 3.5 days
- Phase D: 5.5 days
- Phase E: 7.5 days
**Total: ~21 days (1 month)**

**Part-Time (20 hrs/week)**:
- Phase A: 6 days
- Phase B: 3 days
- Phase C: 6.5 days
- Phase D: 11 days
- Phase E: 15 days
**Total: ~41 days (2 months)**

**Sprint-Based (2-week sprints)**:
- Sprint 1: Phase A + Phase B (36h)
- Sprint 2: Phase C (26h)
- Sprint 3-4: Phase D (45h)
- Sprint 5-7: Phase E (60h)
**Total: 7 sprints (3.5 months)**

---

## Implementation Best Practices

### Code Organization
```
features/
├── config/          # System configuration
├── reactions/       # Likes/dislikes
├── notifications/   # Notification system
├── projects/        # Projects feature
│   ├── actions.ts
│   ├── permissions.ts
│   ├── kanban-actions.ts
│   └── github-sync.ts
└── dm/             # Direct messaging
    ├── actions.ts
    ├── key-actions.ts
    └── queries.ts

components/
├── reactions/       # ReactionButtons
├── moderation/      # QuickReportModal
├── notifications/   # NotificationBell, NotificationList
├── projects/        # KanbanBoard, MemberList, ProjectFeed
└── dm/             # ThreadList, MessageList, MessageInput
```

### Database Best Practices
- **Indexes**: Add for all foreign keys and frequently queried columns
- **RLS**: Enable on ALL tables, test policies thoroughly
- **Triggers**: Use for aggregate counts (reactions, stats)
- **Cleanup**: Schedule jobs for old data (notifications >30 days, etc.)

### Security Checklist (Per Feature)
- [ ] Input validation (Zod schemas)
- [ ] XSS prevention (sanitize user input)
- [ ] SQL injection prevention (parameterized queries)
- [ ] CSRF protection (for state-changing actions)
- [ ] Rate limiting (per user, per IP)
- [ ] Permission checks (server-side)
- [ ] Audit logging (for admin actions)

### Performance Checklist
- [ ] Database indexes on foreign keys
- [ ] React Query for data fetching
- [ ] Optimistic updates for mutations
- [ ] Lazy loading for lists
- [ ] Image optimization
- [ ] Code splitting for large features
- [ ] Memoization for expensive computations

---

## Deployment Strategy

### Gradual Rollout Plan

**Phase A: Quick Wins (Low Risk)**
- Deploy to production immediately
- Monitor for 24 hours
- Fix any issues before Phase B

**Phase B: Profile Refactor (Medium Risk)**
- Feature flag: `ENABLE_NEW_PROFILE_LAYOUT`
- Beta test with 10% of users
- Gather feedback
- Fix issues
- Roll out to 100%

**Phase C: Engagement (Medium Risk)**
- Deploy likes/dislikes first (simpler)
- Beta test with 25% of users
- Then notifications (more complex)
- Then quick report (integrates with existing)

**Phase D: Projects (High Risk)**
- Feature flag: `ENABLE_PROJECTS`
- Closed beta with selected users (50 users max)
- Stress test kanban with heavy usage
- Security audit
- Gradual rollout: 10% → 50% → 100%

**Phase E: DMs (HIGHEST RISK)**
- Feature flag: `ENABLE_DMS`
- Private beta with trusted users
- Security penetration testing
- Encryption audit by expert
- Very gradual rollout: 5% → 10% → 25% → 100%

---

## Monitoring & Alerting

### Key Metrics to Track

**Performance**:
- API response times (p50, p95, p99)
- Page load times
- Database query times
- Real-time message latency

**Engagement**:
- Daily active users
- Likes/dislikes per post
- Report submission rate
- Notification click-through rate
- DM usage (threads, messages)

**Security**:
- Failed encryption attempts
- Report queue size
- Flagged content rate
- DM encryption errors

### Alerts to Configure
- [ ] API response time >1s (warning)
- [ ] Error rate >5% (critical)
- [ ] Moderation queue >100 (warning)
- [ ] DM encryption failure (critical)
- [ ] Database CPU >80% (warning)

---

## Documentation Requirements

### Per Phase
- [ ] Update README with new features
- [ ] API documentation (if exposing endpoints)
- [ ] User guide updates
- [ ] Admin guide updates
- [ ] Migration guide

### Code Documentation
- [ ] JSDoc comments on all public functions
- [ ] README in each feature folder
- [ ] Database schema diagrams
- [ ] Architecture decision records (ADRs)

---

## Final Checklist Before Launch

### Phase A
- [ ] All 5 tasks complete
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] Responsive on all devices
- [ ] Performance acceptable
- [ ] Security audit passed

### Phase B
- [ ] Profile refactor complete
- [ ] Card layout on all profiles
- [ ] Edit profile in dropdown
- [ ] Projects tab ready
- [ ] No breaking changes

### Phase C
- [ ] Likes/dislikes functional
- [ ] Reports going to queue
- [ ] Notifications real-time
- [ ] Modular posts working

### Phase D
- [ ] Projects create/manage
- [ ] Permissions enforced
- [ ] Kanban functional
- [ ] GitHub integration working

### Phase E
- [ ] DMs encrypted end-to-end
- [ ] Real-time messaging
- [ ] Security audit passed
- [ ] Performance acceptable

---

## Summary

**Total Effort**: 167 hours (4 months part-time)

**Phases**:
1. ✅ Phase A: Quick Wins + Config (24h)
2. ✅ Phase B: Profile Refactor (12h)
3. ✅ Phase C: Engagement (26h)
4. ✅ Phase D: Projects (45h)
5. ✅ Phase E: DMs E2E (60h)

**Key Deliverables**:
- Character limits with admin control
- Multi-website profiles with privacy
- Responsive mobile/desktop UX
- Admin promo post system
- System config dashboard
- Card-based profiles
- Likes/dislikes with reporting
- Real-time notifications
- Modular post architecture
- Full project collaboration platform
- End-to-end encrypted messaging

**Business Impact**:
- 3-5x increase in DAU (engagement features)
- Higher content quality (quick reporting)
- Developer platform differentiation (Projects + Kanban)
- Enterprise-ready security (E2E encryption)
- $1B ARR-ready infrastructure

**This plan provides military precision for implementation. Follow it closely for best results!** 🚀
