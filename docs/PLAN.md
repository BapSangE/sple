# Reliability and access-control work

Baseline: [[CURRENT_PRODUCT_UNDERSTANDING]]. Keep the four-tab text-copy product.

1. Scope coordinate recovery to the server-authenticated user; fail closed on missing internal credentials.
2. Validate AI output, use asynchronous calls with bounded time/concurrency/rate, and distinguish empty results from failures.
3. Persist a request ID for each save; keep failed candidates and drafts through Google login.
4. Compare Naver addresses as well as names and invalidate stale metadata when editing a place.
5. Add isolated regression tests, run backend/frontend checks, and prepare a reviewable branch.

Production deployment requires applying the additive save-request migration before backend rollout. See [[CHANGELOG]].
