import asyncio
import os
import sys

# src 경로 추가
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from main import extract_place_info
from dotenv import load_dotenv

async def test_extraction():
    # .env 로드
    load_dotenv()
    
    # 가상의 인스타그램 캡션 텍스트
    sample_text = """
    주말에 다녀온 성수동 카페 '어니언'! 
    공간도 넓고 팡도르가 너무 맛있었어요. 
    서울특별시 성동구 아차산로9길 8에 위치해 있어요. 강추!
    """
    
    print("--- AI 정보 추출 테스트 시작 (google-genai SDK) ---")
    result = await extract_place_info(sample_text)
    
    if result:
        print(f"추출 성공!")
        print(f"상호명: {result.get('name')}")
        print(f"주소: {result.get('address')}")
        print(f"설명: {result.get('description')}")
    else:
        print("추출 실패 (API 키 또는 모델 설정을 확인하세요)")

if __name__ == "__main__":
    asyncio.run(test_extraction())
