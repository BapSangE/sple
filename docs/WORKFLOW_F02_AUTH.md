# F-02 기능 구현 워크플로우: 사용자 인증 및 소셜 로그인 (Google)

본 문서는 스플(Sple) 서비스의 사용자별 개인화된 지도 경험을 제공하기 위한 사용자 인증(Authentication) 및 구글 로그인 연동 절차를 정의합니다.

## 1. 개요
- **기능 ID:** F-02
- **목표:** 사용자가 구글 계정을 통해 간편하게 로그인/회원가입하고, 본인만의 장소(핫플)를 저장 및 관리할 수 있도록 함.
- **인증 방식:** OAuth 2.0 기반 소셜 로그인 (Google) + JWT(JSON Web Token) 세션 관리

---

## 2. 구글 로그인 (OAuth 2.0) 연동

### [단계 1] Google Cloud Console 설정
1. **프로젝트 생성:** Google Cloud Console에서 새 프로젝트 생성.
2. **OAuth 동의 화면 구성:** 앱 이름(Sple), 사용자 지원 이메일, 개발자 연락처 정보 입력. 필요한 범위(Scope) 설정 (기본 profile, email).
3. **사용자 인증 정보(Credentials) 생성:** 'OAuth 클라이언트 ID' 생성.
   - 애플리케이션 유형: 웹 애플리케이션
   - 승인된 자바스크립트 원본: 프론트엔드 도메인 (예: `http://localhost:3000`, `https://sple.vercel.app`)
   - 승인된 리디렉션 URI: (예: `http://localhost:3000/api/auth/callback/google` 또는 백엔드 콜백 엔드포인트)
4. 발급받은 `Client ID`와 `Client Secret`을 환경 변수로 설정.

### [단계 2] 프론트엔드 (Next.js) 구현
- **라이브러리:** NextAuth.js (`next-auth`) 사용 권장, 또는 Google Identity Services SDK 사용.
- **로그인 UI:** 랜딩 페이지 및 메뉴에 '구글로 시작하기' 버튼 추가.
- **인증 상태 관리:** 전역 상태(Context/Zustand) 또는 NextAuth Session Provider를 이용해 로그인 유저 상태 유지.
- **API 통신:** 로그인 시 발급받은 액세스 토큰 또는 구글 프로필 정보를 백엔드 서버로 전송하여 인증.

### [단계 3] 백엔드 (FastAPI) 구현 및 검증
- **토큰 검증:** 프론트엔드에서 전달받은 구글 ID 토큰(ID Token)을 구글 API(`google-auth` 라이브러리)를 통해 서명 및 유효성 검증.
- **사용자 식별 및 가입:**
    - 검증된 페이로드에서 `email`, `name`, `picture`, `sub`(구글 고유 ID) 추출.
    - 데이터베이스 조회 후, 신규 사용자면 DB에 생성 (회원가입 처리), 기존 사용자면 로그인 처리.
- **JWT 발급:** 
    - 자체 액세스 토큰(Access Token) 및 리프레시 토큰(Refresh Token)을 생성하여 프론트엔드에 반환 (Set-Cookie 활용 권장).

---

## 3. 데이터베이스 설계 (User Model)

사용자 관리를 위해 기존 DB(또는 신규 스키마)에 User 테이블을 추가/수정합니다.

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT UNIQUE NOT NULL,  -- 구글 고유 식별자(sub)
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    profile_image TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- 기존 places 테이블에 user_id 외래키(Foreign Key) 추가
ALTER TABLE places ADD COLUMN user_id INTEGER REFERENCES users(id);
```

---

## 4. 데이터 보안 및 세션 규칙 (Mandatory)
- **토큰 보안:** 프론트엔드에서 JWT 토큰 저장 시 XSS 및 CSRF 공격을 방지하기 위해 가급적 `HttpOnly`, `Secure`, `SameSite` 속성이 적용된 쿠키(Cookie)를 사용.
- **데이터 격리:** API 요청(장소 저장, 목록 조회 등) 시 Authorization 헤더나 쿠키의 JWT를 검증하여 **해당 사용자의 데이터만** 반환하도록 권한(Authorization) 로직 철저히 분리.
- **HTTPS 필수:** OAuth 및 토큰 전송은 반드시 HTTPS(SSL/TLS) 환경에서만 이루어져야 함 (Vercel 및 AWS 배포 환경).

---

## 5. 작업 우선순위
1. **GCP 프로젝트 및 OAuth 자격증명 발급:** 환경 변수(`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) 세팅.
2. **User DB 스키마 업데이트:** 사용자 테이블 생성 및 기존 `places` 테이블과 릴레이션 연결.
3. **인증 로직 파이프라인 (Back & Front):** 구글 로그인 토큰 검증 및 자체 JWT 발급 API 구축.
4. **마이페이지/권한 분리:** 프론트엔드 화면에서 내 계정 정보 표시 및 "내 핫플"만 지도에 나타나도록 필터링 로직 추가.
