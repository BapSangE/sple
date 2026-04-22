import httpx
import asyncio
import json
import pytest

@pytest.mark.asyncio
async def test_parse():
    url = "http://localhost:8000/api/analyze"
    # 예시: 인스타그램 게시물 텍스트 (주소가 포함된 가상의 데이터)
    payload = {
        "url": "성수동 핫플 '대림창고' 방문했어요! 주소는 서울 성동구 성수이로 78 입니다. 분위기 최고!"
    }
    
    print(f"Testing search with payload: {payload}")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=20.0)
            print(f"Status Code: {response.status_code}")
            print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    except Exception as e:
        print(f"Error during test: {e}")

if __name__ == "__main__":
    asyncio.run(test_parse())
