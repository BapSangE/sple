# Sple Production Hardening Progress

_작성일: 2026-05-19 KST_

## 기준 방향

Meta Developer Center 기반 Instagram DM 자동 분석은 현재 보류한다.
실서비스 기준 MVP는 텍스트 복사 붙여넣기 분석이다.

핵심 흐름:

1. 사용자가 Instagram 캡션, 맛집 소개 글, 주소가 포함된 텍스트를 복사한다.
2. `/add`에 붙여넣고 AI 분석을 실행한다.
3. 추출된 장소 후보를 선택한다.
4. Google 로그인 상태에서 장소를 저장한다.
5. `/saved`에서 저장된 장소를 확인한다.
6. 지도 또는 네이버 지도 링크로 위치를 확인한다.

## 이번에 처리한 보완

### 1. AWS ALB 라우팅 재발 방지 보강

문제:

- ECS 서비스는 정상 실행 중이어도 ALB HTTPS 리스너가 빈 타겟그룹을 바라보면 `https://api.sple-insta.com`이 503을 반환한다.
- 이 문제가 2026-05-15, 2026-05-19에 반복 발생했다.

조치:

- GitHub Actions 배포 workflow에 배포 후 ALB 리스너 보정 단계를 추가했다.
- 배포 후 현재 실행 중인 ECS 태스크의 private IP를 조회한다.
- ALB에 연결된 타겟그룹 중 해당 태스크 IP가 `healthy`로 등록된 타겟그룹을 찾는다.
- HTTPS 리스너가 다른 타겟그룹을 보고 있으면 자동으로 healthy 타겟그룹으로 전환한다.
- Docker image는 `latest`뿐 아니라 commit SHA 태그로도 push하고, ECS task definition에는 commit SHA 태그를 사용하도록 변경했다.

사용자가 확인할 것:

1. GitHub에 push한 뒤 Actions의 `Sple Backend Deploy`가 성공하는지 확인한다.
2. Actions 로그에서 `Align ALB listener to running ECS task target group` 단계가 성공했는지 확인한다.
3. 배포 후 브라우저 또는 터미널에서 아래 URL이 열리는지 확인한다.

```text
https://api.sple-insta.com/health
https://api.sple-insta.com/health/db
```

정상 응답:

```json
{"status":"ok","service":"sple-backend"}
{"status":"ok","database":"reachable"}
```

GitHub Actions IAM 권한:

`Align ALB listener to running ECS task target group` 단계는 기존 ECS/ECR 권한 외에 아래 권한이 필요하다.
이 권한이 없으면 AWS CLI가 `exit code 254`로 실패할 수 있다.

```json
{
  "Effect": "Allow",
  "Action": [
    "sts:GetCallerIdentity",
    "ecs:ListTasks",
    "ecs:DescribeTasks",
    "elasticloadbalancing:DescribeTargetGroups",
    "elasticloadbalancing:DescribeTargetHealth",
    "elasticloadbalancing:DescribeListeners",
    "elasticloadbalancing:ModifyListener"
  ],
  "Resource": "*"
}
```

확인 위치:

1. AWS Console 접속.
2. IAM으로 이동.
3. GitHub Actions에서 쓰는 `AWS_ACCESS_KEY_ID`의 IAM User 또는 Role을 찾는다.
4. 위 권한이 포함된 policy를 추가한다.
5. 다시 GitHub Actions를 재실행한다.

### 2. 분석 API 오류 처리 보강

문제:

- 백엔드가 503, HTML, 빈 응답을 반환하면 Vercel `POST /api/analyze`가 JSON 파싱 단계에서 깨질 수 있었다.
- 사용자는 “서버 연결 실패” 정도만 보게 되어 원인 구분이 어려웠다.

조치:

- `frontend/src/app/api/analyze/route.ts`에 백엔드 응답 보호 로직을 추가했다.
- 잘못된 JSON 요청은 `INVALID_JSON`으로 반환한다.
- 백엔드 빈 응답은 `BACKEND_EMPTY_RESPONSE`으로 반환한다.
- 백엔드 non-JSON 응답은 `BACKEND_BAD_RESPONSE`으로 반환한다.
- 백엔드 네트워크 실패는 `BACKEND_UNREACHABLE`으로 반환한다.

사용자가 확인할 것:

1. Vercel 배포 후 `/add`에서 텍스트 분석을 실행한다.
2. 정상 텍스트는 결과 화면으로 이동해야 한다.
3. 백엔드가 일시적으로 죽어도 브라우저가 흰 화면으로 깨지지 않고 에러 메시지가 보여야 한다.

### 3. 개인정보/약관/데이터 삭제 문구 정리

문제:

- `/privacy`, `/data-deletion`, `/terms`에 Instagram DM 연동 문구가 남아 있었다.
- 현재 실제 서비스 방향은 DM이 아니라 텍스트 복사 붙여넣기다.

조치:

