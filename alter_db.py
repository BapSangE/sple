import asyncio
from src.database import engine
from sqlalchemy import text

async def run():
    queries = [
        ('ALTER TABLE users ADD COLUMN google_id VARCHAR UNIQUE;', 'google_id to users'),
        ('ALTER TABLE users ADD COLUMN last_login TIMESTAMP;', 'last_login to users'),
        ('ALTER TABLE places ADD COLUMN user_id INTEGER REFERENCES users(id);', 'user_id to places'),
        ('ALTER TABLE places ADD COLUMN memo TEXT;', 'memo to places'),
        ('ALTER TABLE places ADD COLUMN folder VARCHAR;', 'folder to places'),
    ]
    for query, desc in queries:
        try:
            async with engine.begin() as conn:
                await conn.execute(text(query))
            print(f"Added {desc}.")
        except Exception as e:
            print(f"Could not add {desc}: {e}")
            
if __name__ == "__main__":
    asyncio.run(run())
