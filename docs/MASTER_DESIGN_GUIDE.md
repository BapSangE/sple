# Sple: The Fluid Cartographer (Master Design Guide)

이 문서는 Sple 앱의 최신 디자인 업데이트(`sple_design_update`)를 기반으로 한 마스터 디자인 시스템 및 구현 가이드입니다. 향후 모든 프론트엔드 작업은 이 가이드를 최우선으로 따릅니다.

## 1. Core Identity & DNA
- **Theme**: Dark Mode First (`bg-background` 중심의 어두운 테마)
- **Aesthetic**: Glassmorphism (`bg-glass-bg backdrop-blur-xl`) 및 Tonal Depth (선보다 명도/그림자로 구분)
- **Font**: `Plus Jakarta Sans` (글로벌 적용)
- **Icons**: `Material Symbols Outlined` (FILL 0 / FILL 1 변형 사용)

## 2. Design Tokens (Tailwind Configuration)

### 2.1. Brand Colors
- `sple-red`: `#FF6B6B` (주요 액션, FAB, 로고, 활성화 포인트)
- `smart-purple`: `#6B4EFF` (AI 관련 영역, 하이라이트 패널)
- `guide-mint`: `#00D09E` (검증, 성공, Wi-Fi 등 긍정 정보)

### 2.2. Surface & Background (Material 3 Inspired)
- `background`: `#1c1010` (최하위 배경)
- `surface`: `#1c1010`
- `surface-container-lowest`: `#160b0b`
- `surface-container-low`: `#251818` (카드, 바텀 시트 등 기본 레이어)
- `surface-container`: `#291c1c`
- `surface-container-high`: `#352726`
- `surface-container-highest`: `#403130` (강조된 표면, 컨트롤)
- `glass-bg`: `rgba(15, 23, 42, 0.8)` (Top Nav, Bottom Nav 등 플로팅 요소의 배경)
- `overlay-dim`: `rgba(0, 0, 0, 0.4)` (모달 뒷배경)

### 2.3. Typography Scale (Plus Jakarta Sans)
- `display-lg`: 32px, Bold(700), Line Height 1.2
- `headline-md`: 24px, Semi-Bold(600), Line Height 1.3
- `title-sm`: 18px, Semi-Bold(600), Line Height 1.4
- `body-md`: 16px, Regular(400), Line Height 1.6
- `label-sm`: 13px, Medium(500), Line Height 1.2, Tracking 0.02em

### 2.4. Spacing & Radius
- **Spacing**: `stack-sm` (8px), `gutter` (12px), `stack-md` (16px), `safe-margin` (20px), `stack-lg` (24px)
- **Radius**: `sm` (0.25rem), `DEFAULT` (0.5rem), `md` (0.75rem), `xl` (0.75rem), `2xl` (1rem), `3xl` (1.5rem), `full` (9999px)

## 3. UI Component Patterns

### 3.1. Navigation
- **Top App Bar**:
  - `fixed top-4 left-4 right-4 rounded-xl bg-glass-bg backdrop-blur-xl shadow-md z-50`
  - Menu Icon, Center Logo (`text-sple-red font-display-lg`), User Avatar.
- **Bottom Navigation (Mobile)**:
  - `fixed bottom-5 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-glass-bg backdrop-blur-xl rounded-full shadow-lg`
  - 활성 탭: `bg-primary-container text-on-primary-container scale-110 shadow-sm`.
  - 비활성 탭: `text-on-surface-variant hover:bg-white/10`.

### 3.2. Main Map Elements
- **Search Bar**: `bg-glass-bg backdrop-blur-xl rounded-full` 형태, `search` 아이콘 및 우측 `tune` 아이콘 포함.
- **Filter Chips**: 가로 스크롤 레이아웃. 활성 칩은 `bg-primary-container text-on-primary-container`.
- **Map FAB (+ 버튼)**: `fixed bottom-32 right-safe-margin bg-sple-red w-14 h-14 rounded-full shadow-lg`.

### 3.3. AI Highlight Panel & Place Detail
- **Hero Image Carousel**: `h-[40vh]` 높이, `snap-x snap-mandatory` 스크롤.
- **AI Highlight Card**: `bg-smart-purple/10 border border-smart-purple/30 backdrop-blur-md rounded-xl`. 내부 배경에 `from-smart-purple/20 to-transparent` 그라데이션 펄스 애니메이션 포함.
- **Bento Style Grid**: 장소 정보(운영시간, 거리)를 `bg-surface-container-low rounded-xl` 그리드 카드로 배치.

### 3.4. Modal & Bottom Sheet (Analyze & Save)
- **Modal Container**: `w-[90%] max-w-md bg-glass-bg backdrop-blur-xl border border-outline-variant/30 rounded-3xl`.
- **Inputs**: `bg-surface-container-highest/50 border border-outline-variant/50 focus:ring-1 focus:ring-sple-red`.
- **Folder List**: 라디오 버튼 스타일(원형 체크박스)로 컬렉션 선택 리스트 구성.

### 3.5. Profile & Collections
- **Profile Header**: `bg-surface-container-low/60 backdrop-blur-md rounded-3xl`, Avatar 중앙 정렬, Share 버튼 포함.
- **Stats Grid**: `Places Saved`, `My Maps`, `Followers` 항목의 Bento 박스(`bg-surface-container`). Hover 시 우측 상단 모서리 컬러 효과 (`group-hover:bg-sple-red/10` 등).
- **Collection Card**: `rounded-3xl` 이미지 커버 비율 유지, 북마크 카운트 배지 탑재.
- **Activity Feed**: 좌측 세로선 타임라인 디자인 적용.

## 4. Animations & Feedback
- **Click Actions**: 버튼 및 카드는 공통적으로 `active:scale-95 transition-all duration-200` 적용 (젤리/바운스 효과).
- **Skeleton (Loading)**: Shimmer 애니메이션 (`bg: linear-gradient`)을 사용하여 데이터를 불러오는 상태를 표시.
- **Haptics**: 마이크로 인터랙션 시 진동 연동 고려.