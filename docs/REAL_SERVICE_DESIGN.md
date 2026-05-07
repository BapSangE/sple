# Sple 정식 서비스 설계 명세서 (Real Service Design Specification)

본 문서는 MVP 단계를 넘어 정식 서비스(Real Service)로서의 스플(Sple)이 갖춰야 할 화면 구성, 각 요소별 기능, 그리고 사용자 경험(UX)의 가이드라인을 정의합니다. (최신 `sple_design_update` 마스터 가이드 디자인 규칙 100% 반영)

## 1. 디자인 북극성 (Creative North Star)
- **정체성:** **The Fluid Cartographer (유연한 지도 제작자)**
- **핵심 가치:** 인스타그램에 파편화된 정보를 하나의 유연하고 아름다운 지도로 시각화하여 프리미엄한 탐색 경험을 제공합니다.
- **디자인 DNA:**
  - **Dark Mode First:** 앱 전반에 걸쳐 `#1c1010` (Background) 중심의 어두운 테마를 기본으로 사용합니다.
  - **Glassmorphism:** 모든 플로팅 UI(네비게이션, 모달 등)는 `bg-glass-bg backdrop-blur-xl` (`rgba(15, 23, 42, 0.8)`) 스타일을 적용하여 지도와의 깊이감을 형성합니다.
  - **Tonal Depth:** 레이어 간의 경계를 선보다는 명도 차이(`surface-container-low` ~ `surface-container-highest`)와 드롭 섀도우로 구분합니다.
  - **Brand Colors:** `sple-red` (#FF6B6B - Action/FAB), `smart-purple` (#6B4EFF - Intelligence/AI), `guide-mint` (#00D09E - Guidance/Success).
  - **Typography:** 글로벌 폰트로 **Plus Jakarta Sans**를 적용하여 모던하고 기하학적인 타이포그래피를 구현합니다.

---

## 2. 화면 구성 및 핵심 UI 요소

### 2.1. 메인 지도 화면 (Main Map View)
사용자가 가장 먼저 마주하는 화면으로, 지도 중심의 탐색 환경을 제공합니다.

- **레이아웃:** 화면 전체를 활용하는 Edge-to-Edge 맵 캔버스.
- **주요 UI 컴포넌트:**
  - **상단 헤더 (Top App Bar):** `fixed top-4 left-4 right-4 bg-glass-bg backdrop-blur-xl rounded-xl`. 좌측 메뉴, 중앙 `sple-red` 텍스트 로고, 우측 유저 프로필 아바타로 구성.
  - **스마트 검색 및 필터 바:** 헤더 하단 플로팅 뷰.
    - 검색창(`bg-glass-bg rounded-full`)과 우측 설정(`tune`) 아이콘.
    - 가로 스크롤 형태의 지능형 필터 칩(Category & Folder Filters). 선택 시 `bg-primary-container text-on-primary-container`로 반전 팽창.
  - **통합 FAB (+):** `fixed bottom-32 right-safe-margin w-14 h-14 bg-sple-red rounded-full shadow-lg`. 클립보드 인스타 링크 자동 감지 및 새 장소 등록 트리거.
  - **글로벌 하단 네비게이션 (모바일 전용):** `fixed bottom-5 bg-glass-bg backdrop-blur-xl rounded-full`.
    - 탭: Map, Explore, Saved, Profile.
    - 활성 탭: `bg-primary-container` 아이콘 배경과 `scale-110` 팝 애니메이션 적용.

### 2.2. 장소 상세 페이지 및 AI 하이라이트 (AI GNB)
사용자가 방문 결정을 내리는 정보 집약 공간입니다.

- **레이아웃:** 바텀 시트가 Full 상태(`95%` 높이)로 확장되거나 전체 뷰로 전환.
- **주요 UI 컴포넌트:**
  - **고해상도 이미지 캐러셀:** 상단 `h-[40vh]` 영역. Snap 스크롤이 적용된 엣지투엣지 이미지. 하단에 그라데이션 오버레이와 인디케이터 제공.
  - **타이틀 및 별점:** `font-display-lg` 타이틀과 우측 `sple-red` 별점 배지.
  - **AI 하이라이트 패널 (Core Insight):** 
    - `bg-smart-purple/10 border-smart-purple/30 rounded-xl` 스타일.
    - 내부의 펄스 효과 그라데이션(`from-smart-purple/20 to-transparent`).
    - AI가 장소의 특징(분위기, 추천 이유)을 자연어로 요약하고, `guide-mint` 컬러의 아이콘(Wi-Fi, 콘센트 등) 기반 팩트체크 태그 제공.
  - **Bento Style Grid (실용 정보):** 영업시간, 거리 정보를 `bg-surface-container-low` 라운드 카드로 깔끔하게 구획화.
  - **하단 고정 액션 바:** Save(보조 버튼) / Navigate(`bg-sple-red` 주요 버튼) / Share(아이콘 버튼) 구성.

### 2.3. 분석 및 저장 모달 (Analyze & Save Modal)
인스타그램 링크를 파싱하여 내 지도에 저장하는 핵심 플로우입니다.

- **레이아웃:** 화면 중앙에 뜨는 플로팅 다이얼로그(`w-[90%] max-w-md bg-glass-bg rounded-3xl`).
- **주요 UI 컴포넌트:**
  - **URL 입력창:** `bg-surface-container-highest/50 rounded-xl`. 링크 아이콘과 함께 읽기 전용/자동 입력 피드백 제공.
  - **분석 프리뷰 카드:** 썸네일과 위치 정보가 담긴 수평형 카드. 파싱 중일 때는 중앙 `smart-purple` 스피너 표시.
  - **폴더(컬렉션) 선택 리스트:** 체크박스/라디오 형태(`w-5 h-5 rounded-full border-2 border-sple-red`)의 직관적인 리스트 구조. 새로운 폴더 생성 버튼 포함.
  - **하단 액션:** Cancel / Save to Map(`bg-sple-red` + Icon). 성공 시 상단에서 Drop-down 되는 토스트 메시지.

### 2.4. 마이페이지 및 컬렉션 (My Profile & Collections)
사용자의 아카이빙된 장소와 취향을 시각화합니다.

- **주요 UI 컴포넌트:**
  - **Profile Header:** `bg-surface-container-low/60 rounded-3xl` 글래스모피즘 박스. 중앙 아바타와 텍스트, `bg-sple-red` 공유 버튼 위치.
  - **Stats Bento Grid:** Places Saved, My Maps, Followers 3구획. 호버 시 모서리에 브랜드 컬러 은은하게 비치는 효과(`group-hover:bg-sple-red/10`).
  - **My Collections:** 장소가 저장된 폴더를 카드 뷰로 제공. `rounded-3xl` 이미지 커버 비율에 우측 상단 `sple-red` 북마크 개수 배지 배치.
  - **최근 활동 (Activity):** 좌측 세로 타임라인 축(`before:w-[2px]`)을 기준으로 활동 내역을 수직 나열.

---

## 3. 비기능적 요구사항 및 UX 가이드라인

- **Zero-Loading (Skeleton UI):** 데이터 페칭 시 빈 화면 대신 Shimmer 애니메이션(`bg: linear-gradient` + `background-position` 이동) 기반의 스켈레톤 카드를 노출합니다.
- **Haptic Feedback:** 클릭(Light), 모달 호출 및 스와이프 스냅(Medium), 성공/에러(Success/Error)의 맥락에 맞춘 진동 피드백.
- **Scale Animations:** 모든 클릭 가능한 버튼과 카드는 공통적으로 `active:scale-95 transition-all duration-200`을 적용하여 젤리처럼 반응하는 쫀득한 손맛을 줍니다.

---

## 4. 컴포넌트별 상세 인터랙션 명세 (Interaction & Feedback Specs)

### 4.1. 상단 헤더 및 내비게이션 (Header & Navigation)
| UI 컴포넌트 | 액션 | 시각적 반응 (Visual Animation) | 햅틱 피드백 |
| :--- | :--- | :--- | :--- |
| **GNB 활성 탭** | Click | 아이콘 영역이 `bg-primary-container`로 반전되며 1.1배 확대(`scale-110`). 텍스트는 숨기거나 대체. | Light 햅틱 |
| **필터 칩 (Filter)** | Click | 선택 시 배경이 투명에서 `sple-red` 혹은 `primary-container`로 팽창(Expansion). | 틱(Tick) 사운드 / Light |

### 4.2. 메인 맵 뷰 (Main Map)
| UI 컴포넌트 | 액션 | 시각적 반응 (Visual Animation) | 햅틱 피드백 |
| :--- | :--- | :--- | :--- |
| **지도 마커 (Pin)** | Click | 선택된 마커가 위로 통통 튀는 바운스 애니메이션을 수행하고 커짐. 주변 핀은 `opacity-50`으로 흐려짐. | Medium 햅틱 |
| **통합 FAB (+)** | Click | 버튼 사이즈가 0.9배 눌렸다가 스프링처럼 복원. 내부 아이콘(+)이 45도 회전. 모달이 Slide-up. | Medium 햅틱 |

### 4.3. 상세 및 모달 (Details & Modals)
| UI 컴포넌트 | 액션 | 시각적 반응 (Visual Animation) | 햅틱 피드백 |
| :--- | :--- | :--- | :--- |
| **AI 분석 시작 버튼** | Click | 텍스트 페이드아웃, 중앙에 `smart-purple` 스피너 등장. 버튼 외곽선에 펄스(Pulse) 진동 효과. | Medium 햅틱 |
| **폴더 저장 리스트** | Select | 선택된 항목 우측 원형이 `sple-red` 체크 형태로 칠해짐. | Light 햅틱 |
| **저장하기 (Save)** | Click | 스피너 동작 후, 화면 상단 중앙에서 '저장 완료' `guide-mint` 색상 토스트 메시지 Slide-down. | Success 햅틱 |