# WORKFLOW_F03: Supabase PostgreSQL 마이그레이션

## 1. 개요 (Overview)
기존 로컬 파일 기반의 SQLite (`sple.db`) 데이터베이스를 Supabase에서 제공하는 원격 PostgreSQL 데이터베이스로 전환합니다. 
이를 통해 서버리스 환경(Vercel)이나 다중 인스턴스 배포 시에도 일관된 데이터 영속성과 동시성 제어를 확보할 수 있습니다.

## 2. 세부 작업 단계 (Action Plan)

### Step 1: 환경 변수 설정
- 로컬 `.env` 파일과 프로덕션 환경(EC2, Vercel 등)에 Supabase 연결을 위한 환경 변수를 추가합니다.
  ```env
  # 예시
  DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
  ```

### Step 2: 의존성 패키지(Dependencies) 업데이트
- PostgreSQL과 연결하기 위한 파이썬 드라이버를 프로젝트에 추가합니다. FastAPI의 비동기적 특성을 살리기 위해 비동기 드라이버를 권장하지만, 기존 동기식 쿼리를 최소한으로 변경하려면 `psycopg2`가 유리할 수 있습니다.
  - **동기 방식 유지 시:** `uv add psycopg2-binary`
  - **비동기 방식(추천) 변경 시:** `uv add asyncpg`
  - (선택) ORM 도입 시: `uv add sqlalchemy`

### Step 3: 데이터베이스 초기화 및 스키마 문법 수정
- `src/main.py` 내의 `init_db()` 함수와 테이블 생성 문법을 PostgreSQL에 맞게 수정합니다.
  - `INTEGER PRIMARY KEY AUTOINCREMENT` ➡️ `SERIAL PRIMARY KEY` 또는 `BIGSERIAL PRIMARY KEY`
  - `REAL` ➡️ `DOUBLE PRECISION` 또는 `FLOAT` (PostgreSQL 호환)
  - 테이블 및 컬럼 존재 여부를 확인하는 로직(예: `ALTER TABLE ...`) 수정.

### Step 4: SQL 쿼리 파라미터 바인딩 수정
- 기존 SQLite에서 사용하던 파라미터 바인딩 기호(`?`)를 선택한 데이터베이스 드라이버에 맞춰 일괄 변경합니다.
  - `psycopg2`를 사용할 경우: `?` ➡️ `%s`
  - `asyncpg`를 사용할 경우: `?` ➡️ `$1`, `$2`, `$3`...

### Step 5: 반환 데이터 타입 파싱 수정
- SQLite의 `sqlite3.Row`를 딕셔너리로 변환하던 기존 로직(`[dict(row) for row in rows]`)을 새로운 드라이버의 반환(Response) 객체에 맞게 변환하는 로직으로 수정합니다.

### Step 6: 기존 데이터 이관 (Data Migration) - 필요 시
- 기존 `sple.db`에 이미 유의미한 데이터가 있다면, Python 스크립트를 하나 작성하여 SQLite에서 데이터를 읽어와 Supabase PostgreSQL로 밀어넣는(Insert) 작업을 수행합니다.

### Step 7: 연결 테스트 및 프로덕션 배포
- 로컬 환경에서 API 엔드포인트(`/api/places`, `/api/save-place` 등)가 Supabase와 정상적으로 통신하는지 검증합니다.
- 이상이 없으면 Github에 푸시하고 배포 환경(EC2)에서 새로운 환경변수를 등록한 뒤 서버를 재시작합니다.

## 3. 예상되는 변경 파일 목록
- `pyproject.toml` / `uv.lock` : 패키지 의존성 추가
- `.env.example` : 데이터베이스 환경 변수 양식 추가
- `src/main.py` : `sqlite3` 임포트 제거 및 PostgreSQL 연결 로직 반영
