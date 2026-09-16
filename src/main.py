from contextlib import asynccontextmanager
import asyncio
from collections import deque
import hashlib
import hmac
import json
from datetime import datetime, timezone, timedelta
from fastapi import BackgroundTasks, FastAPI, HTTPException, Depends, Header, Request
from fastapi.responses import JSONResponse, PlainTextResponse
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
from sqlalchemy import delete, select, text as sql_text
from sqlalchemy.exc import IntegrityError
from ai_extraction import extract_places, MAX_TEXT_LENGTH, AI_TIMEOUT_SECONDS
from database import (
    InstagramShare,
    Place as DBPlace,
    async_session,
    get_db,
    init_db,
)
from naver_place_search import search_naver_local_place
from urllib.parse import quote

# .env 파일 로드
load_dotenv()

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 환경 변수 설정
INSTAGRAM_WEBHOOK_VERIFY_TOKEN = os.getenv("INSTAGRAM_WEBHOOK_VERIFY_TOKEN")
META_APP_SECRET = os.getenv("META_APP_SECRET")
IG_PAGE_ACCESS_TOKEN = os.getenv("IG_PAGE_ACCESS_TOKEN")
INSTAGRAM_BUSINESS_ACCOUNT_ID = os.getenv("INSTAGRAM_BUSINESS_ACCOUNT_ID")
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
_instagram_seen_events: set[str] = set()
_instagram_seen_order: deque[str] = deque(maxlen=2_000)


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
    instagram_claim_token: Optional[str] = None

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

    @field_validator("instagram_claim_token")
    @classmethod
    def validate_instagram_claim_token(cls, value):
        if value is None:
            return None
        if not isinstance(value, str) or not value or len(value) > 64:
            raise ValueError("must be a valid Instagram claim token")
        return value


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


def _parse_naver_local_coordinates(mapx: str | None, mapy: str | None) -> tuple[Optional[float], Optional[float]]:
    try:
        lng = int(mapx or "") / 10_000_000
        lat = int(mapy or "") / 10_000_000
    except (TypeError, ValueError):
        return None, None
    # Naver local search covers Korean places; reject legacy KATECH values and
    # malformed coordinates that happen to fit broad global WGS84 bounds.
    if not (33 <= lat <= 39 and 124 <= lng <= 132):
        return None, None
    return lat, lng


async def resolve_place_coordinates(name: str, address: str) -> tuple[Optional[float], Optional[float]]:
    lat, lng = await geocode_address_via_naver_api(address)
    if lat is not None and lng is not None:
        return lat, lng

    metadata = await asyncio.to_thread(search_naver_local_place, name, address)
    if metadata.match_status != "matched":
        return None, None
    return _parse_naver_local_coordinates(metadata.mapx, metadata.mapy)


def _has_coordinate_provider() -> bool:
    return bool(
        (os.getenv("NEXT_PUBLIC_NAVER_CLIENT_ID") and os.getenv("NAVER_CLIENT_SECRET"))
        or (os.getenv("NAVER_SEARCH_CLIENT_ID") and os.getenv("NAVER_SEARCH_CLIENT_SECRET"))
    )


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


