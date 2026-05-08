# 🚀 Push 전 테스트 가이드 (Pre-push Testing Guide)

이 문서는 코드를 원격 저장소에 push하기 전, 서비스의 무결성을 보장하기 위해 반드시 수행해야 하는 테스트 및 검증 절차를 안내합니다.

## 1. 통합 검증 스크립트 사용 (권장)

프로젝트 루트에 모든 검증 단계를 자동으로 수행하는 스크립트가 준비되어 있습니다.

```bash
# Git Bash 또는 터미널에서 실행
bash scripts/verify.sh
```

**스크립트 수행 항목:**
1. **Frontend Lint:** UI 코드 스타일 및 잠재적 에러 검사
2. **Frontend Type Check:** TypeScript 타입 일치 여부 검사
3. **Backend Test:** API 및 AI 추출 로직 검증 (pytest)

---

## 2. 개별 테스트 방법

특정 부분만 수정했거나 상세 로그 확인이 필요한 경우 아래 명령어를 개별적으로 실행할 수 있습니다.

### 🎨 프론트엔드 (Frontend)
```bash
cd frontend

# 린트 체크
npm run lint

# 타입 체크
npx tsc --noEmit
```

### ⚙️ 백엔드 (Backend)
```bash
# 전체 테스트 실행
uv run pytest

# 상세 로그와 함께 실행 (print문 출력 포함)
uv run pytest -s
```

---

## 3. 사전 요구 사항 (Prerequisites)

테스트가 정상적으로 동작하려면 아래 설정이 완료되어 있어야 합니다.

1. **환경 변수 (.env):** 프로젝트 루트의 `.env` 파일에 필요한 API 키들이 설정되어 있어야 합니다.
2. **GCP 인증 파일:** Vertex AI 테스트를 위해 프로젝트 루트에 `insta-place-gcp.json` 파일이 존재해야 합니다.
3. **가상 환경:** 백엔드 테스트는 `uv`를 통해 관리되는 환경에서 실행됩니다.

---

## 4. 문제 해결 (Troubleshooting)

- **403 Forbidden (Gemini API):** API Key의 IP 제한 문제일 수 있습니다. `insta-place-gcp.json` 파일이 올바른지 확인하고 Vertex AI 모드로 동작 중인지 로그를 확인하세요.
- **BOM Error (pytest.ini):** `pytest.ini` 파일이 UTF-8 BOM으로 저장된 경우 발생합니다. 파일을 ASCII 또는 일반 UTF-8로 다시 저장하세요.
- **TypeScript Error:** 새로운 라이브러리를 설치했다면 `npm install`을 다시 실행하고, 타입 정의 파일이 포함되어 있는지 확인하세요.

---

모든 테스트가 **Pass** 된 것을 확인한 후 push를 진행해 주세요! ✅
