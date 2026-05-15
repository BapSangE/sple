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

## Post-Deploy Verification on 2026-05-15

- Backend health: `https://api.sple-insta.com/health` returned `200` with `{"status":"ok","service":"sple-backend"}`.
- Direct backend analysis call without internal key returned `401`, confirming `BACKEND_API_KEY` protection is active.
- Vercel proxy analysis call returned `200`.
- Node fetch with UTF-8 Korean text returned a valid extracted place:
  - name: `어니언 성수`
  - address: `서울특별시 성동구 아차산로9길 8`
- Playwright live UI check confirmed `/add` now says:
  - `인스타그램 캡션이나 맛집 소개 글을 복사해서 붙여넣어주세요!`
- Playwright live extraction flow with sample text reached the result screen and displayed:
  - `어니언 성수`
  - `서울특별시 성동구 아차산로9길 8`

## Save/List Issue Follow-Up

Reported symptom: after clicking save, the list tab shows no saved places.

Investigation from code:

- The add page did not check `response.ok` for `POST /api/places`.
- A failed save could still show “saved” and navigate to `/saved`.
- The saved page did not expose API load errors, so a failed `GET /api/places` could look like an empty list.
- `src/alter_db.py` shows an older migration path that added `places.user_id` as `INTEGER`; production now stores NextAuth Google subject ids, which are strings. If Supabase still has `user_id integer`, inserts will fail.

Changes made:

- Save now checks every `POST /api/places` response and alerts the real failure.
- Saved page now shows a load error instead of silently falling back to an empty list.
- Added Supabase migration SQL: `migrations/2026-05-15_places_user_id_text.sql`.
- Added a follow-up Supabase compatibility migration: `migrations/2026-05-15_places_insert_compatibility.sql`.
- Updated the Vercel places API route to distinguish backend non-JSON/500 responses from true network connection failures.

Next required production check:

- Run `migrations/2026-05-15_places_user_id_text.sql` in Supabase SQL editor if `places.user_id` is not already `text`.
- If saving still says the place save server cannot be reached, run `migrations/2026-05-15_places_insert_compatibility.sql` in Supabase SQL editor. This verifies insert defaults such as `places.id` auto-increment and relaxes stale optional legacy columns.

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

## Production Incident: Backend 503

Time: 2026-05-15 KST

Symptom:

- `/add` showed `서버 연결에 실패했습니다.` during AI analysis.
- Direct `https://api.sple-insta.com/health` returned `503 Service Temporarily Unavailable`.
- Vercel `/api/analyze` returned `500` because the backend API was unavailable.

Root cause:

- ECS service had one running task and the task was healthy in target group `ecs-gateway-tg-a362ae7f53ada14ce`.
- The ALB HTTPS listener was forwarding to the other target group, `ecs-gateway-tg-a375a790685ee2045`, which had no registered targets.
- Because the listener pointed at an empty target group, the public backend domain returned 503.

Recovery:

- Updated the ALB HTTPS listener default action to forward to the healthy target group `ecs-gateway-tg-a362ae7f53ada14ce`.
- Verified `https://api.sple-insta.com/health` returned 200.
- Verified `https://sple-insta.com/api/analyze` returned 200 for the `43번지 혼술바` sample.
- Verified the live `/add` UI reached the result screen and displayed `43번지 혼술바`.

Prevention:

- GitHub Actions backend smoke test now always checks `https://api.sple-insta.com/health` and `/health/db` after ECS deployment, even when `BACKEND_HEALTH_URL` is not configured.
