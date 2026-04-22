# Sple 프로젝트 프론트엔드 UI/UX 설계 및 파이프라인 구현 계획 (PLAN.md)

이 문서는 사용자의 요청 및 `agent.md`, `harness.md` 지침에 따라 Stitch MCP가 생성한 UI 디자인과 스플(Sple) 앱의 동작 로직을 연결하는 컴포넌트별 맵핑 및 구현 계획입니다. 백엔드(FastAPI)와 프론트엔드(React Native/Expo) 연동의 세부 사항 및 변형해야 할 요소들을 요소 하나하나 분석하여 작성했습니다.

## Proposed Changes

---
### 1. 글로벌 테마 및 디자인 시스템 설정 (Stitch DNA 이식)

Stitch MCP 서버의 `splash.html`과 `main_map.html`에서 추출한 핵심 색상 토큰 및 폰트를 Expo 프로젝트에 이식합니다.

#### 설계 및 변형 포인트
- **Primary(코랄)**: `#FF5A5F` - 핫플레이스 마커, 주요 FAB(추가 버튼), 활성화 아이콘에 사용
- **Secondary(스마트 퍼플)**: `#6B4EFF` / `secondary` - AI 추천 액션 버튼
- **Accent(가이드 민트)**: `#00D09E` / `tertiary-container` - 콜드 스타트용 움직이는 툴팁 배경 
- **Typography**: `Manrope` (Headline), `Inter` (Body).
- **변형 작업**: Expo 내 `tailwind.config.js` (또는 NativeWind 설정)를 생성하고 해당 토큰을 전역으로 주입합니다.

#### [NEW] `mobile/tailwind.config.js`
Tailwind 테마 색상을 전역으로 추가하여 모든 컴포넌트에서 활용합니다.

---
### 2. 스플래시 컴포넌트 (Splash Screen)

앱 초기 로딩 시 Stitch MCP의 디자인을 기반으로 모바일 첫인상을 구성합니다.

#### 설계 및 변형 포인트
- 그라데이션 배경: `linear-gradient(135deg, #FF5A5F 0%, #6B4EFF 100%)` 구현.
- 로고 및 스피너 애니메이션 표시. 로딩이 끝나면 `MainMap` 스크린으로 이동하는 동작을 추가합니다.

#### [NEW] `mobile/src/screens/SplashScreen.js`
`splash.html` 코드를 React Native View 컴포넌트로 변형하고 타이머 로직을 통합.

---
### 3. 메인 지도 뼈대 구축 (Kakao Map + Bottom Sheet)

앱 메인 화면의 80%는 카카오 지도, 하단 20% 공간에는 바텀 시트 및 네비게이션을 렌더링합니다.

#### 설계 및 변형 포인트
- **Kakao Map API 연동**: WebView 혹은 React Native 래퍼를 사용. 
- **Bottom Nav Bar**: `main_map.html` 렌더링 요소를 React Navigation의 하단 탭으로 반영.
- **바텀 시트 (Bottom Sheet)**: 하단에서 스와이프 업하는 애니메이션 컴포넌트 작성.

#### [MODIFY] `mobile/App.js`
네비게이션 셋업과 지도 스크린 컴포넌트 추가.

#### [NEW] `mobile/src/screens/MainMapScreen.js`
지도 및 플로팅 레이아웃 주입.

---
### 4. 핵심 UX: 가이드 액션 및 플로팅 툴팁 (Cold Start)

초기 빈 지도 사용 시 이탈률을 막기 위해 가이드 민트 색상을 활용한 유도 툴팁을 배치합니다.

#### 설계 및 변형 포인트
- 민트색 배경(`tertiary-container`)의 우측 하단(+) FAB와 위로 통통 튀는(Bounce) 툴팁 구현.
- **툴팁 문구**: "인스타에서 공유하기를 눌러 첫 맛집을 추가해 보세요!"
- **변형 로직**: 사용자가 첫 장소를 등록한 이후에는 이 툴팁이 사라지도록 `hasFirstPlace` 상태 값과 연결하여 렌더링 제어.

---
### 5. 핵심 서비스 로직 (Share Intent 👉 AI 추출 👉 Map 핀)

#### 설계 및 변형 포인트
1. **Share Intent 처리 (프론트엔드 모바일)**
   - 앱 외부에서 URL을 입력 받았을 때 처리하는 인텐트 설정.
2. **LLM 주소 파싱 (백엔드 FastAPI)**
   - `src/api/` 경로: 수신된 콘텐츠 스니펫에서 LLM이 행정구역 주소 문맥 및 상호명을 추출.
3. **지오코딩 (백엔드 또는 앱)**
   - 카카오 로컬 API 사용해 위도/경도 변환.
4. **결과 응답**: 모바일 지도에 코랄 마커 핀 생성.

#### [MODIFY] `src/api/main.py`
기존 보일러플레이트에 `POST /parse-instagram` 엔드포인트 추가.
