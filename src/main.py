from contextlib import asynccontextmanager
import asyncio
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
import os
import logging
from dotenv import load_dotenv
from openai import AsyncOpenAI
import secrets
from uuid import UUID
from typing import Optional
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text as sql_text
from sqlalchemy.exc import IntegrityError
from ai_extraction import extract_places, MAX_TEXT_LENGTH, AI_TIMEOUT_SECONDS
from database import get_db, init_db, Place as DBPlace
from naver_place_search import search_naver_local_place

# .env 파일 로드
load_dotenv()

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 환경 변수 설정
FB_VERIFY_TOKEN = os.getenv("FB_VERIFY_TOKEN", "sple_default_token")
IG_PAGE_ACCESS_TOKEN = os.getenv("IG_PAGE_ACCESS_TOKEN")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://sple-insta.com")
BACKEND_API_KEY = os.getenv("BACKEND_API_KEY")
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        f"{FRONTEND_URL},https://www.sple-insta.com,http://localhost:3000",
    ).split(",")
    if origin.strip()
]

# NVIDIA credentials are backend-only.
client = None


def init_nvidia_client():
    global client
    api_key = os.getenv("NVIDIA_API_KEY", "").strip()
    client = AsyncOpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=api_key,
        timeout=AI_TIMEOUT_SECONDS,
        max_retries=0,
    ) if api_key else None


@asynccontextmanager
async def lifespan(app: FastAPI):
    validate_security_configuration()
    init_nvidia_client()
    try:
        await init_db()
        yield
    finally:
        if client is not None:
            await client.close()

app = FastAPI(title="Sple Reboot API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    text: str = Field(min_length=1, max_length=MAX_TEXT_LENGTH)

class PlaceItem(BaseModel):
    user_id: str
    name: str
    address: str = ""
    category: str = "All"
    request_id: Optional[UUID] = None
    rating: Optional[float] = None
    summary: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geocoding_status: str = "pending"

    @field_validator("user_id", "name", mode="before")
    @classmethod
    def require_non_empty_text(cls, value):
        if not isinstance(value, str) or not value.strip():
            raise ValueError("must be a non-empty string")
        return value.strip()

    @field_validator("address", mode="before")
    @classmethod
    def normalize_optional_address(cls, value):
        if value is None:
            return ""
        if not isinstance(value, str):
            raise ValueError("must be a string")
        return value.strip()


class PlaceEnrichRequest(BaseModel):
    user_id: str
    force: bool = False

    @field_validator("user_id", mode="before")
    @classmethod
    def require_user_id(cls, value):
        if not isinstance(value, str) or not value.strip():
            raise ValueError("must be a non-empty string")
        return value.strip()


def serialize_place(place: DBPlace) -> dict:
    return {
        "id": place.id,
        "user_id": place.user_id,
        "name": place.name,
        "address": place.address,
        "category": place.category,
        "rating": place.rating,
        "summary": place.summary,
        "latitude": place.latitude,
        "longitude": place.longitude,
        "geocoding_status": place.geocoding_status,
        "naver_place_title": place.naver_place_title,
        "naver_place_url": place.naver_place_url,
        "naver_category": place.naver_category,
        "naver_description": place.naver_description,
        "naver_telephone": place.naver_telephone,
        "naver_address": place.naver_address,
        "naver_road_address": place.naver_road_address,
        "naver_mapx": place.naver_mapx,
        "naver_mapy": place.naver_mapy,
        "naver_match_status": place.naver_match_status,
        "naver_enriched_at": (
            place.naver_enriched_at.isoformat()
            if place.naver_enriched_at
            else None
        ),
    }


async def extract_place_info(text: str):
    return await extract_places(client, text)


def normalize_text_input(text: str) -> str:
    return " ".join(text.split())


def is_url_only_input(text: str) -> bool:
    normalized = normalize_text_input(text).lower()
    return normalized.startswith(("http://", "https://")) and " " not in normalized


async def geocode_address_via_naver_api(address: str) -> tuple[Optional[float], Optional[float]]:
    """
    네이버 Geocoding REST API를 서버 대 서버(Server-to-Server) 방식으로 직접 호출하여
    주소(Address)의 위도(Latitude)와 경도(Longitude) 좌표(Coordinates)를 조회합니다.
    """
    client_id = os.getenv("NEXT_PUBLIC_NAVER_CLIENT_ID")
    client_secret = os.getenv("NAVER_CLIENT_SECRET")
    
    if not client_id or not client_secret:
        logger.warning(
            "네이버 Client ID 또는 Client Secret 환경 변수(Environment Variable)가 설정되어 있지 않아 "
            "백엔드 서버사이드 지오코딩 폴백 작동을 건너뜁니다."
        )
        return None, None
        
    url = "https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode"
    headers = {
        "X-NCP-APIGW-API-KEY-ID": client_id,
        "X-NCP-APIGW-API-KEY": client_secret,
        "Accept": "application/json"
    }
    params = {
        "query": address
    }
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as http_client:
            response = await http_client.get(url, headers=headers, params=params)
            if response.status_code == 200:
                res_json = response.json()
                addresses = res_json.get("addresses", [])
                if addresses:
                    addr_info = addresses[0]
                    lat = float(addr_info["y"])
                    lng = float(addr_info["x"])
                    logger.info(f"서버사이드 지오코딩 성공: {address} -> 위도: {lat}, 경도: {lng}")
                    return lat, lng
                else:
                    logger.warning(f"서버사이드 지오코딩 매칭 결과 없음: {address}")
            else:
                logger.error(
                    f"네이버 지오코딩 API 호출 오류 (HTTP {response.status_code}): {response.text}"
                )
    except Exception as e:
        logger.error(f"서버사이드 지오코딩 요청 예외 발생: {e}")
        
    return None, None


def development_auth_bypass() -> bool:
    return (
        os.getenv("APP_ENV", "production") == "development"
        and os.getenv("ALLOW_INSECURE_LOCAL_AUTH") == "true"
    )


def validate_security_configuration():
    if not BACKEND_API_KEY and not development_auth_bypass():
        raise RuntimeError("BACKEND_API_KEY must be configured")


async def verify_internal_api_key(x_sple_internal_key: Optional[str] = Header(default=None)):
    if not BACKEND_API_KEY:
        if development_auth_bypass():
            return
        raise HTTPException(503, detail={"code": "AUTH_NOT_CONFIGURED"})
    if not secrets.compare_digest(x_sple_internal_key or "", BACKEND_API_KEY):
        raise HTTPException(401, detail={"code": "UNAUTHORIZED"})

@app.get("/")
async def read_root():
    return {"status": "online", "message": "Sple Reboot API is running"}


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "sple-backend"}


