# Sple 서비스 고도화 작업 세부 계획서 (Harness-Driven)

본 문서는 `Sple 서비스 고도화 작업 명세서`를 기반으로 자율 실행 루프를 진행하기 위한 빌딩 블록 단위 실행 계획(Plan)입니다.

## Step 1: Phase 1 (예외 처리 및 방어 로직)
1. **위치 권한 거부 대응**
   - `frontend/src/app/page.tsx` 내 `navigator.geolocation` 예외(error) 블록에서 기본 좌표(서울 시청 등)를 fallback으로 지정하도록 수정.
2. **URL 파싱 및 AI API 에러 핸들링**
   - `frontend/src/app/page.tsx`의 `handleAnalyze` 에러 처리 구문 보강 (4xx, 5xx 에러).
   - 비공개 계정/삭제된 게시물 등 파싱 실패 시 `alert` 대신 세련된 모달 또는 Toast UI로 사용자 안내.
3. **세션/토큰 만료(401) 대응**
   - `fetchPlaces`, `handleSave` 등 API 호출 시 401 Unauthorized가 떨어질 경우, 즉각적으로 `signOut()` 처리 및 세션 만료 알림 Toast/Modal 적용.
4. **마커 렌더링 부하 완화**
   - 불필요한 리렌더링 방지를 위해 React `useMemo`, `useCallback` 등을 활용한 메모리제이션 점검. (클러스터링은 Phase 2에서 구현).

## Step 2: Phase 2 (사용자 편의성(UX) 고도화)
1. **바텀 시트 컨트롤 강화**
   - `frontend/src/app/page.tsx` 바텀 시트에 제스처(drag/swipe) 또는 최소화/확장 버튼(아이콘)을 추가하여 지도를 가리지 않도록 개선 (Framer Motion 활용).
2. **직관적인 URL 폼**
   - 팝업/모달 내에 '인스타그램 링크 붙여넣기' 입력 필드를 크게 배치하고 '분석 시작' 버튼과 시각적으로 구분되도록 개선.
3. **로딩 피드백 및 툴팁 시각화**
   - AI 파싱 중일 때 스켈레톤이나 반복되는 Lottie 스타일 애니메이션을 명확히 노출.
   - 처음 진입 시 튜토리얼 성격의 툴팁 렌더링.
4. **마커 클러스터링 도입**
   - `react-kakao-maps-sdk`의 `MarkerClusterer`를 활용하여 마커 수가 많을 때 렌더링 퍼포먼스를 향상시키고 클릭 충돌 방지.
5. **지도 부가 컨트롤**
   - `ZoomControl`(확대/축소) 및 현위치 이동 버튼(커스텀) 우측 하단/상단 배치.

## Step 3: Phase 3 (UI/디자인 고도화)
1. **색상 테마 및 CSS Variables 적용**
   - `frontend/src/app/globals.css` 등에 Primary(#FF5A5F), Secondary(#6B4EFF), Accent(#00D09E) 컬러 변수를 적용.
   - 다크모드 대응을 위한 `@media (prefers-color-scheme: dark)` 블록 구성.
2. **바텀 시트 및 모달 디테일 보정**
   - Box-shadow 추가 (Elevation 강화).
   - 닫기 버튼, 카테고리 필터 등의 최소 터치 영역(padding) 44px 보장.
3. **아이콘 및 타이포그래피 정비**
   - 카메라 아이콘을 AI/Link 관련 `lucide-react` 아이콘으로 변경.
   - 텍스트 폰트 위계 및 명도 대비(대조비) 점검.
4. **카카오맵 커스텀 핀**
   - HTML/CSS 기반 커스텀 오버레이 또는 커스텀 마커 이미지(카테고리별) 적용.

## Execution Protocol
- 위 작업 단위별로 코드를 작성한 후, 격리 환경(로컬 개발 서버 등)에서 UI 변경 사항을 관찰(스냅샷/로그)하며 자가 수정을 거칩니다.
- 각 기능 완료 시점마다 본 문서의 완료 여부를 업데이트하거나 CHANGELOG를 작성합니다.
