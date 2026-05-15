# Changelog

## [Unreleased]

### Added
- 2026-05-15: 실서비스 진행 문서 추가 (`docs/PRODUCTION_READINESS_PROGRESS.md`)
- 2026-05-15: Vercel API 프록시 라우트 추가 (`frontend/src/app/api/analyze/route.ts`, `frontend/src/app/api/places/route.ts`)
- 2026-05-15: 백엔드 헬스체크 엔드포인트 추가 (`/health`, `/health/db`)
- 2026-05-15: 공개 데모(`https://www.sple-insta.com`) 기준 현재 제품 이해 문서 추가 (`docs/CURRENT_PRODUCT_UNDERSTANDING.md`)
- 2026-05-15: Figma 디자인 가이드 및 에이전트용 디자인 시스템 규칙 정리 (`docs/FIGMA_DESIGN_GUIDE.md`, `docs/DESIGN_SYSTEM_RULES.md`, `AGENTS.md`)
- 2026-05-15: 프론트가 기대하는 장소 저장/조회 API 계약 테스트 추가 (`tests/test_places_api.py`)
- 하네스 환경 구성 확인 (`docs/PLAN.md`, `src/`, `tests/`, `logs/`)
- Step 1: Stitch MCP 대신 기획 문서의 글로벌 테마(Primary, Secondary, Accent 색상) 하드코딩 적용
- Step 2: UI 뼈대 구축 완료
  - FastAPI 및 Jinja2 템플릿 환경 구성 (`src/main.py`)
  - 카카오 지도 API 연동 준비 (80% 영역 할당) (`src/templates/index.html`)
  - 스와이프 업 바텀 시트 (20% 영역 할당) 구현
  - 플로팅 액션 버튼(+) 및 가이드 민트 색상 툴팁 애니메이션 적용
- Step 3: 핵심 로직 연동 완료
  - `httpx` 및 `BeautifulSoup`을 이용한 인스타그램 메타데이터 수집 로직 구현
  - 최신 `google-genai` SDK 연동 및 Gemini 2.5 Flash 모델 적용을 통한 장소 정보 자동 추출 기능 구현
  - 추출 실패 시를 대비한 폴백(Fallback) 로직 적용
  - 최신 SDK 기반 AI 추출 기능 단위 테스트 완료 (`tests/test_ai_extraction.py`)
- Step 4: 자율 검증 및 통합 테스트 (Verify) 완료
  - `pytest`, `pytest-asyncio` 설치 및 E2E API 통합 테스트 스크립트 작성 (`tests/test_e2e_api.py`)
  - [가이드 툴팁 확인] 👉 [인스타그램 공유 연동] 👉 [AI 파싱] 👉 [바텀시트 노출]에 이르는 핵심 플로우 검증
  - 모든 통합 테스트 통과 및 정합성 확인

### Changed
- 2026-05-15: 장소 분석 기능을 인스타그램 URL 제외, 텍스트 붙여넣기 전용으로 정리
- 2026-05-15: 배포 가이드를 Vercel + Supabase PostgreSQL + AWS 백엔드 + GitHub Actions 기준으로 교체
- 2026-05-15: GitHub Actions 백엔드 배포 전에 API 계약 테스트를 실행하도록 변경
- 2026-05-15: `README.md`를 현재 데모 기준의 제품 설명과 로컬 검증 안내로 교체
- 2026-05-15: 프론트 API URL 조립을 `frontend/src/lib/api.ts`로 통합

### Fixed
- 2026-05-15: 장소 저장/조회에서 브라우저가 임의 `user_id`를 보내던 구조를 NextAuth 세션 기반 프록시 구조로 변경
- 2026-05-15: `/add`와 `/saved`가 호출하던 `/api/places` 백엔드 저장/조회 라우트 복구
- 2026-05-15: 프론트 lint 타입 오류 정리 (`any` 제거, AdSense 주석 수정, Naver Maps 타입 보강)