- 개인정보처리방침에서 DM, Meta 메시지 연동 표현을 제거했다.
- 데이터 삭제 안내에서 Instagram 메시지 계정 확인 문구를 제거했다.
- 약관의 서비스 목적을 “직접 붙여넣은 Instagram 캡션, 맛집 소개 글, 주소 포함 텍스트” 기준으로 수정했다.

사용자가 확인할 URL:

```text
https://www.sple-insta.com/privacy
https://www.sple-insta.com/terms
https://www.sple-insta.com/data-deletion
```

Vercel 배포 후 위 페이지가 열리고, DM 관련 표현이 보이지 않는지 확인한다.

## 사용자가 직접 확인해야 하는 핵심 E2E

아래 검증은 Google 로그인 세션이 필요해서 사용자가 직접 확인해야 한다.

### 준비

1. Vercel 배포와 GitHub Actions backend 배포가 모두 끝났는지 확인한다.
2. 브라우저에서 기존 Sple 탭을 새로고침한다.
3. 가능하면 시크릿 창이 아니라 평소 Google 로그인이 가능한 브라우저를 사용한다.

### 로그인 확인

1. `https://www.sple-insta.com/profile` 접속.
2. `Google로 계속하기` 클릭.
3. Google 계정 선택.
4. 로그인 후 프로필 화면에 이름 또는 이메일이 표시되는지 확인.

실패 시 확인할 것:

- Vercel 환경변수 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`
- Google OAuth 승인된 리디렉션 URI:

```text
https://www.sple-insta.com/api/auth/callback/google
https://sple-insta.com/api/auth/callback/google
```

현재 사용 중인 실제 도메인이 `www`인지 non-`www`인지에 따라 둘 다 넣어두는 편이 안전하다.

### 분석 확인

1. `https://www.sple-insta.com/add` 접속.
2. 아래 샘플 텍스트를 붙여넣는다.

```text
가볍게 즐기기 좋은
43번지 혼술바
안산 중앙동에 오픈
지금 오픈이벤트로 발렌타인이 잔 당 900원 무제한
경기 안산시 단원구 고잔1길 63
매일영업 19시-03시
```

3. `AI 분석하기` 클릭.
4. 결과 화면에 아래처럼 표시되는지 확인.

```text
43번지 혼술바
경기 안산시 단원구 고잔1길 63
```

실패 시 확인할 것:

- `https://api.sple-insta.com/health`
- `https://api.sple-insta.com/health/db`
- Vercel `BACKEND_API_URL=https://api.sple-insta.com`
- Vercel `BACKEND_API_KEY`와 AWS/GitHub Actions `BACKEND_API_KEY`가 같은 값인지

### 저장 확인

1. 분석 결과 화면에서 `모두 저장 (1)` 클릭.
2. 저장 성공 안내가 표시되는지 확인.
3. 자동으로 `/saved`로 이동하거나, 하단 `리스트` 탭을 누른다.
4. 저장된 장소 목록에 `43번지 혼술바`가 보이는지 확인.
5. 해당 장소를 눌러 상세 시트가 열리는지 확인.
6. `네이버 지도로 확인하기` 또는 `네이버 지도로 보기` 버튼이 열리는지 확인.

실패 시 화면별 의미:

- `로그인이 필요합니다`: 세션이 없거나 NextAuth session에 `user.id`가 없는 상태.
- `장소 저장 서버에 연결하지 못했습니다`: Vercel에서 AWS 백엔드 접근 실패.
- `장소 저장 처리 중 백엔드 오류가 발생했습니다`: AWS 백엔드는 응답했지만 DB insert 등에서 실패.
- 저장 성공처럼 보였는데 리스트가 비어 있음: 저장 요청 실패가 숨겨졌거나, `user_id`가 저장/조회에서 다르게 쓰였을 가능성.

### 리스트 확인

1. `/saved` 접속.
2. 검색창에 `43번지` 입력.
3. 결과가 유지되는지 확인.
4. `All`, `Cafe`, `Dining`, `Bar` 필터를 눌러본다.

주의:

- 현재 저장 시 category 기본값은 `All`이다.
- AI가 카테고리를 분류하지 않으므로 `Cafe/Dining/Bar` 필터는 실제 서비스 전 정리 대상이다.

## 아직 남은 보완

### P0

- 로그인 후 저장/리스트 운영 E2E를 실제 계정으로 확인.
- GitHub Actions 재배포 후 ALB listener 자동 보정이 재발 없이 동작하는지 확인.
- Supabase 운영 `places` 스키마 최종 상태 확인.

### P1

- 주소 geocoding 추가 후 지도에 저장 장소 마커 표시.
- AI 분석 입력 길이 제한과 rate limit 추가.
- Gemini 응답을 JSON regex 파싱이 아니라 schema 기반 파싱으로 전환.
- 분석/저장 실패율 모니터링 추가.

### P2

- alert 기반 저장 UX를 toast 또는 화면 상태로 변경.
- 비로그인 저장 클릭 시 profile 이동 또는 로그인 CTA 표시.
- 카테고리 필터를 실제 저장 데이터와 맞게 재설계.