def _instagram_signature_is_valid(body: bytes, signature: str | None) -> bool:
    if not META_APP_SECRET or not signature or not signature.startswith("sha256="):
        return False
    supplied = signature.removeprefix("sha256=")
    expected = hmac.new(META_APP_SECRET.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return secrets.compare_digest(supplied, expected)


def _shared_post_from_message(message: dict) -> dict | None:
    attachments = message.get("attachments")
    if not isinstance(attachments, list):
        return None

    # Meta can include both the legacy `share` and `ig_post` attachment for one
    # message during its transition. Prefer the current attachment and process once.
    candidates = [item for item in attachments if isinstance(item, dict)]
    candidates.sort(key=lambda item: 0 if item.get("type") == "ig_post" else 1)
    for attachment in candidates:
        if attachment.get("type") not in {"ig_post", "share"}:
            continue
        payload = attachment.get("payload")
        if not isinstance(payload, dict):
            continue
        title = payload.get("title")
        url = payload.get("url")
        if isinstance(title, str) or isinstance(url, str):
            return {
                "title": title.strip() if isinstance(title, str) else "",
                "url": url.strip() if isinstance(url, str) else "",
                "media_id": payload.get("ig_post_media_id"),
            }
    return None


def _instagram_claim_url(claim_token: str) -> str:
    return f"{FRONTEND_URL.rstrip('/')}/add?claim={quote(claim_token)}"


async def _send_instagram_text(recipient_id: str, message: str) -> bool:
    """Reply inside the customer-initiated Instagram conversation."""
    if not IG_PAGE_ACCESS_TOKEN or not INSTAGRAM_BUSINESS_ACCOUNT_ID:
        logger.warning(
            "Instagram reply skipped because IG_PAGE_ACCESS_TOKEN or "
            "INSTAGRAM_BUSINESS_ACCOUNT_ID is not configured"
        )
        return False

    try:
        async with httpx.AsyncClient(timeout=8.0) as http_client:
            response = await http_client.post(
                "https://graph.instagram.com/v25.0/"
                f"{INSTAGRAM_BUSINESS_ACCOUNT_ID}/messages",
                headers={"Authorization": f"Bearer {IG_PAGE_ACCESS_TOKEN}"},
                json={"recipient": {"id": recipient_id}, "message": {"text": message}},
            )
        if response.is_success:
            return True
        logger.warning(
            "Instagram reply failed (status=%s response=%s)",
            response.status_code,
            response.text[:500],
        )
    except httpx.HTTPError:
        logger.exception("Instagram reply request failed")
    return False


async def _create_instagram_share(
    sender_id: str, shared: dict, places: list[dict],
) -> InstagramShare:
    now = datetime.now(timezone.utc)
    async with async_session() as db:
        await db.execute(delete(InstagramShare).where(InstagramShare.expires_at < now))
        instagram_share = InstagramShare(
            claim_token=secrets.token_urlsafe(32),
            sender_id=sender_id,
            source_url=shared.get("url", ""),
            title=shared.get("title", ""),
            places_json=json.dumps(places, ensure_ascii=False),
            expires_at=now + timedelta(days=7),
        )
        db.add(instagram_share)
        await db.commit()
        await db.refresh(instagram_share)
        return instagram_share


async def process_instagram_shared_post(event_id: str, sender_id: str, shared: dict):
    title = shared.get("title", "")
    places: list[dict] = []
    if title:
        try:
            places = await extract_place_info(title[:MAX_TEXT_LENGTH])
        except HTTPException as exc:
            logger.warning(
                "Instagram shared post analysis failed (event=%s code=%s)",
                event_id,
                exc.detail.get("code") if isinstance(exc.detail, dict) else "HTTP_ERROR",
            )
        except Exception:
            logger.exception("Instagram shared post processing failed (event=%s)", event_id)
    else:
        logger.info("Instagram shared post received without caption (event=%s)", event_id)

    try:
        instagram_share = await _create_instagram_share(sender_id, shared, places)
    except Exception:
        logger.exception("Instagram shared post could not be stored (event=%s)", event_id)
        return

    reply_sent = await _send_instagram_text(
        sender_id,
        "공유한 게시물을 Sple에 저장할 준비가 됐어요.\n"
        f"{_instagram_claim_url(instagram_share.claim_token)}\n"
        "링크를 열어 장소를 확인하고 저장해 주세요.",
    )
    logger.info(
        "Instagram shared post prepared (event=%s sender=%s places=%s reply_sent=%s)",
        event_id,
        sender_id,
        len(places),
        reply_sent,
    )


def _mark_instagram_event_seen(event_id: str) -> bool:
    if event_id in _instagram_seen_events:
        return False
    if len(_instagram_seen_order) == _instagram_seen_order.maxlen:
        _instagram_seen_events.discard(_instagram_seen_order[0])
    _instagram_seen_order.append(event_id)
    _instagram_seen_events.add(event_id)
    return True


@app.get("/webhooks/instagram")
async def verify_instagram_webhook(request: Request):
    params = request.query_params
    if (
        params.get("hub.mode") == "subscribe"
        and INSTAGRAM_WEBHOOK_VERIFY_TOKEN
        and secrets.compare_digest(
            params.get("hub.verify_token", ""), INSTAGRAM_WEBHOOK_VERIFY_TOKEN
        )
        and params.get("hub.challenge")
    ):
        return PlainTextResponse(params["hub.challenge"])
    raise HTTPException(status_code=403, detail={"code": "WEBHOOK_VERIFICATION_FAILED"})


@app.post("/webhooks/instagram")
async def receive_instagram_webhook(request: Request, background_tasks: BackgroundTasks):
    body = await request.body()
    if not _instagram_signature_is_valid(body, request.headers.get("x-hub-signature-256")):
        raise HTTPException(status_code=403, detail={"code": "WEBHOOK_SIGNATURE_INVALID"})
    try:
        payload = json.loads(body)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail={"code": "WEBHOOK_INVALID_JSON"}) from exc

    if not isinstance(payload, dict) or payload.get("object") != "instagram":
        return {"status": "ignored"}

    accepted = 0
    entries = payload.get("entry")
    if not isinstance(entries, list):
        return {"status": "accepted", "events": 0}
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        for messaging in entry.get("messaging", []):
            if not isinstance(messaging, dict):
                continue
            message = messaging.get("message")
            if not isinstance(message, dict):
                continue
            shared = _shared_post_from_message(message)
            if not shared:
                continue
            event_id = str(message.get("mid") or "")
            if not event_id:
                event_id = hashlib.sha256(
                    json.dumps(messaging, sort_keys=True).encode("utf-8")
                ).hexdigest()
            if not _mark_instagram_event_seen(event_id):
                continue
            sender_id = str((messaging.get("sender") or {}).get("id") or "unknown")
            background_tasks.add_task(process_instagram_shared_post, event_id, sender_id, shared)
            accepted += 1

    return {"status": "accepted", "events": accepted}


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


