import asyncio
import httpx
import sys

async def main():
    async with httpx.AsyncClient() as client:
        try:
            data = {"url": "주말에 성수동 카페 어니언을 다녀왔습니다. 맛있는 빵이 많았어요!"}
            response = await client.post("http://127.0.0.1:8000/api/add-place", json=data)
            sys.stdout.buffer.write(f"{response.status_code}\n".encode())
            sys.stdout.buffer.write(response.content)
            sys.stdout.buffer.write(b"\n")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
