---
trigger: always_on
---

**모든 작업은 harness.md를 참고한다.**

## 외부 지식 베이스 참조 규칙

**옵시디언 경로**: 에이전트는 기획 근거가 필요할 때 반드시 외부 경로인 `C:\obsidian_test\brain` 내의 문서를 탐색해야 합니다

기능 변경, 워크플로우 변경 등 기존 문서와 달라질 경우 관련 문서에 업데이트를 해야합니다

# 프로젝트 개요: 스플(Sple)

정체성: 내 취향을 스크랩(Scrap)한 나만의 핫플(Place) 지도 서비스입니다.
Creative North Star: **The Fluid Cartographer (유연한 지도 제작자)** - 고사양 다크 모드와 글래스모피즘 기반의 프리미엄 에디토리얼 디자인.

## 1. 디자인 시스템 원칙 (Stitch AI 기준)

모든 UI 작업은 `docs/stitch_ai_instagram_place_scraper`의 디자인 DNA를 최우선으로 따릅니다.

### 컬러 팔레트 (Tonal Depth & Vibrancy)
- **Primary (Sple Red):** `#FF6B6B` - 브랜드 액션, 활성 핀, 주요 CTA.
- **Secondary (Smart Purple):** `#6B4EFF` - AI 분석, 길찾기 등 기술적 신뢰도 상징.
- **Tertiary (Guide Mint):** `#00D09E` - 온보딩 툴팁, 신규 유저 가이드 전용.
- **Surface (Deep Navy):** `#0F172A` - 컨테이너 및 카드 배경.
- **Background (Pure Black):** `#000000` - 기본 캔버스 및 지도 배경색.
- **Typography:** 제목 `#FFFFFF` (Epilogue), 본문 `#94A3B8` (Be Vietnam Pro).

### 글래스모피즘 & 레이아웃 (The Glass & No-Line Rule)
- **Glassmorphism:** 모든 플로팅 패널은 `bg-[#0F172A]/80 backdrop-blur-xl` 및 `1px solid border-[#1E293B]`를 적용합니다.
- **No-Line Rule:** 섹션 구분을 위한 1px 선 사용을 지양하고, 배경색의 명도 차이(Surface nesting)로 경계를 구분합니다.
- **Corner Radius:** 바텀 시트 및 주요 모달은 상단 **24px (Level 3)** 곡률을 적용하여 부드러운 '요람' 효과를 줍니다.

## 2. 프론트엔드 UI/UX 레이아웃 규칙

- **지도 중심 설계:** 앱 메인 화면의 80% 이상은 지도가 차지하며, 하단 바텀 시트는 다크 글래스 스타일로 구현합니다.
- **단일 FAB 통합:** 중복된 버튼을 배제하고, 우측 하단에 **가이드 민트(#00D09E)** 색상의 움직이는 툴팁이 안내하는 **Sple Red (#FF6B6B)** 플러스 버튼 하나로 통합합니다.
- **바텀 시트 (Bottom Sheet):** 하단 패널은 40px 너비의 투명한 그랩 바(Grabber bar)를 포함하며, 스와이프 업 시 상세 정보를 노출합니다.

## 3. 백엔드 및 MVP 핵심 로직 규칙

- **데이터 수집 (Share Intent):** 모바일 OS의 기본 공유 기능을 통해 인스타그램 URL을 전송받습니다.
- **AI 정보 추출:** Gemini 모델을 사용하여 비정형 텍스트에서 주소, 상호명, 매력 포인트를 정밀 추출합니다.
- **지도 매핑 (Kakao Map):** 카카오 지도 API를 우선 연동하며, 클러스터링을 적용합니다.
- **응답 속도 최적화:** 'Zero-Loading' 철학에 따라 데이터 로딩 시 스켈레톤 UI를 활용하여 체감 속도를 높입니다.


## 4. Antigravity 에이전트 작업 파이프라인 (Step-by-Step)

디자인 주입: 프롬프트 지시에 따라 Stitch MCP에서 스플 디자인 에셋과 팔레트를 로드하여 글로벌 테마를 설정합니다.

UI 뼈대 구축: 지도 API를 띄우고 하단 바텀 시트 및 둥둥 떠다니는 툴팁 애니메이션 컴포넌트를 구현합니다.

핵심 로직 연동: Share Intent를 통해 URL을 받아오고, LLM 파이프라인으로 주소를 추출하여 지도에 마커를 찍는 백엔드 로직을 연동합니다. API 연동 보일러플레이트는 에이전트가 전담합니다.

통합 테스트: 툴팁 확인 👉 링크 공유 👉 앱 복귀 후 핀 생성 👉 바텀 시트 상세 확인으로 이어지는 전체 유저 플로우가 매끄러운지 End-to-End로 테스트합니다.
