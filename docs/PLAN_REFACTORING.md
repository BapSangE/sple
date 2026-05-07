# Sple 리팩토링 및 전체 기능 구현 작업 계획서 (Refactoring & Implementation Plan)

`MASTER_DESIGN_GUIDE.md` 및 `REAL_SERVICE_DESIGN.md`를 기반으로 Sple 서비스의 전면 리팩토링 및 기능 완성을 위한 단계별 작업 계획입니다. 주로 `frontend/` (Next.js) 폴더를 중심으로 작업되며, 필요시 백엔드 API(`src/`)와의 연동 작업을 포함합니다.

---

## Step 1: 환경 설정 및 공통 리소스 적용 (Foundation & Config)
**목표:** 마스터 가이드의 디자인 토큰을 실제 코드 환경에 구축합니다.
- **작업 내용:**
  1. `frontend/tailwind.config.ts` 전면 수정: Brand Colors, Surface Colors, Spacing, Radius 등 마스터 가이드 변수 주입.
  2. `frontend/src/app/globals.css` 업데이트: `Dark Mode First` 적용, 전역 스타일 및 유틸리티 클래스(Shimmer 효과, 스크롤바 숨김 등) 추가.
  3. `Plus Jakarta Sans` 글로벌 폰트 및 `Material Symbols Outlined` 아이콘 적용.
  4. 기존 코드베이스에서 사용되지 않거나 충돌하는 CSS/컴포넌트 정리.

## Step 2: 공통 UI 컴포넌트 개발 (Core Components)
**목표:** 앱 전반에서 재사용될 뼈대 컴포넌트를 구축합니다.
- **작업 내용:**
  1. **Navigation:** `TopAppBar` (상단 헤더) 및 `BottomNavBar` (모바일 하단 탭) 컴포넌트 구현 (`glass-bg`, `backdrop-blur-xl` 적용).
  2. **Buttons & Inputs:** `sple-red` 주요 버튼, `secondary` 버튼, 텍스트 입력창 모듈화.
  3. **Floating Action Button (FAB):** 통합 추가(+) 버튼 구현 및 애니메이션 적용.
  4. **Bottom Sheet & Modal Layout:** 재사용 가능한 바텀 시트 구조 및 모달 팝업 레이아웃 컴포넌트 개발.

## Step 3: 메인 맵 뷰 (Main Map View) 구현
**목표:** 핵심 탐색 화면인 지도 뷰를 완성합니다.
- **작업 내용:**
  1. 카카오맵 또는 Google Maps 기반 전체 화면 지도 컴포넌트 연동 (다크 테마 적용).
  2. **Smart Search & Filter:** 지도 위 플로팅되는 검색창 및 가로 스크롤 형태의 지능형 필터 칩 구현.
  3. 지도 위 마커 커스텀 및 클러스터링(숫자 뱃지) 구현 (바운스 애니메이션 포함).

## Step 4: AI 분석 및 저장 모달 (Analyze & Save Modal)
**목표:** 인스타그램 URL 파싱 및 장소 등록 플로우를 구현합니다.
- **작업 내용:**
  1. 통합 FAB 클릭 시 올라오는 모달창 구현.
  2. 클립보드 감지 및 URL 자동 붙여넣기 기능 연동.
  3. URL 파싱 백엔드 API 연동 (파싱 중 스피너 `smart-purple` 애니메이션 처리).
  4. 분석 결과 프리뷰(Bento Style) 및 컬렉션(폴더) 선택 UI 개발.
  5. 최종 장소 저장 API 연동 및 `guide-mint` 성공 토스트 메시지 구현.

## Step 5: 장소 상세 뷰 및 AI 하이라이트 (Place Detail View)
**목표:** 사용자에게 장소의 핵심 매력을 전달하는 상세 시트를 구현합니다.
- **작업 내용:**
  1. 바텀 시트 전체 확장(Full Sheet) 레이아웃 기반 상세 뷰 구성.
  2. 상단 고해상도 이미지 캐러셀(Snap 스크롤) 구현.
  3. **AI 하이라이트 패널:** `smart-purple` 펄스 그라데이션이 적용된 인사이트 패널 구현.
  4. **Bento Grid:** 영업시간, 거리, 편의시설 등 실용 정보 그리드 구현.
  5. 하단 액션 버튼(길찾기 연동, 공유, 저장) 구현.

## Step 6: 마이페이지 및 컬렉션 (My Profile & Collections)
**목표:** 개인화된 정보와 장소 아카이빙 현황을 보여주는 화면을 구현합니다.
- **작업 내용:**
  1. 글래스모피즘이 적용된 상단 프로필 헤더 구현.
  2. 통계 정보(저장한 장소, 맵, 팔로워)를 담은 Stats Bento Grid 개발.
  3. My Collections 카드 리스트 레이아웃 개발 (이미지 커버 및 북마크 배지).
  4. 최근 활동(Recent Activity) 세로 타임라인 컴포넌트 개발.

## Step 7: 전체 기능 통합 및 마무리 (Integration & Polish)
**목표:** 프론트엔드와 백엔드를 최종 연동하고 UX 디테일을 다듬습니다.
- **작업 내용:**
  1. 라우팅 점검 및 페이지 간 부드러운 전환 효과(Framer Motion 등) 확인.
  2. 모든 주요 인터랙션(버튼 클릭 스케일링 `active:scale-95`) 점검.
  3. 백엔드(DB) 실 데이터 바인딩 테스트 및 버그 픽스.
  4. 로딩 중 빈 화면 방지를 위한 Skeleton(Shimmer) UI 꼼꼼한 적용.

---
*위 계획은 진행 상황 및 기술적 요건에 따라 일부 조정될 수 있습니다.*