---
name: 'Sple: The Fluid Cartographer (Master Guide)'
colors:
  surface: '#1c1010'
  surface-dim: '#1c1010'
  surface-bright: '#453635'
  surface-container-lowest: '#160b0b'
  surface-container-low: '#251818'
  surface-container: '#291c1c'
  surface-container-high: '#352726'
  surface-container-highest: '#403130'
  on-surface: '#f5dddb'
  on-surface-variant: '#e0bfbd'
  inverse-surface: '#f5dddb'
  inverse-on-surface: '#3b2d2c'
  outline: '#a78a88'
  outline-variant: '#584140'
  surface-tint: '#ffb3b0'
  primary: '#ffb3b0'
  on-primary: '#68000f'
  primary-container: '#ff6b6b'
  on-primary-container: '#6d0010'
  inverse-primary: '#ae2f34'
  secondary: '#c8bfff'
  on-secondary: '#2c009e'
  secondary-container: '#4411d9'
  on-secondary-container: '#b9afff'
  tertiary: '#2fe0ac'
  on-tertiary: '#003828'
  tertiary-container: '#00b085'
  on-tertiary-container: '#003b2a'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad8'
  primary-fixed-dim: '#ffb3b0'
  on-primary-fixed: '#410006'
  on-primary-fixed-variant: '#8c1520'
  secondary-fixed: '#e5deff'
  secondary-fixed-dim: '#c8bfff'
  on-secondary-fixed: '#190064'
  on-secondary-fixed-variant: '#4109d7'
  tertiary-fixed: '#59fdc7'
  tertiary-fixed-dim: '#2fe0ac'
  on-tertiary-fixed: '#002116'
  on-tertiary-fixed-variant: '#00513c'
  background: '#1c1010'
  on-background: '#f5dddb'
  surface-variant: '#403130'
  sple-red: '#FF6B6B'
  smart-purple: '#6B4EFF'
  guide-mint: '#00D09E'
  glass-bg: rgba(15, 23, 42, 0.8)
  surface-dark: '#0F172A'
  overlay-dim: rgba(0, 0, 0, 0.4)
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  title-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.4'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  safe-margin: 20px
  gutter: 12px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
  bottom-sheet-peek: 80px
  bottom-sheet-half: 50%
  bottom-sheet-full: 95%
---

# Sple 정식 서비스 설계 명세서 (Real Service Design Specification)

본 문서는 MVP 단계를 넘어 정식 서비스(Real Service)로서의 스플(Sple)이 갖춰야 할 화면 구성, 각 요소별 기능, 그리고 사용자 경험(UX)의 가이드라인을 정의합니다.

