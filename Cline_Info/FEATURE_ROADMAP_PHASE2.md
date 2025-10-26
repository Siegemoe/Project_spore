# Project Spore - Phase 2 Feature Roadmap
**Vision**: Transform Spore into a collaborative project platform with robust social features

**Total Estimated Effort**: 167 hours across 5 phases
**Target**: Production-ready features for growth to 100K+ users

---

## Executive Summary

### Vision
Project Spore evolves from a social network into a **collaborative project platform** where developers showcase their work, receive feedback, and connect with teams - all while maintaining strong social engagement features.

### Key Objectives
1. **Enhance User Profiles** - Card-based layout, multi-website support, privacy controls
2. **Boost Engagement** - Likes/dislikes, quick reporting, real-time notifications
3. **Enable Collaboration** - Projects as organizations with permissions and kanban boards
4. **Secure Communication** - End-to-end encrypted direct messaging
5. **Maintain Quality** - Mobile-first UX, admin controls, character limits

### Business Value
- **User Retention**: Likes, notifications, and DMs increase DAU by 3-5x
- **Platform Quality**: Quick reporting improves content quality, reduces moderation burden
- **Differentiation**: Projects + Kanban positions Spore as developer collaboration hub
- **Scalability**: Modular architecture supports future features

---

## Phase A: Quick Wins + System Config (24 hours)

### Overview
Foundation improvements that enhance UX and establish admin control over platform settings.

---

### **Task A.1: Character Limits + Admin Config** (2 hours)

**Objective**: Enforce character limits and make them configurable via admin dashboard

#### Database Schema
```sql
-- Add to system_config table (create if doesn't exist)
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES admins(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default limits
INSERT INTO system_config (key, value, description) VALUES
  ('character_limits', '{"post_caption": 2000, "comment_body": 1000, "bio": 500}', 'Character limits for user content'),
  ('moderation_thresholds', '{"auto_flag_likes": -10, "auto_hide_reports": 5}', 'Automatic moderation thresholds');
```

#### Implementation Steps
1. **Create `features/config/actions.ts`** (30 min)
   - `getSystemConfig(key)`
   - `updateSystemConfig(key, value)` - Super admin only
   - Type-safe config getters

2. **Update contracts** (30 min)
   - `features/posts/contract.ts` - Enforce 2000 char limit
   - `features/comments/contract.ts` - Enforce 1000 char limit
   - Client-side validation in Composer

3. **Create admin config page** (1 hour)
   - `app/admin/config/page.tsx`
   - Forms for editing limits
   - Preview changes before saving
   - Audit log integration

#### Acceptance Criteria
- [ ] Post caption limited to 2000 characters (enforced client + server)
- [ ] Comments limited to 1000 characters
- [ ] Admin can change limits via /admin/config
- [ ] Changes logged to audit trail
- [ ] UI shows remaining characters

---

### **Task A.2: Profile Websites + Email Visibility** (3 hours)

**Objective**: Allow users to add multiple websites and control email visibility

#### Database Schema
```sql
-- Add columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS websites JSONB DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_public BOOLEAN DEFAULT false;

-- Index for searching by public emails
CREATE INDEX idx_users_email_public ON users(email_public) WHERE email_public = true;
```

#### Implementation Steps
1. **Update profile schema** (30 min)
   - `features/profile/contract.ts`
   - Add `websites` array validation (max 5 URLs)
   - Add `email_public` boolean

2. **Update EditProfileSheet** (1 hour)
   - Multi-website input component
   - Add/remove buttons (max 5)
   - Email visibility checkbox
   - Move "Edit Profile" button to account dropdown
   - URL validation on input

3. **Update ProfileHeader** (1 hour)
   - Display websites in about section
   - "Show more" button after 3 websites
   - Show email if `email_public = true`
   - Move GitHub link to about section
   - Relocate edit profile button

4. **Update TopBar/Account Dropdown** (30 min)
   - Add "Edit Profile" menu item
   - Order: Edit Profile, Settings, Log Out

#### UI Mockup
```
About Section:
┌─────────────────────────────┐
│ Bio text here...            │
│                             │
│ 📧 email@example.com        │ (if public)
│ 🌐 website1.com             │
│ 🌐 website2.com             │
│ 🌐 website3.com             │
│ [Show 2 more websites]      │ (if >3)
│ 🔗 GitHub: @username        │
└─────────────────────────────┘
```

#### Acceptance Criteria
- [ ] Users can add up to 5 websites
- [ ] Websites validated as proper URLs
- [ ] About section shows first 3 websites
- [ ] "Show more" button reveals remaining websites
- [ ] Email checkbox controls visibility in about section
- [ ] GitHub link moved to about section (auto-populated)
- [ ] Edit profile button in account dropdown

---

### **Task A.3: Mobile/Desktop UX Standards** (8 hours)

**Objective**: Implement responsive design standards with proper mobile/desktop layouts

#### Current Issues
- Mobile bottom bar (MobileTabBar) shows on desktop
- No desktop left sidebar for navigation
- Inconsistent breakpoints

#### Implementation Steps
1. **Create responsive navigation system** (3 hours)
   - Desktop: Left sidebar navigation (≥768px)
   - Mobile: Bottom tab bar (<768px)
   - Tailwind breakpoints: `md:hidden` and `hidden md:block`
   
2. **Create DesktopSidebar component** (2 hours)
   - `components/nav/DesktopSidebar.tsx`
   - Shows: Home, Explore, Profile, DMs (future), Settings
   - Fixed left position
   - Collapsible on smaller desktops

