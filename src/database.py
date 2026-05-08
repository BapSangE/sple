from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
import os
from dotenv import load_dotenv

load_dotenv()

# Reboot: 서버에 데이터를 저장하지 않으므로 최소한의 엔진 설정만 유지 (향후 로그용 확장성 대비)
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

if not DATABASE_URL:
    DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sple.db")
    DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}"

engine = create_async_engine(
    DATABASE_URL, 
    echo=False,
    connect_args={"statement_cache_size": 0} 
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def init_db():
    # 현재는 테이블이 없으므로 통과
    pass

async def get_db():
    async with async_session() as session:
        yield session