@app.get("/health/db")
async def db_health_check(db: AsyncSession = Depends(get_db)):
    await db.execute(sql_text("SELECT 1"))
    return {"status": "ok", "database": "reachable"}

@app.post("/api/analyze")
async def analyze_place_api(
    request: AnalyzeRequest,
    _: None = Depends(verify_internal_api_key),
):
    text = normalize_text_input(request.text)
    if not text or is_url_only_input(text):
        raise HTTPException(
            status_code=400,
            detail={
                "code": "TEXT_REQUIRED",
                "message": "장소가 언급된 텍스트를 복사해 붙여넣어 주세요.",
            },
        )

    extracted_data = await extract_place_info(text)
    return JSONResponse(content={"status": "success", "data": extracted_data})


@app.post("/api/places")
async def create_place_api(
    place: PlaceItem,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_internal_api_key),
):
    request_id = str(place.request_id) if place.request_id else None
    if request_id:
        existing = await db.scalar(select(DBPlace).where(
            DBPlace.user_id == place.user_id, DBPlace.request_id == request_id
        ))
        if existing:
            return JSONResponse(content={"status": "success", "data": serialize_place(existing)})

    lat = place.latitude
    lng = place.longitude
    status = place.geocoding_status

    # 백엔드 지오코딩에 필요한 네이버 API 키 환경 변수(Environment Variable) 존재 여부 검사
    client_id = os.getenv("NEXT_PUBLIC_NAVER_CLIENT_ID")
    client_secret = os.getenv("NAVER_CLIENT_SECRET")
    has_naver_keys = bool(client_id and client_secret)

    # 클라이언트가 좌표 변환에 실패했거나 좌표를 넘겨주지 않은 경우이면서, 주소가 있고, 네이버 API 키가 설정되어 있는 경우에만 서버사이드 지오코딩 폴백 작동
    if has_naver_keys and (lat is None or lng is None or status == "failed") and place.address:
        logger.info(f"클라이언트 좌표 누락 감지, 백엔드 지오코딩 폴백 작동: {place.address}")
        server_lat, server_lng = await geocode_address_via_naver_api(place.address)
        if server_lat is not None and server_lng is not None:
            lat = server_lat
            lng = server_lng
            status = "resolved"
        else:
            status = "failed"

    db_place = DBPlace(
        request_id=request_id,
        user_id=place.user_id,
        name=place.name,
        address=place.address,
        category=place.category,
        rating=place.rating,
        summary=place.summary,
        latitude=lat,
        longitude=lng,
        geocoding_status=status,
    )
    db.add(db_place)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        if not request_id:
            raise
        existing = await db.scalar(select(DBPlace).where(
            DBPlace.user_id == place.user_id, DBPlace.request_id == request_id
        ))
        if existing is None:
            raise
        return JSONResponse(content={"status": "success", "data": serialize_place(existing)})
    await db.refresh(db_place)
    return JSONResponse(content={"status": "success", "data": serialize_place(db_place)})


