# Reliability and access-control work

Baseline: [[CURRENT_PRODUCT_UNDERSTANDING]]. Keep the four-tab text-copy product.

1. Scope coordinate recovery to the server-authenticated user; fail closed on missing internal credentials.
2. Validate AI output, use asynchronous calls with bounded time/concurrency/rate, and distinguish empty results from failures.
3. Persist a request ID for each save; keep failed candidates and drafts through Google login.
4. Compare Naver addresses as well as names and invalidate stale metadata when editing a place.
5. Add isolated regression tests, run backend/frontend checks, and prepare a reviewable branch.

Production deployment requires applying the additive save-request migration before backend rollout. See [[CHANGELOG]].

## 2026-09-15 NVIDIA Nemotron 전환

- AsyncOpenAI NVIDIA 클라이언트로 교체, 결과 배열 검증과 25초 제한 유지.
- 의존성 잠금, 배포 secret, README 갱신.
- 격리 DB 회귀 테스트와 MockTransport SDK 요청/오류 검증. 실 API 검증은 키 등록 후 진행.
- 변경 내역: [[CHANGELOG]].
- 검증 완료: Python 3.12 백엔드 47개 테스트 통과. 외부 AI/운영 DB 호출 없이 검증.
