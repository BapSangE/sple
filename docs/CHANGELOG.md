# Changelog

## [Unreleased]

### Added
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
