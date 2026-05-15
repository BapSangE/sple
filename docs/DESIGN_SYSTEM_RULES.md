# Sple Design System Rules

_Updated: 2026-05-15_
_Product basis: live demo at `https://www.sple-insta.com`_

## 1. Product UI Principle

Sple should feel like a compact mobile app even when running in the browser. The first visual impression is a map-first personal place collection, not a marketing site and not a plain form utility.

Keep the four primary surfaces consistent:

- Map: explore saved or nearby places.
- Add: paste an Instagram link or place text and run AI extraction.
- List: search and filter the user's saved places.
- Profile: Google sign-in and account controls.

## 2. Frameworks

- Frontend: Next.js App Router, React, TypeScript
- Styling: Tailwind CSS v4 with tokens in `frontend/src/app/globals.css`
- Icons: `lucide-react`
- Font: local Pretendard via `next/font/local`
- Backend: FastAPI, SQLAlchemy async

## 3. Design Tokens

Tokens live in `frontend/src/app/globals.css` inside the Tailwind `@theme` block.

Use these tokens instead of hardcoded color values when implementing UI:

- Primary orange: `--color-primary` (`#FF8746`)
- Secondary orange: `--color-secondary` (`#FF6B1B`)
- Success green: `--color-success` (`#006C50`)
- Navigation background: `--color-nav-bg` (`#2B2B2B`)
- App background: `--color-background` (`#F6F3F2`)
- Surface: `--color-surface` (`#FFFFFF`)
- Sheet: `--color-sheet` (`rgba(255, 255, 255, 0.9)`)
- Text primary: `--color-text-primary` (`#1B1B1C`)
- Text secondary: `--color-text-secondary` (`#A1A1AA`)
- Safe margin: `--spacing-safe-margin` (`24px`)

Use Tailwind classes generated from tokens, such as `bg-background`, `text-primary`, `text-text-primary`, and `text-text-secondary`.

## 4. Layout Rules

- Keep `TopAppBar` fixed at the top with centered Sple logo.
- Keep `BottomNavBar` fixed near the bottom as a pill-shaped app nav.
- Respect `env(safe-area-inset-bottom)` for fixed bottom UI.
- Preserve the app-like `body` behavior: full viewport, hidden native page overflow, internal scrolling only where needed.
- Do not introduce landing-page hero sections unless the product direction changes explicitly.

## 5. Component Organization

- Routes live in `frontend/src/app/`.
- Shared components live in `frontend/src/components/`.
- Layout shell components live in `frontend/src/components/layout/`.
- API URL helpers live in `frontend/src/lib/`.
- Interactive React components must start with `"use client";`.
- Prefer reusing `TopAppBar`, `BottomNavBar`, `Map`, `AdBanner`, and existing page patterns before adding new primitives.

## 6. Interaction Rules

- Primary actions use the orange brand color and a clear pressed state such as `active:scale-[0.98]`.
- Icon-only tab buttons must have accessible labels.
- The add flow should communicate three states clearly: input, loading, result or failure.
- Failure messages should distinguish between “server connection failed” and “AI could not find a place.”
- Saved place cards should lead naturally to external map confirmation when a place is selected.

## 7. Figma Implementation Rules

The Figma plugin endpoint for generating rules returned `Method not found` during the 2026-05-15 cleanup, so these rules are maintained locally until the tool is available again.

When implementing from Figma:

1. Fetch the exact node context and screenshot when Figma MCP tools are available.
2. Treat Figma output as design intent, not final code structure.
3. Translate colors to Sple tokens from `globals.css`.
4. Use `lucide-react` icons before adding custom assets.
5. Store exported static assets in `frontend/public/`.
6. Recreate layouts with responsive flex/grid rather than absolute-positioned exports.
7. Validate against the live app shell: top logo bar, bottom nav, mobile-safe spacing, and app-like viewport behavior.

## 8. Accessibility

- Buttons that show only icons must use `aria-label`.
- Text contrast must remain readable on `bg-background` and white surfaces.
- Inputs must have placeholders or labels that explain the expected content.
- Login-gated states must explain what the user gets after signing in.
