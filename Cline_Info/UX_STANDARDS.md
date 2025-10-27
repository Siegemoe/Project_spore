# Project Spore - UX Standards & Guidelines

**Last Updated**: October 26, 2025

---

## Responsive Breakpoints

### Breakpoint Definitions
```typescript
const BREAKPOINTS = {
  mobile: 0,      // 0-767px
  tablet: 768,    // 768-1023px  
  desktop: 1024,  // 1024px+
  wide: 1440,     // 1440px+
}
```

### Usage in Components

**Tailwind Classes**:
```tsx
// Hide on mobile, show on desktop
<div className="hidden md:block">Desktop Only</div>

// Show on mobile, hide on desktop
<div className="md:hidden">Mobile Only</div>

// Responsive sizing
<div className="w-full md:w-1/2 lg:w-1/3">Responsive Width</div>
```

**React Hooks**:
```tsx
import { useIsMobile, useIsDesktop } from '@/hooks/useBreakpoint';

function MyComponent() {
  const isMobile = useIsMobile();
  
  return isMobile ? <MobileView /> : <DesktopView />;
}
```

---

## Navigation Standards

### Desktop (≥768px)
- **DesktopSidebar**: Fixed left, 240px width
- **Content**: Offset by 240px (`md:pl-60`)
- **Navigation Items**: Home, Explore, Notifications, Profile, Settings
- **User Avatar**: Bottom of sidebar

### Mobile (<768px)
- **MobileTabBar**: Fixed bottom, full width
- **Content**: No offset, padding bottom for tab bar
- **Icons Only**: 5 items max to fit comfortably

---

## Touch Targets

### Minimum Sizes
- **Mobile**: 44x44px minimum (Apple HIG)
- **Desktop**: 32x32px acceptable
- **Buttons**: min-height 44px on mobile

### Spacing
- **Mobile**: 16px between interactive elements
- **Desktop**: 8px acceptable

---

## Typography Scale

### Headings
- **H1**: `text-3xl font-bold` (30px)
- **H2**: `text-2xl font-bold` (24px)
- **H3**: `text-xl font-semibold` (20px)
- **H4**: `text-lg font-semibold` (18px)

### Body Text
- **Primary**: `text-base` (16px)
- **Secondary**: `text-sm` (14px)
- **Small**: `text-xs` (12px)

### Line Heights
- **Headings**: `leading-tight` (1.25)
- **Body**: `leading-relaxed` (1.625)
- **Captions**: `leading-normal` (1.5)

---

## Color System

### Semantic Colors
```css
--bg-primary: Base background
--surface-primary: Card/surface color
--surface-muted: Subtle backgrounds
--surface-subtle: Very subtle backgrounds

--text-primary: Primary text
--text-secondary: Secondary text
--text-tertiary: Disabled/subtle text

--accent: Primary brand color
--border-subtle: Subtle borders
```

### Usage
```tsx
<div className="bg-[rgb(var(--bg-primary))] text-text-primary">
  Content
</div>
```

---

## Spacing System

### Consistent Spacing
- **xs**: 4px (1)
- **sm**: 8px (2)
- **md**: 16px (4)
- **lg**: 24px (6)
- **xl**: 32px (8)
- **2xl**: 48px (12)

### Component Spacing
- **Card padding**: `p-4 sm:p-6` (16px mobile, 24px desktop)
- **Section spacing**: `space-y-6` (24px vertical)
- **Stack spacing**: `space-y-4` (16px vertical)

---

## Component Patterns

### Cards
```tsx
<div className="card p-6">
  <h3 className="text-lg font-semibold mb-4">Title</h3>
  <p className="text-sm text-text-secondary">Content</p>
</div>
```

### Buttons
```tsx
// Primary action
<button className="btn btn-accent">Action</button>

// Secondary action
<button className="