3. **Update AppChrome** (2 hours)
   - Conditionally render MobileTabBar vs DesktopSidebar
   - Consistent padding for content area
   - Test on multiple screen sizes

4. **Create responsive utilities** (1 hour)
   - `hooks/useMediaQuery.ts` for JS-based responsive logic
   - Document breakpoint standards in `Cline_Info/UX_STANDARDS.md`

#### Responsive Breakpoints
```typescript
const BREAKPOINTS = {
  mobile: 0,      // 0-767px
  tablet: 768,    // 768-1023px  
  desktop: 1024,  // 1024px+
  wide: 1440,     // 1440px+
} as const;
```

#### Acceptance Criteria
- [ ] MobileTabBar hidden on desktop (≥768px)
- [ ] DesktopSidebar shows on desktop, hidden on mobile
- [ ] All pages tested on mobile, tablet, desktop
- [ ] No horizontal scroll on any screen size
- [ ] Touch targets ≥44px on mobile
- [ ] Documentation created for UX standards

---

### **Task A.4: Admin Promo Post System** (4 hours)

**Objective**: Allow super admins to create featured posts on /promo page

#### Database Schema
```sql
CREATE TABLE IF NOT EXISTS promo_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL CHECK (length(title) <= 100),
  image_url TEXT NOT NULL,
  content TEXT NOT NULL CHECK (length(content) <= 5000),
  author_id UUID NOT NULL REFERENCES admins(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_promo_posts_created ON promo_posts(created_at DESC);

-- RLS: Only admins can manage
ALTER TABLE promo_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY promo_posts_view_policy ON promo_posts
  FOR SELECT USING (true); -- Public read

CREATE POLICY promo_posts_manage_policy ON promo_posts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.role = 'super_admin'
      AND admins.revoked_at IS NULL
    )
  );
```

#### Implementation Steps
1. **Create promo actions** (1 hour)
   - `features/promo/actions.ts`
   - `createPromoPost(title, image_url, content)` - Super admin only
   - `listPromoPosts(limit = 2)`
   - Image upload to Supabase Storage

2. **Create admin promo page** (1.5 hours)
   - `app/admin/promo/page.tsx`
   - Form: Title, Image upload, Rich text content
   - Preview before publish
   - List of existing promo posts
   - Delete old posts

3. **Update public promo page** (1.5 hours)
   - `app/promo/page.tsx`
   - Display last 2 promo posts
   - Beautiful card layout
   - Image optimization
   - Responsive design

#### Acceptance Criteria
- [ ] Super admins can create promo posts
- [ ] /promo page shows last 2 posts only
- [ ] Images uploaded to Supabase Storage
- [ ] Title limited to 100 chars, content to 5000 chars
- [ ] Responsive on all devices
- [ ] Audit logged

---

### **Task A.5: System Config Page** (7 hours)

**Objective**: Create admin interface for managing global platform settings

#### Features to Configure
```typescript
interface SystemConfig {
  character_limits: {
    post_caption: number;
    comment_body: number;
    bio: number;
    display_name: number;
  };
  moderation: {
    auto_flag_dislikes: number;      // Auto-flag at X dislikes
    auto_hide_reports: number;        // Auto-hide at X reports
    spam_threshold: number;           // Spam detection sensitivity
  };
  features: {
    likes_enabled: boolean;
    dislikes_enabled: boolean;
    dm_enabled: boolean;
    projects_enabled: boolean;
  };
  rate_limits: {
    posts_per_hour: number;
    comments_per_hour: number;
    follows_per_hour: number;
  };
}
```

#### Implementation Steps
1. **Create config schema & actions** (2 hours)
   - `features/config/contract.ts` - Zod schemas
   - `features/config/actions.ts` - CRUD operations
   - Type-safe getters for each config section

2. **Create config UI** (3 hours)
   - `app/admin/config/page.tsx`
   - Tabbed interface (Limits, Moderation, Features, Rate Limits)
   - Form for each section
   - Preview changes
   - Reset to defaults button

3. **Apply config across app** (2 hours)
   - Update `lib/config.ts` to read from database
   - Update contracts to use dynamic limits
   - Cache config values (5 min TTL)

#### Acceptance Criteria
- [ ] Super admins can access /admin/config
- [ ] All settings editable via UI
- [ ] Changes take effect immediately (with cache invalidation)
- [ ] Defaults can be restored
- [ ] All changes audit logged
- [ ] Config values cached for performance

---

## Phase B: Profile Refactor (12 hours)

### Overview
Transform profile page into card-based layout, preparing navigation structure for Projects feature.

---

### **Task B.1: Card-Based Profile Layout** (6 hours)

**Objective**: Redesign profile page with card-based UI

#### New Profile Structure
```
┌─────────────────────────────────────────┐
│  Profile Card (Compact)                 │
│  ┌──────┐                               │
│  │Avatar│ @username                     │
│  │      │ Display Name                  │
│  └──────┘ 123 followers • 45 following  │
│           [Follow Button]               │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  About Card                             │
│  Bio, websites, email, GitHub           │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  [Posts] [Projects - Coming Soon]      │
│                                         │
│  Post feed here...                      │
└─────────────────────────────────────────┘
```

#### Implementation Steps
1. **Create ProfileCard component** (2 hours)
   - `components/profile/ProfileCard.tsx`
   - Compact avatar + name + stats
