# Production Readiness Progress

_Updated: 2026-05-15_

## Decisions Confirmed

- Frontend is deployed on Vercel.
- Backend is deployed through AWS EC2/ECS using GitHub Actions.
- Database is Supabase PostgreSQL.
- Frontend and backend URL/API settings are already configured in production.
- Direct Instagram URL scraping is intentionally excluded from the product scope.
- AI extraction is text-only: users paste copied captions, restaurant descriptions, or other text that mentions places.

## Completed In This Pass

- Changed AI analysis contract to text-only input.
- Updated `/add` copy to remove direct Instagram URL analysis wording.
- Added backend rejection for URL-only analysis input.
- Added Next.js API proxy routes:
  - `POST /api/analyze`
  - `GET /api/places`
  - `POST /api/places`
- Moved client calls to same-origin API routes instead of direct browser-to-backend calls.
- Added backend optional internal API key protection with `BACKEND_API_KEY`.
- Changed place save/list flow so Vercel derives `user_id` from the NextAuth session.
- Added backend health endpoints:
  - `GET /health`
  - `GET /health/db`
- Added backend contract tests for health and text-only URL rejection.
- Updated GitHub Actions to run backend contract tests before Docker image build and deploy.
- Updated deployment documentation for Vercel, Supabase PostgreSQL, AWS backend, and GitHub Actions.

## Verification

- Frontend lint: passed with `npm.cmd run lint`
- Frontend type check: passed with `npx.cmd tsc --noEmit`
- Frontend production build: passed with `npm.cmd run build`
- Local HTTP check: `http://127.0.0.1:3001/add` returned `200` while the dev server was running
- Playwright live baseline: `https://www.sple-insta.com/add` still shows the old deployed copy mentioning Instagram post links; this should change after the next Vercel deployment
- Playwright local check: attempted against `http://127.0.0.1:3001/add`, but the Codex in-app browser blocked localhost navigation with `ERR_BLOCKED_BY_CLIENT`
- Backend pytest: not runnable in the current local Windows environment because uv cannot start the configured `.venv` Python executable.

## Remaining Work

1. Confirm the next GitHub Actions deploy passes and ECS receives `BACKEND_API_KEY`.
2. Confirm Vercel production deployment uses `BACKEND_API_URL` and `BACKEND_API_KEY`.
3. Confirm GitHub Actions secrets:
   - `DATABASE_URL`
   - `GCP_SA_KEY_JSON`
   - `FRONTEND_URL`
   - `BACKEND_API_KEY`
   - optional `BACKEND_HEALTH_URL`
4. Add real migration management before evolving the Supabase schema further.
5. Decide how the map should display saved places without reliable geocoding from text-only extraction.
6. Add production error monitoring for Gemini failures and backend 5xx responses.
