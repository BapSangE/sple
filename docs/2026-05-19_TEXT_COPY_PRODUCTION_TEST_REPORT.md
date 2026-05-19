# Sple Text-Copy Production Test Report

_작성일: 2026-05-19 KST_

## 현재 제품 방향

Meta Developer Center 기반 Instagram DM 자동 분석은 보류한다.
현재 운영 방향은 사용자가 Instagram 캡션, 맛집 소개 글, 주소가 포함된 텍스트를 직접 복사해 붙여넣고 Sple이 장소 후보를 추출하는 흐름이다.

핵심 사용자 흐름:

1. 사용자가 `/add`에서 텍스트를 붙여넣는다.
2. Vercel API Route `POST /api/analyze`가 AWS 백엔드 `POST /api/analyze`로 전달한다.
3. 백엔드가 Gemini/Vertex AI로 장소명과 주소를 추출한다.
4. 사용자가 로그인한 상태에서 선택한 장소를 저장한다.
5. `/saved`에서 개인 장소 목록을 확인하고 지도/네이버 지도로 이동한다.

## 운영 테스트 결과

### 1. 최초 상태

테스트 시작 시 운영 백엔드가 내려간 것처럼 보였다.

- `https://api.sple-insta.com/health`: `503 Service Temporarily Unavailable`
- `https://api.sple-insta.com/health/db`: 초기에는 503, 복구 후 200
- `https://sple-insta.com/api/analyze`: `500`, content-type 없음

원인:

- ECS 서비스는 `runningCount=1`이고 태스크는 정상 실행 중이었다.
- ALB HTTPS 리스너는 `ecs-gateway-tg-a362ae7f53ada14ce`로 라우팅 중이었다.
- 해당 타겟그룹에는 등록된 타겟이 없었다.
- 현재 healthy 타겟은 `ecs-gateway-tg-a375a790685ee2045`에 등록되어 있었다.

임시 복구:

- ALB HTTPS 리스너 기본 라우팅을 healthy 타겟그룹 `ecs-gateway-tg-a375a790685ee2045`로 전환했다.

복구 후 확인:

- `https://api.sple-insta.com/health`: 200
- `https://api.sple-insta.com/health/db`: 200
- `https://sple-insta.com/api/analyze`: 200
- 샘플 텍스트 `43번지 혼술바 경기 안산시 단원구 고잔1길 63` 분석 결과:
  - name: `43번지 혼술바`
  - address: `경기 안산시 단원구 고잔1길 63`

### 2. Playwright 운영 UI 테스트

테스트 대상:

- `https://www.sple-insta.com/add`
- `https://www.sple-insta.com/`
- `https://www.sple-insta.com/saved`
- `https://www.sple-insta.com/profile`
- `https://www.sple-insta.com/privacy`
- `https://www.sple-insta.com/data-deletion`

확인 결과:

- `/add`는 텍스트 복사 붙여넣기 중심 문구를 표시한다.
- 텍스트 입력 전 `AI 분석하기` 버튼은 disabled 상태다.
- 샘플 텍스트 입력 후 `AI 분석하기` 버튼이 활성화된다.
- 분석 후 결과 화면에 `43번지 혼술바`, `경기 안산시 단원구 고잔1길 63`이 표시된다.
- `/saved`는 비로그인 상태에서 로그인 안내를 표시한다.
- `/profile`은 Google 로그인 버튼을 표시한다.
- `/` 지도 화면은 Naver 지도 기본 UI를 렌더링한다.
- `/privacy`, `/data-deletion` 페이지는 정상 렌더링된다.
- 확인한 화면에서 브라우저 콘솔 error/warning은 발견되지 않았다.

제약:

- 현재 테스트 브라우저에 로그인 세션이 없어 실제 저장 `POST /api/places`와 로그인 후 `/saved` 목록 반영은 끝까지 검증하지 못했다.
- 저장 기능은 별도의 테스트 Google 계정 또는 사용자의 로그인 세션으로 재검증해야 한다.

## 실서비스 전 필수 보완 항목

### P0. 배포 후 ALB 타겟그룹 라우팅 문제 해결

현재 가장 큰 운영 리스크다.

증상:

- ECS 태스크는 정상인데 ALB 리스너가 비어 있는 타겟그룹을 바라보며 public API가 503이 된다.
- 2026-05-15에 한 번 발생했고, 2026-05-19에 재발했다.

필요 작업:

- GitHub Actions 또는 AWS 배포 구성을 점검해 배포 완료 후 ALB 리스너가 현재 healthy 타겟그룹을 바라보도록 자동화한다.
- 가능하면 ECS/CodeDeploy 블루그린 구성을 명확히 정리하고, 수동 `modify-listener`가 필요 없는 구조로 바꾼다.
- smoke test는 ECS 안정화만 보지 말고 public domain `https://api.sple-insta.com/health`, `/health/db`, `POST /api/analyze`까지 검증해야 한다.
- Docker image는 `latest`만 쓰지 말고 commit SHA 태그도 함께 push/deploy해 추적 가능하게 만든다.

### P0. 로그인 후 저장/리스트 전체 흐름 검증

현재 핵심 가치인 “분석한 장소를 저장하고 다시 보는 흐름”의 완전한 운영 검증이 필요하다.

