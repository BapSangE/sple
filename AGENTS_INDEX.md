# AGENTS_INDEX.md

안티그래비티 프로젝트 '스플(Sple)' 지식 베이스 인덱스입니다.

## 1. 계획 및 기획 문서
- [[docs/CURRENT_PRODUCT_UNDERSTANDING.md]]: 공개 데모 기준 현재 제품 방향과 상태
- [[docs/PRODUCTION_READINESS_PROGRESS.md]]: 실서비스 준비 작업 진행 상황과 남은 일
- [[docs/FIGMA_DESIGN_GUIDE.md]]: Figma 디자인 가이드 및 화면/컴포넌트 기준
- [[docs/DESIGN_SYSTEM_RULES.md]]: Sple 디자인 토큰, 컴포넌트, Figma-to-code 규칙
- [[docs/PLAN.md]]: Sple 자율형 개발 워크플로우 및 MVP 실행 계획서
- [[sple_mvp.md]]: Sple MVP 서비스 기획 문서 전문 (유저 플로우, PRD)
- [[docs/REAL_SERVICE_DESIGN.md]]: Sple 정식 서비스 설계 명세서 (화면 구성 및 UX)

## 2. 에이전트 규칙
- [[AGENTS.md]]: 현재 제품 기준 및 Figma 디자인 시스템 규칙
- [[.agents/rules/agent.md]]: 스플 디자인 연동 원칙 및 로직 규칙
- [[.agents/rules/harness.md]]: 하네스 환경 구성 및 에이전트 프로토콜

## 3. 변경 이력
- [[docs/CHANGELOG.md]]: 시스템 및 코드 변경 이력 기록

## 4. 소스 코드 (src/)
- `src/main.py`: FastAPI 기반 Sple 백엔드 엔트리포인트
- `frontend/src/app/`: Next.js App Router 화면
- `frontend/src/components/`: Next.js 공용 컴포넌트
- `src/database.py`: SQLAlchemy 기반 장소 저장소
