# Sple 디자인 시스템 (Design System)

본 문서는 Sple의 일관된 UI/UX 유지를 위한 디자인 시스템 가이드라인입니다.

## 1. 컬러 팔레트 (Color Palette)
브랜드 정체성을 강화하고, 다크 테마 가독성을 극대화하기 위해 다음 색상을 기본으로 합니다.

| Role | Color | Hex Code | Purpose |
| :--- | :--- | :--- | :--- |
| **Primary** | Coral Red | `#FF6B6B` | 핵심 액션(FAB), 로고 아이콘, 활성 필터 |
| **Secondary** | Deep Purple | `#6B4EFF` | 툴팁 배너, 강조 요소 |
| **Tertiary** | Mint Green | `#00D09E` | 성공 상태, 보조 액션 |
| **Background** | Zinc-950 | `#09090b` | 최하위 레이어 배경 |
| **Surface** | Zinc-900 | `#18181b` | 카드, 모달, 바텀 시트 배경 |
| **Text-Headline** | White | `#FFFFFF` | 주요 헤드라인 및 강조 텍스트 |
| **Text-Body** | Zinc-400 | `#a1a1aa` | 설명 텍스트 및 비활성 상태 |

## 2. 타이포그래피 (Typography)
- **Primary Font**: `Pretendard` (가독성 및 모바일 최적화)
- **Headline**: `Manrope` (브랜드 로고 및 강조 헤드라인)
- **Weight**: 
  - `Black` (900): 헤드라인, 텍스트 로고
  - `Bold` (700): 버튼, 필터 칩, 주요 정보
  - `Medium` (500): 본문 텍스트

## 3. 레이아웃 컴포넌트 시스템 (UI Components)
- **바텀 시트 (Bottom Sheet)**: 
  - `rounded-t-[48px]` 커브 적용.
  - 최하단 패딩 `pb-[calc(2.5rem+env(safe-area-inset-bottom))]` 적용 (Safe Area 대응).
- **필터 칩 (Filter Chips)**:
  - `rounded-full`, `px-5 py-2.5`, 활성화 시 `bg-primary`, 비활성화 시 `bg-zinc-900/80`.
- **검색창 (Search Pill)**:
  - `rounded-full`, `bg-zinc-800`, `focus:ring-4 focus:ring-primary/20`.
- **플로팅 버튼 (FAB)**:
  - `w-18 h-18`, `rounded-[28px]`, 그림자 효과(`shadow-2xl shadow-primary/40`).

## 4. 인터랙션 및 모션
- **Haptic 피드백**: `triggerHaptic` 유틸리티를 사용하여 주요 액션에 진동 적용 (light, medium, success, error).
- **애니메이션**: `framer-motion`을 기본으로 하며, 툴팁 배너와 Skeleton에 `animate-pulse` 및 탄력 있는 Spring 물리 엔진 사용.

## 5. PWA 및 가이드라인
- **PWA 최적화**: `viewport-fit=cover` 설정 필수.
- **다크 모드**: 전역적으로 `Zinc` 다크 테마 스타일 준수.
