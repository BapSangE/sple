# Figma Design Guide for Sple

_Updated: 2026-05-15_

## Purpose

This guide defines how Sple should be represented in Figma and how Figma designs should translate back into code.

Sple's current product direction is an AI-assisted personal hot-place map. The design should support a fast mobile workflow:

1. Discover a place on Instagram.
2. Paste or share the link/text into Sple.
3. Let AI extract place candidates.
4. Save selected places.
5. Revisit them from map and list views.

## Core Screens

### Map

The map is the default product surface. It should feel immediately useful and spatial.

- Top: fixed white app bar with centered Sple logo.
- Body: full-bleed Naver map.
- Floating controls: map layers and current location controls on the right.
- Bottom: fixed dark pill navigation.

### Add

The add screen is a focused extraction workflow.

- Title: “장소 추출하기”
- Help text: explain that Instagram links or restaurant text can be pasted.
- Input: large textarea with calm white surface.
- Primary button: orange `AI 분석하기`.
- States: input, loading, result, failure.

### Saved

The saved screen is the personal collection.

- Title: “저장된 장소”
- Supporting text: “당신만의 취향이 담긴 컬렉션”
- Search field at the top.
- Category pills: `All`, `Cafe`, `Dining`, `Bar`.
- Empty/login-gated state centered in the viewport.
- Saved cards should be compact and scannable.

### Profile

The profile screen is intentionally sparse.

- Logged-out state: neutral avatar icon, concise sign-in copy, Google sign-in button.
- Logged-in state: profile image, name, email, account actions.

## Visual Identity

### Brand Feel

Sple should feel:

- compact
- mobile-native
- warm
- practical
- lightly premium

Avoid:

- marketing landing-page layouts
- large decorative hero sections
- heavy gradients
- overly playful illustration
- generic SaaS dashboard styling

### Color

Use the product tokens from `frontend/src/app/globals.css`.

- Primary: `#FF8746`
- Secondary: `#FF6B1B`
- Background: `#F6F3F2`
- Nav background: `#2B2B2B`
- Text primary: `#1B1B1C`
- Text secondary: `#A1A1AA`

Figma variables should mirror these names where possible:

- `color/primary`
- `color/secondary`
- `color/background`
- `color/surface`
- `color/nav-bg`
- `color/text-primary`
- `color/text-secondary`

### Typography

- Primary font: Pretendard
- Screen titles: bold, compact, usually 24px on mobile.
- Body/help text: 14px to 16px.
- Navigation labels are accessible names, not visible text in the current bottom nav.

### Shape and Elevation

- Bottom navigation: dark rounded pill, 62px tall in code.
- Form inputs: rounded 16px to 24px depending on surface size.
- Buttons: rounded 12px.
- Cards: prefer 16px radius or less.
- Use subtle shadows only where they clarify layering.

## Component Inventory

Create or maintain these Figma components:

- `AppShell/TopAppBar`
- `AppShell/BottomNavBar`
- `Navigation/NavIconButton`
- `Input/PlaceTextarea`
- `Button/Primary`
- `Button/Icon`
- `Card/SavedPlace`
- `Chip/Category`
- `State/Empty`
- `State/LoginRequired`
- `State/LoadingExtraction`
- `Ad/ResponsiveBanner`

## Figma-to-Code Mapping

- Figma frames for app screens map to `frontend/src/app/*/page.tsx`.
- Shared shell elements map to `frontend/src/components/layout/`.
- Shared feature elements map to `frontend/src/components/`.
- Tokens map to `frontend/src/app/globals.css`.
- Static assets map to `frontend/public/`.

Do not export an entire Figma screen as one giant component. Preserve the app shell and only implement the changed screen or component.

## Implementation Checklist

- Uses existing Sple app shell.
- Uses Sple color tokens instead of new hex values.
- Uses Pretendard typography.
- Works in a mobile-first viewport.
- Keeps the bottom nav visible and safe-area aware.
- Has clear empty, loading, success, and failure states where relevant.
- Does not introduce a marketing landing page unless explicitly requested.
