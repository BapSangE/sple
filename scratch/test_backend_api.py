# scratch/test_backend_api.py
# 백엔드 API 로직 시뮬레이션용 스크립트 (한국어 주석 포함)
import asyncio
import os
from dotenv import load_dotenv
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
import sys
sys.path.append('src')
from database import Place as DBPlace

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

async def test_list_places():
    if not DATABASE_URL:
        print("DATABASE_URL이 설정되어 있지 않습니다.")
        return

    engine = create_async_engine(
        DATABASE_URL,
        connect_args={"statement_cache_size": 0} if "postgresql" in DATABASE_URL else {}
    )
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    user_id = "108221389832145327547" # 구글 유저 식별자 ID
    print(f"조회할 user_id: {user_id}")

    async with async_session() as db:
        result = await db.execute(
            select(DBPlace)
            .where(DBPlace.user_id == user_id)
            .order_by(DBPlace.id.desc())
        )
        places = result.scalars().all()
        print(f"조회된 총 장소 개수: {len(places)}")
        
        for p in places:
            print(f"ID: {p.id} | 상호명: {p.name} | 주소: {p.address} | 위도: {p.latitude} | 경도: {p.longitude} | 상태: {p.geocoding_status}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_list_places())
