# Sple

Sple is a PWA service for collecting places discovered from Instagram captions or restaurant text. Users paste copied text that mentions places, Sple extracts place candidates with AI, and signed-in users can save those places into a personal collection that is browsable from a map and list.

## Current Product Direction

The current source of truth is [docs/CURRENT_PRODUCT_UNDERSTANDING.md](docs/CURRENT_PRODUCT_UNDERSTANDING.md), based on the live demo at `https://www.sple-insta.com`.

Sple is currently best understood as:

> An AI-assisted personal hot-place map and collection app.

Older documents may describe a lighter “extract place and open Naver Map” utility. That direction is historical context, not the current demo behavior.

## Main Surfaces

- `/`: map-first home screen with Sple branding and bottom navigation
- `/add`: AI place extraction from copied captions or place text
- `/saved`: signed-in user's saved place collection with search and category filters
- `/profile`: Google sign-in and account surface

## Stack

- Backend: FastAPI, SQLAlchemy async, SQLite by default, Postgres-compatible configuration
- AI: Google Gemini via `google-genai`
- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS v4
- Auth: NextAuth Google provider
- Mobile/PWA: Web app manifest with share target support

## Local Verification

Backend tests are intended to run with:

```bash
uv run pytest
```

Frontend checks are intended to run from `frontend/`:

```bash
npm run lint
npx tsc --noEmit
```

If `uv` cannot query the local `.venv` Python executable, repair the uv-managed Python runtime before trusting test status.
