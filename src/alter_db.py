import asyncio
from database import engine
from sqlalchemy import text

async def run():
    dialect = engine.dialect.name
    print(f"Detected database dialect: {dialect}")
    
    # 컬럼 추가 쿼리 리스트
    # (테이블명, 컬럼명, 타입/제약조건, 설명)
    columns_to_add = [
        # Users table
        ('users', 'google_id', 'VARCHAR(255)', 'google_id to users'),
        ('users', 'last_login', 'TIMESTAMP', 'last_login to users'),
        ('users', 'profile_image', 'VARCHAR(500)', 'profile_image to users'),
        
        # Places table
        ('places', 'user_id', 'INTEGER', 'user_id to places'),
        ('places', 'user_email', 'VARCHAR(255)', 'user_email to places'),
        ('places', 'memo', 'TEXT', 'memo to places'),
        ('places', 'folder', 'VARCHAR(255)', 'folder to places'),
        ('places', 'image_url', 'VARCHAR(500)', 'image_url to places'),
        ('places', 'detailed_highlights', 'TEXT', 'detailed_highlights to places'),
    ]

    for table, column, col_type, desc in columns_to_add:
        # PostgreSQL은 IF NOT EXISTS 지원 (9.6+)
        if dialect == 'postgresql':
            query = f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {col_type};"
        else:
            query = f"ALTER TABLE {table} ADD COLUMN {column} {col_type};"
        
        try:
            # 개별 쿼리마다 새로운 트랜잭션 시작 (begin() 사용 시 자동 커밋/롤백)
            async with engine.begin() as conn:
                await conn.execute(text(query))
            print(f"Successfully processed {desc}.")
        except Exception as e:
            # 이미 컬럼이 존재하는 경우 등의 에러는 무시
            if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                print(f"Skipped {desc} (already exists).")
            else:
                print(f"Could not add {desc}: {e}")
            
if __name__ == "__main__":
    asyncio.run(run())
