# F-01 기능 구현 워크플로우: 인스타그램 링크 수집 (Share Intent & DM)

본 문서는 인스타그램 게시물을 스플(Sple) 서비스로 수집하기 위한 두 가지 핵심 채널의 구현 절차를 정의합니다.

## 1. 개요
- **기능 ID:** F-01
- **목표:** 사용자가 인스타그램 앱을 벗어나지 않고 최소한의 액션으로 장소 URL을 스플 서버로 전송하도록 함.
- **채널 1 (Share Intent):** 모바일 브라우저/PWA의 '공유하기' 기능을 통해 수신.
- **채널 2 (Instagram DM):** 스플 비즈니스 계정으로 게시물을 공유하면 Webhook을 통해 수집.

---

## 2. 채널 1: Web Share Target (PWA 기반 Share Intent)
모바일 웹 환경에서 '공유 대상'으로 등록되어 URL을 수신하는 방식입니다.

### [단계 1] Manifest 설정
- `public/manifest.json` 파일에 `share_target` 속성을 정의합니다.
- 사용자가 공유하기를 누를 때 데이터를 넘겨받을 엔드포인트(Endpoint)를 지정합니다.
```json
"share_target": {
  "action": "/share-target",
  "method": "GET",
  "params": {
    "title": "title",
    "text": "text",
    "url": "url"
  }
}
```

### [단계 2] 수신 엔드포인트 구현 (FastAPI)
- `/share-target` 경로로 들어오는 GET 요청에서 URL을 추출합니다.
- 수집된 URL을 기존 AI 추출 파이프라인(`/api/add-place`)으로 전달합니다.

---

## 3. 채널 2: Instagram DM Webhook 수집
사용자가 스플 공식 계정으로 게시물을 DM으로 보냈을 때 서버가 즉시 인지하고 처리하는 방식입니다.

### [단계 1] Meta Developer 설정
1. **Facebook 앱 생성:** 'Instagram Graph API' 제품 추가.
2. **페이지 연동:** Facebook 페이지와 인스타그램 비즈니스 계정 연결.
3. **권한 획득:** `instagram_manage_messages` 권한 승인 필요.

### [단계 2] Webhook 서버 구현 (FastAPI)
- **검증 엔드포인트:** Meta의 허브 챌린지(Hub Challenge)를 처리하여 Webhook을 활성화합니다.
- **메시지 처리 엔드포인트:** 
    - 사용자가 공유한 'Post' 또는 'Story Share' 이벤트 감지.
    - 메시지 본문 내 `https://www.instagram.com/...` 패턴의 URL 추출.

### [단계 3] DM 자동 답장 (UX 완성)
- 데이터 저장이 완료되면 `POST /{ig-post-id}/messages` API를 호출하여 사용자에게 확인 답장을 보냅니다.
- "스크랩 완료! 지도에서 확인하세요: [링크]"

---

## 4. 데이터 보안 규칙 (Mandatory)
- **No Scraping:** 사용자의 계정/비밀번호를 요구하는 RPA 크롤링은 절대 금지합니다.
- **ID 매핑:** DM으로 들어온 IGSID(인스타그램 사용자 ID)를 F-05 소셜 로그인 구현 시 스플 계정과 자동 매핑합니다.

---

## 5. 작업 우선순위
1. **PWA 기본 설정:** 서비스 워커 및 Manifest 적용 (Share Intent 대응).
2. **Webhook 보일러플레이트:** Meta 서버와의 통신 확인.
3. **URL 파싱 로직 고도화:** 메시지 내 파편화된 링크 추출.
