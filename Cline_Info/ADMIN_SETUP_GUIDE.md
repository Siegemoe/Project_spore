# Admin Dashboard Setup Guide

This guide will help you configure and access the admin dashboard both locally and on production.

---

## 🔑 Prerequisites

1. **Migrations Applied**:
   - `db/migrations/phase1/0006_admin_tables.sql` (Admin foundation)
   - `db/migrations/phase1/0007_moderation.sql` (Moderation system)

2. **Super Admin Created** in Supabase:
   ```sql
   -- Find your user ID
   SELECT id, email, handle FROM users WHERE email = 'your-email@example.com';
   
   -- Create super admin
   INSERT INTO admins (user_id, role, notes)
   VALUES (
     'your-user-id-here'::UUID,
     'super_admin',
     'Initial super admin'
   );
   ```

---

## 🏠 Local Development Setup

### Step 1: Configure Environment Variables

Create/update `.env.local` with:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://aehiqptugvakjtlvuixb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE=your-service-role-key

# App URL (for OAuth redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Feature Flags
NEXT_PUBLIC_NEW_MOBILE_UI=true
```

**Where to find keys**:
- Go to Supabase Dashboard → Project Settings → API
- Copy **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Copy **service_role** key → `SUPABASE_SERVICE_ROLE` (⚠️ Keep secret!)

### Step 2: Configure GitHub OAuth for Localhost

**Option A: Add Localhost to Existing OAuth App**
1. Go to GitHub → Settings → Developer Settings → OAuth Apps
2. Edit your existing Spore OAuth app
3. Update **Authorization callback URL** to include BOTH:
   ```
   https://project-spore.vercel.app/auth/callback
   http://localhost:3000/auth/callback
   ```

**Option B: Create Separate Local Dev OAuth App** (Recommended)
1. Create a new GitHub OAuth App
2. Set **Homepage URL**: `http://localhost:3000`
3. Set **Authorization callback URL**: `http://localhost:3000/auth/callback`
4. Copy Client ID and Client Secret
5. Add to `.env.local`:
   ```bash
   GITHUB_CLIENT_ID=your-local-client-id
   GITHUB_CLIENT_SECRET=your-local-client-secret
   ```

### Step 3: Restart Dev Server

```bash
# Kill existing server (Ctrl+C)
npm run dev
```

### Step 4: Test Access

1. Navigate to `http://localhost:3000`
2. Sign in with GitHub (using account that has admin record)
3. Navigate to `http://localhost:3000/admin`
4. ✅ Should see admin dashboard!

---

## 🌐 Production (Vercel) Setup

### Step 1: Add Environment Variables to Vercel

1. Go to Vercel Project Settings → Environment Variables
2. Add:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://aehiqptugvakjtlvuixb.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE=your-service-role-key
   NEXT_PUBLIC_APP_URL=https://project-spore.vercel.app
   ```

### Step 2: Verify GitHub OAuth

Your production OAuth app should have:
- **Homepage URL**: `https://project-spore.vercel.app`
- **Callback URL**: `https://project-spore.vercel.app/auth/callback`

### Step 3: Deploy

```bash
git push origin main
```

Vercel will auto-deploy. Once deployed:
1. Visit `https://project-spore.vercel.app`
2. Sign in with GitHub
3. Navigate to `/admin`
4. ✅ Should work!

---

## 🐛 Troubleshooting

### "Forbidden - Admin access required"

**Cause**: You're not signed in as a user with an admin record.

**Fix**:
1. Check which user you're signed in as
2. Verify that user has an admin record:
   ```sql
   SELECT a.*, u.email, u.handle
   FROM admins a
   JOIN users u ON a.user_id = u.id
   WHERE a.revoked_at IS NULL;
   ```
3. If your user isn't listed, create the admin record (see Prerequisites)

---

### "Still redirects to production after signin"

**Cause**: GitHub OAuth app not configured for localhost.

**Fix**: Follow Step 2 in Local Development Setup (add localhost callback URL)

---

### "Supabase admin env missing" error

**Cause**: Missing `SUPABASE_SERVICE_ROLE` environment variable.

**Fix**:
1. Add `SUPABASE_SERVICE_ROLE` to `.env.local`
2. Restart dev server
3. For Vercel: Add to project environment variables

---

### Admin pages won't load / infinite redirect

**Cause**: `getCurrentAdmin()` can't read your session.

**Fix**:
1. Sign out completely
2. Clear browser cookies for localhost
3. Sign back in
4. Try `/admin` again

---

## 📊 Admin Dashboard Features

Once you're in, you'll have access to:

### `/admin` - Dashboard Home
- Platform statistics (users, posts, comments, engagement)
- Quick actions panel
- System status indicators

### `/admin/moderation` - Content Moderation
- Review reported content
- Remove content, warn/suspend/ban users
- Bulk operations (dismiss/escalate)
- Moderation statistics

### `/admin/users` - User Management
- Search users by handle, email, name
- Filter by status (active/suspended/banned)
- View user details and activity
- Suspend, ban, reset password, delete accounts

### `/admin/security` - Security Alerts
- ⏸️ Coming soon (Phase 1C.3)

### `/admin/health` - Platform Health
- ⏸️ Coming soon (Phase 1C.4)

### `/admin/analytics` - Analytics
- ⏸️ Coming soon (Tier 2)

### `/admin/config` - System Config (Super Admin Only)
- ⏸️ Coming soon (Tier 2)

---

## 🔒 Security Notes

- **Service Role Key**: Has full database access - NEVER expose to client
- **Admin Access**: Protected at layout level (server-side check)
- **Audit Logging**: All admin actions automatically logged
- **Role Hierarchy**: super_admin > moderator > analyst > support

---

## ✅ Verification Checklist

After setup, verify:
- [ ] Environment variables loaded (check server startup logs)
- [ ] GitHub OAuth redirects to correct URL (local or production)
- [ ] Can sign in successfully
- [ ] Admin record exists in database for your user
- [ ] Can access `/admin` without 403 error
- [ ] See admin navigation sidebar
- [ ] Can access role-appropriate admin features

---

## 📞 Still Having Issues?

Check the console logs:
1. **Browser console** (F12) - For client-side auth errors
2. **Server terminal** - For server-side auth errors
3. **Supabase logs** - For database/RLS errors

The auth system has multiple layers, so check each one systematically!
