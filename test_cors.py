import httpx
import jwt
import asyncio
from datetime import datetime, timedelta, timezone

async def test():
    # 1. Generate token
    JWT_SECRET = "super-secret-key-change-me-later"
    ALGORITHM = "HS256"
    expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    token = jwt.encode({"sub": "1", "email": "test@example.com", "exp": expire}, JWT_SECRET, algorithm=ALGORITHM)
    print(f"Token: {token}")

    # 2. Make request to POST /api/save-place
    async with httpx.AsyncClient(base_url="https://api.sple-insta.com") as client:
        # Preflight OPTIONS
        headers = {
            "Origin": "https://www.sple-insta.com",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type"
        }
        res = await client.options("/api/save-place", headers=headers)
        print("OPTIONS status:", res.status_code)
        print("OPTIONS headers:", res.headers)

        # POST request
        headers = {
            "Origin": "https://www.sple-insta.com",
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        data = {
            "name": "Test Place",
            "address": "Test Address",
            "description": "Test Desc",
            "url": "http://test.com"
        }
        res = await client.post("/api/save-place", json=data, headers=headers)
        print("POST status:", res.status_code)
        print("POST response:", res.text)

if __name__ == "__main__":
    asyncio.run(test())
