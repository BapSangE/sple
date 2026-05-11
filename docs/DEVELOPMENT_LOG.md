# Sple(스플) 프로젝트 개발 기록 (Development Log)

본 문서는 인스타그램 맛집 수집 및 AI 기반 장소 관리 서비스 **Sple**의 초기 구축부터 최종 디자인 폴리싱까지의 전체 개발 과정을 기록한 문서입니다.

## 1. 프로젝트 개요

- **서비스명:** Sple (스플 - 나만의 핫플 지도)
- **핵심 가치:** 인스타그램의 감성적인 맛집 정보를 AI로 정밀 분석하여 나만의 지도에 데이터화하여 저장
- **주요 타겟:** 인스타그램 게시물을 보고 저장만 해두고 실제 방문 시 장소를 찾기 어려워하는 사용자

## 2. 기술 스택 (Tech Stack)

### Backend

- **Framework:** FastAPI (Python)
- **Database:** SQLite3
- **AI Engine:** Google Gemini 2.5 Flash (Place Info Extraction & Geocoding Inference)
- **Scraping:** BeautifulSoup4, HTTPX, Jina Reader API

### Frontend

- **Framework:** Next.js 15 (App Router, TypeScript)
- **Styling:** Tailwind CSS v4 (Stitch DNA Identity)
- **Animation:** Framer Motion
- **Map:** Kakao Maps SDK (react-kakao-maps-sdk)
- **Icons:** Lucide React

---

## 3. 주요 개발 마일스톤

### 1단계: 프로젝트 구조 현대화 및 프론트엔드 전환

- **ReactNative에서 Next.js로 마이그레이션:** 웹/PWA 환경에서의 범용성 및 '공유하기(Share Intent)' 접근성을 높이기 위해 프레임워크 전격 교체.
- **Next.js 15 + Tailwind v4 셋업:** 최신 프레임워크 환경 구축 및 Sple 고유 컬러 시스템(Primary Coral, Secondary Purple) 정의.

### 2단계: AI 기반 장소 수집 파이프라인 구축

- **인스타그램 메타데이터 추출:** 게시물 링크로부터 본문 텍스트를 안정적으로 낚아채는 멀티 채널 스크래핑 로직 구현.
- **Gemini AI 정밀 분석:** 텍스트에서 상호명, 주소, 카테고리뿐만 아니라 **위도/경도(lat, lng) 좌표**와 **매력 포인트(AI Highlights)**를 스스로 유추하는 고도화된 프롬프트 설계.
- **자동 저장 API:** 분석된 결과를 검토 후 즉시 DB에 반영하는 프로세스 완성.

### 3단계: 지도 중심 사용자 경험(UX) 구현

- **내 위치 기반 지도:** Geolocation API를 연동하여 앱 접속 시 사용자의 현재 위치를 중심으로 지도가 자동 정렬되도록 구현.
- **동적 필터링 시스템:**
  - 지도가 멈췄을 때 현재 화면 반경 내의 장소만 리스트에 노출하는 'Bounds Filtering'.
  - 7가지 카테고리별 실시간 필터 칩(Pill) UI 연동.
- **외부 지도 시너지:** 네이버/카카오 지도 상세 정보 및 길찾기 페이지로 바로 연결되는 딥링크 생성 로직(주소 정제 포함) 탑재.

### 4단계: 멀티 채널 수집 채널 확장

- **PWA Share Target:** 인스타그램 앱에서 '공유하기' 시 자동으로 Sple 앱이 열리며 분석이 시작되는 Seamless UX 구축.
- **Instagram DM Webhook:** 메타(Meta) 플랫폼과 연동하여 공식 계정 DM으로 게시물을 보내면 백엔드에서 자동 수집 및 저장하는 시스템 설계 및 시뮬레이션 환경 구축.

### 5단계: 디자인 폴리싱 및 브랜드 감성 강화 (Stitch DNA)

- **Premium Marker:** 물방울 모양의 커스텀 핀과 선택 시 강조되는 애니메이션 적용.
- **Glassmorphism:** 상단 헤더에 유리 질감의 블러 효과를 주어 세련된 공간감 연출.
- **Micro-Interactions:** 리스트 등장 시의 순차적 모션(Staggered), FAB 버튼의 3중 그라데이션 및 햅틱 효과 등 디테일 보강.

---

## 4. 최종 점검 결과

- **정상 작동:** AI 분석, 지도 시각화, 실시간 검색, 외부 앱 연동, PWA 대응.
- **코드 품질:** 백엔드 순수 API 서버화 완료, 프론트엔드 프로덕션 빌드 최적화(`npm run build` 성공).
- **보안/안정성:** CORS 설정 완료, DB Context Manager 도입으로 커넥션 안정성 확보.

## 5. 향후 과제 (Future Roadmap)

- 실제 도메인 배포 및 메타 Webhook 공식 권한 획득.
- 지도를 길게 눌러 직접 장소를 추가하는 'Manual Pin' 기능.
- 저장된 장소들에 대한 개인화된 AI 큐레이션 추천 시스템.

---

_기록 일자: 2026-04-22_
_작성자: Gemini CLI Agent_