@app.get("/api/instagram/claims/{claim_token}")
async def get_instagram_claim_api(
    claim_token: str,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_internal_api_key),
):
    instagram_share = await db.scalar(
        select(InstagramShare).where(InstagramShare.claim_token == claim_token)
    )
    if not instagram_share:
        raise HTTPException(status_code=404, detail={"code": "INSTAGRAM_CLAIM_NOT_FOUND"})

    expires_at = instagram_share.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail={"code": "INSTAGRAM_CLAIM_EXPIRED"})

    try:
        places = json.loads(instagram_share.places_json)
    except json.JSONDecodeError:
        logger.error("Instagram claim has invalid places JSON (id=%s)", instagram_share.id)
        places = []
    if not isinstance(places, list):
        places = []

    return JSONResponse(content={
        "status": "success",
        "data": {
            "title": instagram_share.title,
            "source_url": instagram_share.source_url,
            "places": places,
            "expires_at": expires_at.isoformat(),
        },
    })

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
    instagram_share = None
    if place.instagram_claim_token:
        instagram_share = await db.scalar(
            select(InstagramShare).where(
                InstagramShare.claim_token == place.instagram_claim_token
            )
        )
        if not instagram_share:
            raise HTTPException(status_code=404, detail={"code": "INSTAGRAM_CLAIM_NOT_FOUND"})
        expires_at = instagram_share.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at <= datetime.now(timezone.utc):
            raise HTTPException(status_code=410, detail={"code": "INSTAGRAM_CLAIM_EXPIRED"})
        if (
            instagram_share.claimed_by_user_id
            and instagram_share.claimed_by_user_id != place.user_id
        ):
            raise HTTPException(status_code=409, detail={"code": "INSTAGRAM_CLAIM_ALREADY_USED"})

    if request_id:
        existing = await db.scalar(select(DBPlace).where(
            DBPlace.user_id == place.user_id, DBPlace.request_id == request_id
        ))
        if existing:
            if instagram_share and not instagram_share.claimed_by_user_id:
                instagram_share.claimed_by_user_id = place.user_id
                await db.commit()
            return JSONResponse(content={"status": "success", "data": serialize_place(existing)})

    lat = place.latitude
    lng = place.longitude
    status = place.geocoding_status

    if _has_coordinate_provider() and (lat is None or lng is None or status == "failed") and place.address:
        logger.info(f"클라이언트 좌표 누락 감지, 백엔드 지오코딩 폴백 작동: {place.address}")
        server_lat, server_lng = await resolve_place_coordinates(place.name, place.address)
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
    if instagram_share:
        instagram_share.claimed_by_user_id = place.user_id
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

    if _has_coordinate_provider() and (lat is None or lng is None or status == "failed") and place.address:
        logger.info(f"클라이언트 좌표 누락 감지, 백엔드 지오코딩 폴백 작동 (수정 API): {place.address}")
        server_lat, server_lng = await resolve_place_coordinates(place.name, place.address)
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
        lat, lng = await resolve_place_coordinates(place.name, place.address)
        
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