필요 작업:

- 테스트용 Google 계정을 준비한다.
- 운영에서 `/add` 분석 → `모두 저장` → `/saved` 노출까지 확인한다.
- 저장 실패 시 사용자에게 실제 원인을 보여주는지 확인한다.
- 중복 저장, 빈 주소, 여러 장소 동시 저장 케이스를 확인한다.

### P0. 마이그레이션 체계 정리

현재는 Supabase SQL Editor 수동 실행과 SQLAlchemy `create_all`이 섞여 있다.

필요 작업:

- Alembic 또는 Supabase migration 기준을 하나로 정한다.
- `places.user_id`, `places.id` sequence, optional legacy columns 상태를 운영 DB에서 확정한다.
- 운영 스키마 확인 SQL과 migration 적용 순서를 문서화한다.
- `init_db()`의 `create_all`에 운영 스키마 관리를 기대하지 않도록 정리한다.

### P0. API 오류 처리 보강

`frontend/src/app/api/places/route.ts`는 백엔드 non-JSON 응답을 처리하지만, `frontend/src/app/api/analyze/route.ts`는 아직 백엔드 예외/HTML/빈 응답을 충분히 감싸지 않는다.

필요 작업:

- analyze route에도 places route와 같은 `forwardBackendJson` 패턴을 적용한다.
- 백엔드 AI 분석 실패 시 `status: error`, `code`, `message`를 일관되게 반환한다.
- 사용자가 보는 에러 메시지를 “서버 연결 실패”와 “장소 추출 실패”로 구분한다.

### P1. 지도 마커 기능 완성

현재 분석 결과는 주소 텍스트 중심이고, 지도 화면은 저장 장소 마커와 연결되어 있지 않다.

필요 작업:

- 주소를 위도/경도로 변환하는 geocoding 단계 추가.
- `places` 테이블에 `latitude`, `longitude`, `geocoding_status` 추가.
- 저장된 장소를 `/` 지도에 마커로 표시.
- 좌표 변환 실패 시 리스트에는 저장하되 지도에는 “주소 확인 필요” 상태로 표시.

### P1. 개인정보/약관 문구 최신화

현재 `/privacy`, `/data-deletion`에는 Meta/Instagram DM 처리 문구가 포함되어 있다.
DM 방향을 보류하고 텍스트 복사 붙여넣기만 운영한다면 실제 서비스 설명과 맞지 않는다.

필요 작업:

- 개인정보처리방침에서 “Sple Instagram 계정으로 보낸 DM” 표현을 제거하거나 “향후 제공 가능 기능”으로 분리한다.
- Meta 연동이 없는 동안에는 수집 항목을 Google 로그인 정보, 사용자가 붙여넣은 텍스트, 분석된 장소, 저장 장소로 좁힌다.
- 데이터 삭제 안내도 현재 운영 데이터 기준으로 수정한다.

상태:

- 2026-05-19에 `/privacy`, `/terms`, `/data-deletion` 문구를 텍스트 복사 붙여넣기 기준으로 수정했다.

### P1. AI 분석 품질과 비용 보호

사용자 입력이 그대로 AI에 전달되므로 비용, 속도, 오분석 문제가 발생할 수 있다.

필요 작업:

- 입력 길이 제한과 안내 문구 추가.
- 사용자/IP 기준 rate limit 추가.
- Gemini 응답을 JSON regex로만 파싱하지 말고 structured output 또는 schema validation으로 전환.
- 장소명만 있고 주소가 없는 경우, 여러 주소가 섞인 경우, 광고 문구가 긴 경우 테스트셋 추가.
- 같은 텍스트 재분석 캐시 또는 중복 저장 방지 검토.

### P1. 관측/알림 체계

이번 장애처럼 public API가 503이어도 ECS는 steady state로 보일 수 있다.

필요 작업:

- ALB 5xx, TargetGroup HealthyHostCount, ECS task restart, Vercel API 5xx 알림 추가.
- `/health`, `/health/db`, `/api/analyze` synthetic check를 주기적으로 실행.
- Gemini 오류율, 분석 latency, 저장 실패율을 로그/메트릭으로 남긴다.

### P2. 사용자 경험 개선

필요 작업:

- 비로그인 상태에서 `모두 저장` 클릭 시 native alert 대신 로그인 화면으로 자연스럽게 이동.
- 저장 성공/실패를 alert 대신 toast 또는 화면 상태로 표시.
- 분석 결과에서 장소 선택/해제 상태를 더 명확히 표시.
- 카테고리 `All/Cafe/Dining/Bar`는 현재 저장 데이터와 연결이 약하므로 자동 분류 또는 제거를 결정한다.

## 다음 권장 순서

1. ALB/배포 라우팅 재발 방지부터 해결한다.
2. 로그인 테스트 계정으로 저장/리스트 운영 E2E를 끝까지 검증한다.
3. analyze API 오류 처리를 보강한다.
4. 개인정보/데이터 삭제 문서를 텍스트 복사 붙여넣기 기준으로 수정한다.
5. geocoding과 지도 마커를 추가한다.
6. rate limit, 모니터링, AI 품질 테스트셋을 붙인다.
