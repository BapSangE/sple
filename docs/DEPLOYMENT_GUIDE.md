# Sple(스플) 프로덕션 배포 가이드 (AWS & Domain)

본 문서는 `sple-insta.com` 도메인을 사용하여 AWS 환경에 서비스를 배포하고 설정하는 과정을 설명합니다.

---

## 1. 전제 조건 (Prerequisites)

- AWS 계정 및 Route 53 호스트 영역 설정 (`sple-insta.com`) (1년에 15 USD 발생)
- 카카오 개발자 센터 애플리케이션 등록 (자바 스크립트 SDK 도메인에 https://sple-insta.com 등록완료)
- Google Gemini API Key 확보 (확보 완료)

## 2. 인프라 구성 (Architecture)

- **Frontend:** Next.js (권장: Vercel 또는 AWS Amplify)
- **Backend:** FastAPI (권장: AWS EC2 또는 App Runner)
- **Database:** SQLite (파일 기반, 운영 규모 확대 시 RDS 권장)
- **SSL:** AWS Certificate Manager (ACM) - HTTPS 필수 (인증서 발급 완료)

---

## 3. 도메인 및 DNS 설정 (AWS Route 53)

Route 53 콘솔에서 다음 레코드를 생성하세요.

| 레코드 이름          | 유형 | 값 (예시)                    | 설명                 |
| :------------------- | :--- | :--------------------------- | :------------------- |
| `sple-insta.com`     | A    | `Vercel Alias` 또는 `ALB IP` | 프론트엔드 접속 주소 |
| `api.sple-insta.com` | A    | `EC2 Elastic IP`             | 백엔드 API 서버 주소 |

---

## 4. HTTPS (SSL) 활성화

**중요:** Geolocation 및 PWA 기능을 위해 `https`는 필수입니다.

1. AWS Certificate Manager(ACM)에서 `*.sple-insta.com` 및 `sple-insta.com` 인증서 요청.
2. 로드 밸런서(ALB) 또는 CloudFront에 인증서 적용.

---

## 5. 백엔드 배포 (FastAPI)

1. **환경 변수 설정 (`.env`):**
   ```env
   GEMINI_API_KEY=your_key
   FRONTEND_URL=https://sple-insta.com
   FB_VERIFY_TOKEN=your_token
   IG_PAGE_ACCESS_TOKEN=your_ig_token
   ```
2. **서버 실행:**
   ```bash
   # Gunicorn/Uvicorn 조합 권장 (EC2 기준)
   gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
   ```

---

## 6. 프론트엔드 배포 (Next.js)

1. **환경 변수 설정 (`.env.production`):**
   ```env
   NEXT_PUBLIC_KAKAO_API_KEY=your_kakao_js_key
   NEXT_PUBLIC_API_URL=https://api.sple-insta.com
   ```
2. **빌드 및 배포:**
   - Vercel 연동 시 깃허브 푸시만으로 자동 배포 가능.

---

## 7. 외부 플랫폼 최종 설정

### 7.1. 카카오 개발자 센터

- **[플랫폼 > Web]** 메뉴의 사이트 도메인에 아래 주소 추가:
  - `https://sple-insta.com`
  - `https://api.sple-insta.com`

### 7.2. 메타(Meta) 개발자 센터 (Instagram Webhook)

- **Webhook URL:** `https://api.sple-insta.com/api/webhook/instagram`
- **Verify Token:** 백엔드 `.env`에 설정한 `FB_VERIFY_TOKEN`과 일치시킴.
- **App Review:** `instagram_manage_messages` 권한 요청 및 승인 후 실서비스 가능.

---

## 8. 문제 해결 (FAQ)

- **지도가 안 보여요:** 카카오 설정에 `https` 도메인이 등록되었는지 확인하세요.
- **API 호출 실패 (CORS):** 백엔드 `main.py`의 `allow_origins`에 프론트엔드 주소가 정확히 입력되었는지 확인하세요.
- **위치가 안 잡혀요:** 반드시 `https` 보안 연결로 접속해야 브라우저에서 위치 정보를 제공합니다.

---

_최종 업데이트: 2026-04-22_