## 1. 디자인 북극성 (Creative North Star)
- **정체성:** **The Fluid Cartographer (유연한 지도 제작자)**
- **핵심 가치:** 인스타그램에 파편화된 정보를 하나의 유연하고 아름다운 지도로 시각화하여 프리미엄한 탐색 경험을 제공합니다.
- **디자인 DNA:**
  - **Glassmorphism:** 모든 플로팅 UI는 `bg-[#0F172A]/80 backdrop-blur-xl` 스타일을 적용합니다.
  - **Tonal Depth:** 레이어 간의 경계를 선이 아닌 명도 차이와 드롭 섀도우(Drop Shadow)로 구분합니다.
  - **Brand Colors:** Sple Red(#FF6B6B - Action), Smart Purple(#6B4EFF - Intelligence), Guide Mint(#00D09E - Guidance).

---

## 2. 화면 구성 및 핵심 UI 요소

### 2.1. 메인 지도 화면 (Main Map View)
사용자가 가장 먼저 마주하는 화면으로, 지도 중심의 탐색 환경을 제공합니다.

- **레이아웃:** 화면 전체를 활용하는 Edge-to-Edge 맵, 상단 플로팅 헤더, 하단 바텀 시트.
- **주요 버튼 및 기능:**
  - **스마트 검색창 (Search Bar):** 
    - 터치 시 바텀 시트가 상승하며 최근 검색어 및 주변 인기 핫플 자동완성 목록 제공.
    - WCAG 기준에 맞춘 높은 명도 대비 확보.
  - **지능형 필터 칩 (Category & Folder Filters):** 
    - 가로 스크롤 형태. 우측 끝에 페이드 효과를 주어 추가 항목 암시.
    - 단순 카테고리 외에 사용자가 생성한 '폴더' 필터링 지원.
  - **통합 FAB (+):** 
    - **클립보드 자동 감지:** 앱 진입 시 복사된 인스타그램 링크가 있으면 즉각적인 등록 제안 팝업 노출.
    - **다중 저장 지원:** 한 번의 분석으로 여러 장소를 동시에 선택하여 저장 가능.
  - **지도 컨트롤:** 
    - **내 위치(GPS) 버튼:** 현재 위치로 즉시 이동 및 트래킹 모드 전환.
    - **줌 컨트롤 (+/-):** 정밀한 지도 확대를 위한 직관적 버튼 배치.
    - **마커 클러스터링:** 축소 시 핀들을 숫자로 그룹화하여 시각적 복잡도 해소.

### 2.2. 다이나믹 바텀 시트 (Dynamic Bottom Sheet)
장소 리스트와 상세 정보를 유연하게 전환하며 보여주는 핵심 인터랙션 요소입니다.

- **레이아웃:** 3단계 스와이프 인터랙션 (Peek: 80px / Half: 50% / Full: 95%).
- **주요 버튼 및 기능:**
  - **그랩 바 (Grabber):** 44px 이상의 터치 영역을 확보하여 스와이프 편의성 극대화.
  - **정렬 필터:** 거리순, 최신순, 별점순 빠른 전환 버튼 제공.
  - **장소 요약 카드:** 
    - 인스타그램 썸네일 프리뷰 및 AI 생성 요약 태그 노출.
    - 우측 상단에 '길찾기' 퀵 버튼(외부 앱 연동) 배치.

### 2.3. 장소 상세 페이지 (Place Detail View)
사용자가 방문 결정을 내리는 정보 집약 공간입니다.

- **레이아웃:** 바텀 시트가 Full 상태로 확장되며 상세 정보 노출.
- **주요 버튼 및 기능:**
  - **이미지 캐러셀:** 인스타그램 포스트의 미디어(이미지/영상)를 슬라이드 형태로 제공.
  - **AI 하이라이트 패널:** Smart Purple 테마를 활용하여 '왜 이곳인가?'에 대한 AI 분석 포인트 요약.
  - **내비게이션 연동:** 카카오맵, 네이버 지도, T맵 등 설치된 앱 자동 감지 및 연결.
  - **개인 메모 및 폴더 이동:** 방문 팁 기재 및 저장 위치 변경 기능.

### 2.4. 소셜 및 마이페이지 (Social & My Page)
사용자의 취향을 관리하고 공유하는 공간입니다.

- **주요 버튼 및 기능:**
  - **컬렉션(폴더) 관리:** 폴더별 공개 범위 설정(공개/비공개/친구만).
  - **나만의 지도 공유:** 카카오톡 및 링크 복사를 통한 폴더 단위 외부 공유.
  - **구독/팔로우:** 에디터 픽 또는 취향이 비슷한 유저의 지도 구독.

---

## 3. 비기능적 요구사항 및 UX 가이드라인

- **Zero-Loading 철학:** 데이터 로드 시 빈 화면 대신 스켈레톤(Skeleton) UI를 사용하여 시각적 즐거움 제공.
- **Haptic Feedback:** 버튼 클릭, 저장 완료, 에러 발생 시 각기 다른 진동 피드백 제공 (모바일 앱 기준).
- **에러 핸들링:** 
  - 링크 파싱 실패 시 '수동 입력' 플로우로 자연스럽게 유도.
  - 오프라인 상태일 때 '저장 예약' 기능 제공 및 UI 안내.
- **다크 모드 대응:** 시스템 테마에 맞춰 지도 스타일(카카오맵 다크 테마) 및 UI 컬러 변수 즉각 전환.

---

## 4. 컴포넌트별 상세 인터랙션 명세 (Interaction & Feedback Specs)

본 섹션은 Stitch를 활용한 UI/UX 디자인 및 향후 프론트엔드 코드 구현의 **절대적 기준점(Ground Truth)** 역할을 합니다. 메인 화면부터 모달까지 모든 인터랙티브 요소의 동작을 세밀하게 정의합니다.

### 4.1. 상단 헤더 영역 (Header & Search)

| UI 컴포넌트 | 트리거 | 기능 정의 (Function) | 시각적 반응 (Visual Animation) | 햅틱 및 피드백 (Feedback) |
| :--- | :--- | :--- | :--- | :--- |
| **로그인/프로필 버튼** | Click | 구글 로그인 팝업 호출 또는 마이페이지 시트 확장 | 클릭 시 0.95배 Scale-down 후 복원. 로그인 성공 시 프로필 썸네일로 페이드 인(Fade-in) 전환. | Light 햅틱. |
| **검색창 (Search Bar)** | Focus | 검색 모드 활성화 및 자동완성 바텀 시트 호출 | 검색창 배경의 투명도가 60%에서 80%로 짙어지며 활성화 상태 강조 (블러 효과 유지). | 텍스트 입력 시마다 Light 햅틱. |
| **검색창 지우기 (X)** | Click | 입력된 텍스트 초기화 및 검색 모드 해제 | X 아이콘이 반시계 방향으로 90도 회전하며 사라짐(Fade-out). | Light 햅틱. |
| **검색 자동완성 리스트** | Click | 해당 검색어로 지도 이동 및 결과 필터링 | 탭한 리스트 아이템의 배경이 아주 연한 Sple Red(투명도 10%)로 0.2초간 반짝임(Flash). | Medium 햅틱. |

### 4.2. 내비게이션 및 맵 컨트롤 (Navigation & Map Controls)

| UI 컴포넌트 | 트리거 | 기능 정의 (Function) | 시각적 반응 (Visual Animation) | 햅틱 및 피드백 (Feedback) |
| :--- | :--- | :--- | :--- | :--- |
| **필터 칩 (Category/Folder)** | Click | 특정 카테고리/폴더의 마커만 지도에 표시 | 선택 시 배경이 Surface(투명)에서 **Sple Red(Solid)**로 팽창(Expansion)하듯 채워지며, 글씨체가 Bold로 변함. | 틱(Tick) 사운드 및 Light 햅틱. 지도 위 마커들이 페이드 인/아웃 교차. |
| **줌 컨트롤 (+/-)** | Click | 지도 확대/축소 (Level 변경) | 버튼 터치 시 배경이 White 10% 정도 밝아지며 눌림 효과(Press state). | 각 클릭마다 Light 햅틱. |
| **GPS 현위치 버튼** | Click | 사용자의 현재 좌표로 부드럽게 지도 패닝(Panning) | 아이콘 내부의 타겟 점이 파란색/Sple Red로 활성화 점멸(Blink). | 좌표 획득 완료 시 Success 햅틱. |
| **지도 마커 (Pin)** | Click | 장소 선택 및 바텀 시트 상세 뷰 호출 | 선택된 마커가 살짝 위로 튀어오르는 **Jump(Bouncing)** 애니메이션 수행 후 크기가 1.2배 확대됨. 주변 마커들은 투명도 50%로 감소. | Medium 햅틱. |
| **마커 클러스터 (숫자 뱃지)** | Click | 클러스터가 포함한 영역으로 지도 자동 확대 | 클릭 시 클러스터 원형이 톡 터지듯(Burst) 분열되며 개별 핀들로 흩어지는 애니메이션. | Light 햅틱. |

### 4.3. 메인 액션 및 바텀 시트 (Main Action & Bottom Sheet)

| UI 컴포넌트 | 트리거 | 기능 정의 (Function) | 시각적 반응 (Visual Animation) | 햅틱 및 피드백 (Feedback) |
| :--- | :--- | :--- | :--- | :--- |
| **통합 FAB (+)** | Click | 인스타그램 URL 추가 모달 호출 | 버튼이 0.9배로 눌렸다가 강하게 복원(Spring). 아이콘(+)이 45도 회전하여 닫기(X) 형태로 변경될 준비. 하단 모달이 Slide-up. | Medium 햅틱, 뒤로 깔린 지도 영역이 어두워짐(Dimming). |
| **바텀 시트 핸들 (Grabber)** | Drag | 시트 높이 조절 (Peek 80px ↔ Half 50% ↔ Full 95%) | 드래그 가속도(Inertia)에 따라 부드럽게 이동하며, 목표 지점 도달 시 자석처럼 착 달라붙는 **Magnetic Snap** 효과. | 특정 높이에 Snap 될 때마다 틱(Tick) 햅틱. |
| **정렬/필터 드롭다운** | Click | 리스트 정렬 방식(거리순, 최신순 등) 변경 | 드롭다운 메뉴가 아래로 펼쳐질 때(Accordion) 각 항목이 0.05초 간격으로 Stagger 애니메이션 렌더링. | Light 햅틱. |
| **장소 리스트 카드** | Click | 카드를 클릭하여 '장소 상세 페이지(Full Sheet)'로 전환 | 카드가 살짝 눌리는(Scale 0.98) 시각 효과 후, 시트 전체가 위로 부드럽게 확장(Spring 애니메이션). | Light 햅틱. |

### 4.4. 장소 상세 뷰 내부 요소 (Place Details)

| UI 컴포넌트 | 트리거 | 기능 정의 (Function) | 시각적 반응 (Visual Animation) | 햅틱 및 피드백 (Feedback) |
| :--- | :--- | :--- | :--- | :--- |
| **인스타 원본 (Link)** | Click | 브라우저/인스타그램 앱으로 원본 게시물 열기 | 터치 시 버튼 배경에 물결(Ripple) 효과 발생 후 외부 앱으로 전환. | Medium 햅틱. |
| **길찾기 버튼 (Navigate)** | Click | 카카오/네이버/T맵 등 내비게이션 숏컷 바텀 시트 호출 | 하단에서 부드러운 글래스 재질의 시트가 추가로 올라옴(Slide-up). | Medium 햅틱. |
| **공유하기 아이콘** | Click | 장소 정보 카카오톡/OS 공유창 호출 | 아이콘이 1.1배 커졌다가 돌아옴. | Light 햅틱. |
| **뒤로가기/닫기 (←, X)** | Click | 현재 뷰를 닫고 이전 상태(지도 또는 리스트)로 복귀 | 현재 레이어가 오른쪽이나 아래로 밀려나가는 **Slide-out** 및 **Fade-out** 중첩 애니메이션. | Light 햅틱. |

### 4.5. 분석 및 저장 모달 (Analyze & Save Modal)

| UI 컴포넌트 | 트리거 | 기능 정의 (Function) | 시각적 반응 (Visual Animation) | 햅틱 및 피드백 (Feedback) |
| :--- | :--- | :--- | :--- | :--- |
| **URL 입력창 & 붙여넣기 아이콘** | Click | 클립보드 데이터 붙여넣기 및 텍스트 포커스 | 클립보드 감지 시 텍스트가 타자기를 치듯(Type-writer) 채워지며, 성공 시 테두리가 Sple Red로 1초간 점멸. | 텍스트 채워질 때 타다닥(다중 Light) 햅틱. |
| **AI 분석 시작 버튼** | Click | 백엔드에 파싱 요청 및 스켈레톤 로딩 뷰 전환 | 텍스트가 Fade-out 되고 중앙에 **Smart Purple 스피너** 노출. 버튼 배경이 심장 박동처럼 펄스(Pulse) 진동. | 버튼 클릭 시 Medium 햅틱. |
| **폴더/메모 입력창** | Focus | 키보드 호출 및 입력 모드 | 인풋 박스의 테두리(Border)가 White/10%에서 Sple Red/50%로 부드럽게 전환. | Focus 시 Light 햅틱. |
| **장소 저장하기 버튼** | Click | 분석 완료된 장소를 내 지도 DB에 최종 저장 | 클릭 시 로딩 스피너 작동. 성공 시 상단에서 "저장 완료!" **Sple Red 토스트 메시지**가 내려옴(Slide-down). | 성공 시 Success(띠리링) 햅틱 피드백. |

### 4.6. 글로벌 피드백 상태 (Global Feedback States)

- **데이터 로딩 (Skeleton UI):** 데이터가 불러와지는 동안, 지도 마커 영역이나 리스트 카드에 뼈대 형태의 블록이 나타나며, 왼쪽에서 오른쪽으로 흐르는 광택(**Shimmer**) 애니메이션이 반복됩니다.
- **에러 및 경고 (Error State):** URL 파싱 실패나 네트워크 에러 시, 해당 모달이나 입력창이 좌우로 살짝 흔들리는 **Shake 애니메이션**을 3회 수행하며 빨간색 테두리가 강조됩니다. 동시에 강한 Error 햅틱(징징징)이 울립니다.
