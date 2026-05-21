# scratch/inspect_supabase.py
# Supabase PostgreSQL places 테이블 구조 확인용 스크립트 (한국어 주석 포함)
import asyncio
import os
from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

async def main():
    if not DATABASE_URL:
        print("DATABASE_URL이 환경 변수에 설정되어 있지 않습니다.")
        return

    print(f"연결할 DB URL: {DATABASE_URL}")
    engine = create_async_engine(DATABASE_URL, connect_args={"statement_cache_size": 0})
    
    async with engine.connect() as conn:
        # 1. places 테이블 정보 확인
        try:
            print("\n--- places 테이블의 컬럼 정보 ---")
            query = text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'places';
            """)
            result = await conn.execute(query)
            columns = result.fetchall()
            if not columns:
                print("places 테이블이 존재하지 않거나 컬럼이 없습니다.")
            for col in columns:
                print(f"컬럼명: {col[0]:<20} | 타입: {col[1]:<15} | 널 허용여부: {col[2]}")
        except Exception as e:
            print(f"컬럼 조회 실패: {e}")

        # 2. 저장된 데이터 샘플 확인
        try:
            print("\n--- 최근 저장된 데이터 샘플 (최대 5개) ---")
            query_data = text("SELECT * FROM places ORDER BY id DESC LIMIT 5;")
            result_data = await conn.execute(query_data)
            rows = result_data.fetchall()
            keys = result_data.keys()
            for row in rows:
                row_dict = dict(zip(keys, row))
                print(row_dict)
        except Exception as e:
            print(f"데이터 조회 실패: {e}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
