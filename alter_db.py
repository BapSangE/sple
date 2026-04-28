import asyncio
from src.database import engine
from sqlalchemy import text

async def run():
    async with engine.begin() as conn:
        try:
            await conn.execute(text('ALTER TABLE users ADD COLUMN google_id VARCHAR UNIQUE;'))
            print("Added google_id to users.")
        except Exception as e:
            print("Could not add google_id:", e)
        
        try:
            await conn.execute(text('ALTER TABLE users ADD COLUMN last_login TIMESTAMP;'))
            print("Added last_login to users.")
        except Exception as e:
            print("Could not add last_login:", e)
            
        try:
            await conn.execute(text('ALTER TABLE places ADD COLUMN user_id INTEGER REFERENCES users(id);'))
            print("Added user_id to places.")
        except Exception as e:
            print("Could not add user_id to places:", e)
            
if __name__ == "__main__":
    asyncio.run(run())
