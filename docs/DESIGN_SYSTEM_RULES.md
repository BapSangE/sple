# Sple Design System & Figma MCP Integration Rules

This document outlines the design system conventions, component architecture, and styling rules for the **Sple** project. It serves as a master guide for AI coding agents to consistently implement Figma designs.

## 1. Frameworks & Libraries
- **Framework:** Next.js 15 (App Router) + React (TypeScript)
- **Styling:** Tailwind CSS v4
- **Icons:** `lucide-react` (Primary), Google Material Symbols (Secondary fallback)
- **Map:** Kakao Maps SDK / Naver Map SDK

## 2. Design System Structure & Tokens
Design tokens are centrally defined in `frontend/src/app/globals.css` using Tailwind v4's `@theme` directive.

**IMPORTANT: Never hardcode these values.** Always use the Tailwind utility classes derived from these variables.

### Color Tokens
- **Primary (Main Orange):** `--color-primary` (`#FF8746`) -> `text-primary`, `bg-primary`
- **Secondary (Dark Orange):** `--color-secondary` (`#FF6B1B`) -> `text-secondary`, `bg-secondary`
- **Success:** `--color-success` (`#006C50`)
- **Nav Background:** `--color-nav-bg` (`#2B2B2B`) -> `bg-[var(--color-nav-bg)]`
- **Background:** `--color-background` (`#F6F3F2`) -> `bg-background`
- **Surface (White):** `--color-surface` (`#FFFFFF`) -> `bg-surface`
- **Text Primary:** `--color-text-primary` (`#1B1B1C`) -> `text-text-primary`
- **Text Secondary:** `--color-text-secondary` (`#A1A1AA`) -> `text-text-secondary`

### Typography
- **Font Family:** Pretendard (`--font-pretendard`) -> `font-sans`
- Follow standard Tailwind text size scales (`text-sm`, `text-base`, `text-lg`, etc.).

### Spacing & Layout
- Sple has an "App-like feel". The body avoids native scrolling (`overflow: hidden`).
- Safe Margin: `--spacing-safe-margin` (`24px`).
- Always respect `env(safe-area-inset-bottom)` for fixed bottom components like the Navigation Bar.

## 3. Component Organization
- **Pages (Routes):** Placed in `frontend/src/app/` (e.g., `app/page.tsx`, `app/add/page.tsx`).
- **Global Components:** Placed in `frontend/src/components/` (e.g., `Map.tsx`).
- **Layout Components:** Placed in `frontend/src/components/layout/` (e.g., `TopAppBar.tsx`, `BottomNavBar.tsx`).
- All interactive components MUST include `"use client";` at the very top.

## 4. Asset Management & Icons
- **Static Assets:** Logos, placeholder images, and manifest files are stored in `frontend/public/` (e.g., `/sple_logo.svg`).
- **Images:** Always use Next.js `<Image />` component (`next/image`) for optimized delivery.
- **Icons:** Use the `lucide-react` library. Example: `import { Map, PlusCircle } from "lucide-react"`. Do not install new icon libraries. If an icon is completely custom, export it as an SVG from Figma and place it in `public/icons/`.

## 5. Figma MCP Integration Workflow

When a user requests implementing a screen or component from Figma, follow these rules strictly:

1. **Context Gathering:** 
   - Run `get_design_context` using the provided Figma URL or `nodeId`.
   - Run `get_screenshot` for visual reference of the exact node variant.
2. **Analysis & Conversion:**
   - Map Figma colors to the exact Tailwind tokens defined in `globals.css`. Do not extract hardcoded hex codes if a matching token exists.
   - For icons, try to map Figma vectors to the closest `lucide-react` icon.
   - For UI layout, replace absolute positioning (often output by Figma) with responsive Flexbox/Grid layouts (`flex`, `grid`, `items-center`, `justify-between`).
3. **Implementation:**
   - Translate the raw React output from MCP into the Sple Next.js App Router structure.
   - Reuse existing components (e.g., `TopAppBar`, `BottomNavBar`) instead of building them from scratch.
4. **Validation:**
   - Compare your generated UI layout to the screenshot context.
   - Ensure interactive states (like hover and active styles, e.g., `active:scale-95`, `transition-transform`) are added to buttons for a native app feel.

## 6. Styling Approach
- Use **Tailwind utility classes**. Avoid custom CSS unless absolutely necessary (like hiding scrollbars, which is done via `@utility hide-scrollbar`).
- For "Glassmorphism" effects (like floating bars or modals), use `bg-white/90 backdrop-blur-md` combinations.
- For shadows, use Tailwind's default shadow utilities (`shadow-sm`, `shadow-md`, `shadow-lg`) or exact box-shadow values if specified distinctively in Figma (e.g., `shadow-[0px_6px_15px_0px_rgba(0,0,0,0.1)]`).