@app.get("/api/places")
async def list_places_api(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_internal_api_key),
):
    result = await db.execute(
        select(DBPlace)
        .where(DBPlace.user_id == user_id)
        .order_by(DBPlace.id.desc())
    )
    places = [serialize_place(place) for place in result.scalars().all()]
    return JSONResponse(content={"status": "success", "data": places})


@app.patch("/api/places/{place_id}")
async def update_place_api(
    place_id: int,
    place: PlaceItem,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_internal_api_key),
):
    result = await db.execute(
        select(DBPlace).where(
            DBPlace.id == place_id,
            DBPlace.user_id == place.user_id,
        )
    )
    db_place = result.scalar_one_or_none()

    if not db_place:
        raise HTTPException(status_code=404, detail={"code": "PLACE_NOT_FOUND"})

    lat = place.latitude
    lng = place.longitude
    status = place.geocoding_status

    # 백엔드 지오코딩에 필요한 네이버 API 키 환경 변수(Environment Variable) 존재 여부 검사
    client_id = os.getenv("NEXT_PUBLIC_NAVER_CLIENT_ID")
    client_secret = os.getenv("NAVER_CLIENT_SECRET")
    has_naver_keys = bool(client_id and client_secret)

    # 주소가 존재하고 좌표 정보가 없는 경우이면서, 네이버 API 키가 설정되어 있는 경우에만 백엔드 지오코딩 폴백 작동
    if has_naver_keys and (lat is None or lng is None or status == "failed") and place.address:
        logger.info(f"클라이언트 좌표 누락 감지, 백엔드 지오코딩 폴백 작동 (수정 API): {place.address}")
        server_lat, server_lng = await geocode_address_via_naver_api(place.address)
        if server_lat is not None and server_lng is not None:
            lat = server_lat
            lng = server_lng
            status = "resolved"
        else:
            status = "failed"

    if db_place.name != place.name or db_place.address != place.address:
        for column in DBPlace.__table__.columns:
            if column.name.startswith("naver_"):
                setattr(db_place, column.name, None)

    db_place.name = place.name
    db_place.address = place.address
    db_place.category = place.category
    db_place.rating = place.rating
    db_place.summary = place.summary
    db_place.latitude = lat
    db_place.longitude = lng
    db_place.geocoding_status = status

    await db.commit()
    await db.refresh(db_place)
    return JSONResponse(content={"status": "success", "data": serialize_place(db_place)})


@app.post("/api/places/{place_id}/enrich")
async def enrich_place_api(
    place_id: int,
    payload: PlaceEnrichRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_internal_api_key),
):
    result = await db.execute(
        select(DBPlace).where(
            DBPlace.id == place_id,
            DBPlace.user_id == payload.user_id,
        )
    )
    db_place = result.scalar_one_or_none()

    if not db_place:
        raise HTTPException(status_code=404, detail={"code": "PLACE_NOT_FOUND"})

    cacheable_naver_statuses = {"matched", "low_confidence", "not_found"}
    enriched_at = db_place.naver_enriched_at
    if enriched_at and enriched_at.tzinfo is None:
        enriched_at = enriched_at.replace(tzinfo=timezone.utc)
    cache_ttl = timedelta(days=7) if db_place.naver_match_status == "matched" else timedelta(hours=1)
    if (
        enriched_at
        and datetime.now(timezone.utc) - enriched_at < cache_ttl
        and db_place.naver_match_status in cacheable_naver_statuses
        and not payload.force
    ):
        return JSONResponse(content={"status": "success", "data": serialize_place(db_place)})

    metadata = await asyncio.to_thread(
        search_naver_local_place,
        db_place.name,
        db_place.address,
    )

    db_place.naver_place_title = metadata.title
    db_place.naver_place_url = metadata.url
    db_place.naver_category = metadata.category
    db_place.naver_description = metadata.description
    db_place.naver_telephone = metadata.telephone
    db_place.naver_address = metadata.address
    db_place.naver_road_address = metadata.road_address
    db_place.naver_mapx = metadata.mapx
    db_place.naver_mapy = metadata.mapy
    db_place.naver_match_status = metadata.match_status
    db_place.naver_enriched_at = metadata.enriched_at or datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(db_place)
    return JSONResponse(content={"status": "success", "data": serialize_place(db_place)})


