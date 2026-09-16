# Sple Production Deployment Guide

_Updated: 2026-05-15_

## 1. Production Architecture

- Frontend: Vercel
- Backend: AWS EC2/ECS-deployed FastAPI container
- Database: Supabase PostgreSQL
- CI/CD: GitHub Actions deploys the backend when changes are pushed to `main`
- Domain:
  - App: `https://sple-insta.com`, `https://www.sple-insta.com`
  - API: usually `https://api.sple-insta.com`

## 2. Current Product Scope

Sple supports text-only place extraction.

Users should paste Instagram captions, blog snippets, restaurant descriptions, or other copied text that contains place information. Direct Instagram URL scraping is intentionally excluded because Instagram frequently blocks automated access.

When Meta grants Instagram messaging access, users can also share a post to the Sple Instagram account. Sple replies with a seven-day, one-time save link. The user signs in with Google and confirms the extracted places before saving them. Shared-post webhooks can contain only a URL, so users may still need to enter a place name when the message has no usable title.

## 3. Vercel Environment Variables

Required:

```env
NEXTAUTH_URL=https://sple-insta.com
NEXTAUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
BACKEND_API_URL=https://api.sple-insta.com
BACKEND_API_KEY=...
NEXT_PUBLIC_NAVER_CLIENT_ID=...
NEXT_PUBLIC_ADSENSE_CLIENT_ID=...
NEXT_PUBLIC_ADSENSE_SLOT=...
```

`NEXT_PUBLIC_ADSENSE_SLOT` is a build-time public variable. Configure a real slot ID and redeploy; if it is unset, the ad banner is not rendered.

Notes:

- `BACKEND_API_URL` is server-side and used by Next.js API routes.
- `NEXT_PUBLIC_API_URL` may remain for compatibility, but client code now calls same-origin Next.js API routes.
- `BACKEND_API_KEY` must match the backend `BACKEND_API_KEY` when backend internal key protection is enabled.

## 4. Backend Environment Variables

Required:

```env
DATABASE_URL=postgresql://...
NVIDIA_API_KEY=...
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=...
META_APP_SECRET=...
IG_PAGE_ACCESS_TOKEN=...
INSTAGRAM_BUSINESS_ACCOUNT_ID=...
FRONTEND_URL=https://sple-insta.com
ALLOWED_ORIGINS=https://sple-insta.com,https://www.sple-insta.com
BACKEND_API_KEY=...
```

`DATABASE_URL` may use the standard Supabase Postgres URI. The app converts `postgresql://` to `postgresql+asyncpg://` automatically for SQLAlchemy async.

The Instagram webhook callback is `https://api.sple-insta.com/webhooks/instagram`. Keep the verification token and Meta app secret backend-only. Configure the callback only after the endpoint is deployed and its GET verification succeeds.

`IG_PAGE_ACCESS_TOKEN` and `INSTAGRAM_BUSINESS_ACCOUNT_ID` are also backend-only. The former must be an access token for `sple_place` with `instagram_business_manage_messages`; the latter is the Instagram business account ID. Store both as GitHub Actions secrets so the ECS deployment receives them.

## 5. API Routing

Browser clients call Vercel routes:

- `POST /api/analyze`
- `GET /api/places`
- `POST /api/places`

Vercel server routes call the EC2/ECS backend:

- `POST {BACKEND_API_URL}/api/analyze`
- `GET {BACKEND_API_URL}/api/places`
- `POST {BACKEND_API_URL}/api/places`

This keeps backend internal credentials off the browser and prevents clients from choosing arbitrary `user_id` values.

## 6. GitHub Actions Backend Deploy

`.github/workflows/deploy.yml` performs:

1. Checkout
2. Python and uv setup
3. Backend contract tests
4. Docker image build
5. Push to ECR
6. ECS task definition update
7. ECS service deploy
8. Optional backend health smoke test

Add this secret to enable the final smoke test:

```env
BACKEND_HEALTH_URL=https://api.sple-insta.com
```

## 7. Health Checks

Backend endpoints:

- `GET /health`: service process health
- `GET /health/db`: database connectivity health

Use these in load balancers, CloudWatch alarms, and post-deploy smoke tests.

## 8. External Console Checklist

Naver Cloud Platform:

- Register `https://sple-insta.com`
- Register `https://www.sple-insta.com`
- Register local development origin if needed

Google OAuth:

- Authorized JavaScript origins:
  - `https://sple-insta.com`
  - `https://www.sple-insta.com`
- Authorized redirect URI:
  - `https://sple-insta.com/api/auth/callback/google`

Supabase:

- Confirm database password and pooler URI
- Restrict network access where possible
- Monitor active connections and slow queries

AWS:

- Confirm ECS service is using the latest task definition revision
- Confirm CloudWatch logs are retained
- Confirm health endpoint is reachable after deploy
