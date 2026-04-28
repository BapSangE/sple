import httpx
import asyncio

async def test():
    async with httpx.AsyncClient(base_url="https://api.sple-insta.com") as client:
        res = await client.post("/api/auth/google", json={"id_token": "dummy_invalid_token"})
        print("Status:", res.status_code)
        print("Body:", res.text)

if __name__ == "__main__":
    asyncio.run(test())