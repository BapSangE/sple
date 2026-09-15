import os
import pytest
import tempfile
import sys
import pytest_asyncio
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

# 테스트가 database 모듈을 로드하기 전에 DATABASE_URL을 테스트 전용 로컬 SQLite 파일로 강제 주입(Override)합니다.
# 이를 통해 실제 상용/개발 Supabase DB에 테스트 DDL이나 더미 데이터가 유입되는 것을 차단하고 트랜잭션 충돌을 방지합니다.
TEST_DB_DIR = tempfile.TemporaryDirectory(prefix="sple-tests-")
TEST_DB_PATH = Path(TEST_DB_DIR.name) / "test.db"
os.environ["APP_ENV"] = "development"
os.environ["ALLOW_INSECURE_LOCAL_AUTH"] = "true"
os.environ.pop("BACKEND_API_KEY", None)
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{TEST_DB_PATH}"

@pytest.fixture(autouse=True)
def setup_env(monkeypatch):
    import main
    from ai_extraction import analysis_limiter
    main.client = None
    analysis_limiter.started.clear()
    analysis_limiter.active = 0
    for key in ("NEXT_PUBLIC_NAVER_CLIENT_ID", "NAVER_CLIENT_SECRET", "NAVER_SEARCH_CLIENT_ID", "NAVER_SEARCH_CLIENT_SECRET"):
        monkeypatch.delenv(key, raising=False)
    # 테스트 환경을 위한 인스타-GCP 서비스 계정 환경 변수 자동 설정
    root_dir = Path(__file__).resolve().parent.parent
    sa_path = root_dir / "insta-place-gcp.json"
    if sa_path.exists():
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(sa_path)

@pytest.fixture(scope="session", autouse=True)
def cleanup_test_db():
    yield
    # 테스트 세션(Session)이 최종 종료된 후 잔여 로컬 SQLite DB 파일을 깔끔하게 정리(Cleanup)합니다.
    for suffix in ["", "-journal", "-wal", "-shm"]:
        file_path = TEST_DB_PATH.parent / (TEST_DB_PATH.name + suffix)
        if file_path.exists():
            try:
                os.remove(file_path)
            except Exception:
                pass


@pytest_asyncio.fixture(autouse=True)
async def dispose_test_connections():
    yield
    from database import engine
    await engine.dispose()