@app.delete("/api/places/{place_id}")
async def delete_place_api(
    place_id: int,
    user_id: str,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_internal_api_key),
):
    result = await db.execute(
        select(DBPlace).where(
            DBPlace.id == place_id,
            DBPlace.user_id == user_id,
        )
    )
    db_place = result.scalar_one_or_none()

    if not db_place:
        raise HTTPException(status_code=404, detail={"code": "PLACE_NOT_FOUND"})

    await db.delete(db_place)
    await db.commit()
    return JSONResponse(content={"status": "success", "message": "장소가 성공적으로 삭제되었습니다."})


@app.post("/api/places/recover-coordinates")
async def recover_coordinates_api(
    payload: PlaceEnrichRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_internal_api_key),
):
    """
    서버사이드(Server-Side)에 누락되거나 지오코딩 실패('failed') 상태인
    과거 등록 맛집 데이터들의 위도/경도 좌표를 일괄적(Bulk)으로 복구하고 원격 DB에 저장합니다.
    내부 키와 프록시가 전달한 인증 사용자 범위로 보호됩니다.
    """
    logger.info("원격 데이터베이스 누락 좌표 일괄 복구 API 작동 시작")
    
    # 1. 위도/경도가 누락되었거나 지오코딩 실패('failed') 혹은 미처리('pending') 상태인 레코드들을 DB에서 조회
    result = await db.execute(
        select(DBPlace).where(
            DBPlace.user_id == payload.user_id,
            (DBPlace.latitude == None) | 
            (DBPlace.longitude == None) | 
            (DBPlace.geocoding_status == "failed") |
            (DBPlace.geocoding_status == "pending")
        )
    )
    target_places = result.scalars().all()
    total_found = len(target_places)
    
    logger.info(f"좌표 누락 또는 실패 상태인 맛집 레코드 발견: {total_found}개")
    
    if total_found == 0:
        return JSONResponse(content={
            "status": "success",
            "message": "복구 대상 맛집이 없습니다. 데이터베이스가 이미 완전히 최신 상태입니다.",
            "data": {"processed": 0, "recovered": 0}
        })
        
    recovered_count = 0
    recovered_details = []
    
    # 2. 복구 대상 장소들을 하나씩 비동기로 지오코딩 변환
    for place in target_places:
        if not place.address:
            logger.warning(f"장소 ID {place.id} ({place.name})의 주소(Address)가 비어 있어 지오코딩을 생략합니다.")
            continue
            
        logger.info(f"장소 ID {place.id} ({place.name})의 주소({place.address}) 좌표 복구 시도 중...")
        lat, lng = await geocode_address_via_naver_api(place.address)
        
        if lat is not None and lng is not None:
            place.latitude = lat
            place.longitude = lng
            place.geocoding_status = "resolved"
            recovered_count += 1
            recovered_details.append({
                "id": place.id,
                "name": place.name,
                "address": place.address,
                "latitude": lat,
                "longitude": lng
            })
            logger.info(f"장소 ID {place.id} 복구 성공: {lat}, {lng}")
        else:
            place.geocoding_status = "failed"
            logger.warning(f"장소 ID {place.id} 복구 실패 (네이버 API 응답 없음 혹은 주소 오기재)")

    # 3. 데이터베이스 트랜잭션 반영 및 커밋(Commit)
    if target_places:
        await db.commit()
        logger.info(f"총 {recovered_count}개의 맛집 좌표가 원격 DB에 성공적으로 저장되었습니다.")
    
    return JSONResponse(content={
        "status": "success",
        "message": f"복구 프로세스가 완료되었습니다. (검색: {total_found}개, 복구 성공: {recovered_count}개)",
        "data": {
            "total_found": total_found,
            "recovered_count": recovered_count,
            "details": recovered_details
        }
    })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
