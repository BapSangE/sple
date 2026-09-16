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

## 2026-09-16 건물명 주소 좌표 복구와 광고 요청 정리

- 증거: 운영 버터앤쉘터의 주소는 용산 아이파크몰이며 좌표/네이버 메타데이터가 없음.
- 주소 지오코딩 실패 시 기존 네이버 Local Search로 장소명과 위치를 확인. 불확실한 지점은 자동 좌표 확정 금지.
- 신규 저장, 주소 수정, 사용자 범위 좌표 복구에서 같은 fallback 사용.
- 임시 AdSense 슬롯 요청을 제거하고 실제 슬롯 설정 시에만 광고를 요청.
- 검증: 후보 일치/모호성/잘못된 좌표/사용자 격리 회귀 테스트, frontend lint와 타입 확인.
- 로컬에는 NAVER_SEARCH_CLIENT_ID/SECRET가 없어 실 검색 검증은 미수행. 운영 키 설정은 별도 확인 필요.
- 관련 기록: [[CHANGELOG]].
- 검증 완료: 백엔드 전체 58개 통과, 광고 변경 파일 ESLint 및 frontend TypeScript 검사 통과.
