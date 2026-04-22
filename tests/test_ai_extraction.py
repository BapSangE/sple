import asyncio
import os
import sys
import pytest

# src 경로 추가
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from main import extract_place_info
from dotenv import load_dotenv

@pytest.mark.asyncio
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
    
    assert result is not None
    assert isinstance(result, list)
    assert len(result) > 0
    first_place = result[0]
    assert "name" in first_place
    assert first_place["name"] == "어니언"
    assert "address" in first_place
    assert "서울특별시 성동구 아차산로9길 8" in first_place["address"]

if __name__ == "__main__":
    asyncio.run(test_extraction())
