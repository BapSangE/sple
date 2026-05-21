# scratch/recovery_prod_coordinates.py
# Supabase PostgreSQL 좌표 누락 데이터 복구 배치 스크립트 (한국어 주석 필수)
import asyncio
import os
import sys
from dotenv import load_dotenv
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
import httpx

sys.path.append('src')
from database import Place as DBPlace

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# 네이버 클라우드 API용 키 설정
CLIENT_ID = os.getenv("NEXT_PUBLIC_NAVER_CLIENT_ID")
CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")

async def geocode_via_naver(address: str) -> tuple[float | None, float | None]:
    if not CLIENT_ID or not CLIENT_SECRET:
        return None, None
        
    url = "https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode"
    headers = {
        "X-NCP-APIGW-API-KEY-ID": CLIENT_ID,
        "X-NCP-APIGW-API-KEY": CLIENT_SECRET,
        "Accept": "application/json"
    }
    params = {"query": address}
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as http_client:
            response = await http_client.get(url, headers=headers, params=params)
            if response.status_code == 200:
                res_json = response.json()
                addresses = res_json.get("addresses", [])
                if addresses:
                    addr_info = addresses[0]
                    return float(addr_info["y"]), float(addr_info["x"])
    except Exception as e:
        print(f"[ERROR] {address} 지오코딩 중 에러: {e}")
    return None, None

async def main():
    if not DATABASE_URL:
        print("DATABASE_URL이 설정되어 있지 않습니다.")
        return

    print("--- Supabase PostgreSQL 누락 좌표 복구 배치 구동 ---")
    print(f"원격 데이터베이스 연결: {DATABASE_URL}")
    print(f"네이버 Client ID: {CLIENT_ID}")
    print(f"네이버 Client Secret 보유 여부: {'예' if CLIENT_SECRET else '아니오'}")

    engine = create_async_engine(
        DATABASE_URL,
        connect_args={"statement_cache_size": 0} if "postgresql" in DATABASE_URL else {}
    )
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        # 1. 위도/경도가 누락되었거나 지오코딩 실패 상태인 레코드들 조회
        query = select(DBPlace).where(
            (DBPlace.latitude == None) | (DBPlace.longitude == None) | (DBPlace.geocoding_status == 'failed')
        )
        result = await db.execute(query)
        target_places = result.scalars().all()
        print(f"복구 대상 장소 개수: {len(target_places)}")

        if not target_places:
            print("복구 대상 장소가 없습니다. 이미 완벽히 연동되어 있는 상태입니다.")
            await engine.dispose()
            return

        if not CLIENT_SECRET:
            print("[WARNING] NAVER_CLIENT_SECRET이 없어서 실제 API를 활용한 원격 좌표 채우기는 수행하지 못합니다.")
            print("하지만 대상 목록은 다음과 같으며, 추후 .env에 Secret 설정 후 즉시 실행 가능합니다:")
            for p in target_places:
                print(f" - ID: {p.id} | 상호명: {p.name} | 주소: {p.address}")
            await engine.dispose()
            return

        # 2. 각 장소 복구 시작
        success_count = 0
        for p in target_places:
            if not p.address:
                print(f" - ID: {p.id} | 상호명: {p.name} | 주소가 비어 있어 복구 불가능.")
                continue

            print(f" - ID: {p.id} | 상호명: {p.name} | 주소: {p.address} | 복구 시도 중...")
            lat, lng = await geocode_via_naver(p.address)
            
            if lat is not None and lng is not None:
                p.latitude = lat
                p.longitude = lng
                p.geocoding_status = 'resolved'
                success_count += 1
                print(f"   => [성공] 위도: {lat}, 경도: {lng}")
            else:
                print(f"   => [실패] 지오코딩 좌표 응답 실패")

        # 3. 데이터베이스 커밋
        if success_count > 0:
            await db.commit()
            print(f"\n[완료] 총 {success_count}개의 장소가 데이터베이스에 성공적으로 복구 및 저장되었습니다!")
        else:
            print("\n[알림] 새로 복구된 장소가 없습니다.")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
