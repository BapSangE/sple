# Sple Agent Rules

## Current Product Source of Truth

Use `docs/CURRENT_PRODUCT_UNDERSTANDING.md` as the current product baseline. Older documents may describe historical directions and should not override the live-demo product direction unless the user explicitly says so.

Current product summary:

> Sple is an AI-assisted personal hot-place map and collection app. Users paste or share Instagram links or place text, AI extracts place candidates, and signed-in users save them into a map/list collection.

## Figma Design System Rules

Follow `docs/FIGMA_DESIGN_GUIDE.md` and `docs/DESIGN_SYSTEM_RULES.md` for all Figma-driven UI work.

### Required Figma Flow

1. Fetch the exact Figma node context and screenshot when Figma MCP tools are available.
2. Treat generated Figma code as design intent, not final project structure.
3. Reuse Sple shell components before creating new ones.
4. Map Figma colors to tokens in `frontend/src/app/globals.css`.
5. Validate the result against the app shell: top logo bar, bottom nav, mobile-safe spacing, and app-like viewport behavior.

### Component and Styling Conventions

- Routes live in `frontend/src/app/`.
- Shared components live in `frontend/src/components/`.
- Layout components live in `frontend/src/components/layout/`.
- Client-side API helpers live in `frontend/src/lib/`.
- Use Tailwind CSS v4 utility classes and tokens from `globals.css`.
- Use `lucide-react` for icons.
- Do not add new icon libraries for Figma work.
- Store static assets in `frontend/public/`.

### Product UX Rules

- Preserve the four-tab structure: `지도`, `등록`, `리스트`, `프로필`.
- Keep the app mobile-first and PWA-like.
- Do not replace the app with a marketing landing page unless the user explicitly requests a product direction change.
- Distinguish server failures from AI extraction failures in user-facing messages.
