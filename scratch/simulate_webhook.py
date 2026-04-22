import httpx
import asyncio
import json

async def simulate_instagram_dm():
    """메타(Meta) 서버가 보내는 Webhook 페이로드를 흉내내어 로컬 서버로 전송합니다."""
    url = "http://localhost:8000/api/webhook/instagram"
    
    # 가상의 인스타그램 DM 페이로드 (공유 게시물 형태)
    mock_payload = {
        "object": "instagram",
        "entry": [
            {
                "id": "INSTAGRAM_PAGE_ID",
                "time": 1713783600,
                "messaging": [
                    {
                        "sender": {"id": "USER_IG_ID_123"},
                        "recipient": {"id": "YOUR_PAGE_ID"},
                        "timestamp": 1713783600,
                        "message": {
                            "mid": "m_123456789",
                            "attachments": [
                                {
                                    "type": "share",
                                    "payload": {
                                        "url": "https://www.instagram.com/p/C58v6xSre6_/" # 예시 게시물 (어니언 성수 등)
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        ]
    }
    
    print("--- 인스타그램 DM Webhook 시뮬레이션 시작 ---")
    print(f"대상 URL: {url}")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=mock_payload, timeout=30.0)
            print(f"상태 코드: {response.status_code}")
            print(f"서버 응답: {response.json()}")
            
            if response.status_code == 200:
                print("\n✅ 시뮬레이션 요청 성공!")
                print("백엔드 터미널 로그를 확인하여 AI 분석 및 DB 저장이 진행되었는지 확인하세요.")
            else:
                print("\n❌ 서버가 에러를 반환했습니다.")
                
    except Exception as e:
        print(f"\n❌ 에러 발생: {e}")

if __name__ == "__main__":
    asyncio.run(simulate_instagram_dm())
