from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
import os
import logging
from dotenv import load_dotenv
from google import genai
import json
import re
from pathlib import Path
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text as sql_text
from database import get_db, init_db, Place as DBPlace

# .env 파일 로드
load_dotenv()

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 환경 변수 설정
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GCP_SA_KEY_JSON = os.getenv("GCP_SA_KEY_JSON")
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID", "insta-place-493505")
GCP_LOCATION = os.getenv("GCP_LOCATION", "us-central1")
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

# Gemini 클라이언트 초기화
client = None

def init_gemini_client():
    global client
    # 1. GitHub Actions/ECS 환경 변수 방식 (JSON 문자열)
    if GCP_SA_KEY_JSON:
        try:
            logger.info("GCP_SA_KEY_JSON 환경 변수를 사용하여 Vertex AI 초기화를 시도합니다.")
            temp_key_path = Path("/tmp/gcp-key.json")
            if not temp_key_path.parent.exists():
                temp_key_path.parent.mkdir(parents=True, exist_ok=True)
            temp_key_path.write_text(GCP_SA_KEY_JSON)
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(temp_key_path)
            client = genai.Client(vertexai=True, project=GCP_PROJECT_ID, location=GCP_LOCATION)
            logger.info("Vertex AI 초기화 성공 (JSON String)")
            return
        except Exception as e:
            logger.error(f"Vertex AI(JSON String) 초기화 실패: {e}")

    # 2. 로컬 파일 방식 (insta-place-gcp.json)
    sa_path = Path("insta-place-gcp.json")
    if not sa_path.is_absolute():
        root_dir = Path(__file__).resolve().parent.parent
        sa_path = root_dir / sa_path
        
    if sa_path.exists():
        try:
            logger.info(f"로컬 파일 {sa_path}을 사용하여 Vertex AI 초기화를 시도합니다.")
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(sa_path)
            client = genai.Client(vertexai=True, project=GCP_PROJECT_ID, location=GCP_LOCATION)
            logger.info("Vertex AI 초기화 성공 (Local File)")
            return
        except Exception as e:
            logger.error(f"Vertex AI(Local File) 초기화 실패: {e}")

    # 3. API Key 방식 (Fallback)
    if GEMINI_API_KEY:
        try:
            logger.info("Gemini API Key를 사용하여 클라이언트를 초기화합니다.")
            client = genai.Client(api_key=GEMINI_API_KEY)
            logger.info("Gemini API Key 클라이언트 초기화 성공")
            return
        except Exception as e:
            logger.error(f"Gemini API Key 초기화 실패: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_gemini_client()
    await init_db()
    yield

app = FastAPI(title="Sple Reboot API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    text: str

class PlaceItem(BaseModel):
    user_id: str
    name: str
    address: str = ""
    category: str = "All"
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
    }


async def extract_place_info(text: str):
    if not client:
        return None
    prompt = (
        "당신은 한국 맛집/장소 텍스트에서 장소 정보를 추출하는 AI입니다. "
        "사용자가 복사해 붙여넣은 텍스트에서 상호명과 주소를 JSON 배열로 추출하세요. "
        "주소가 명확히 없더라도 상호명이 있으면 포함하고 address는 빈 문자열로 두세요. "
        "반드시 다른 설명 없이 JSON 배열만 반환하세요. "
        '형식: [{"name":"상호명","address":"주소 또는 빈 문자열"}]. '
        f"텍스트: {text}"
    )
    try:
        response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        match = re.search(r'\[.*\]', response.text, re.DOTALL)
        if match: return json.loads(match.group())
    except Exception as e:
        logger.error(f"AI Error: {e}")
    return None


def normalize_text_input(text: str) -> str:
    return " ".join(text.split())


def is_url_only_input(text: str) -> bool:
    normalized = normalize_text_input(text).lower()
    return normalized.startswith(("http://", "https://")) and " " not in normalized


async def verify_internal_api_key(x_sple_internal_key: Optional[str] = Header(default=None)):
    if BACKEND_API_KEY and x_sple_internal_key != BACKEND_API_KEY:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED"})

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
    db_place = DBPlace(
        user_id=place.user_id,
        name=place.name,
        address=place.address,
        category=place.category,
        rating=place.rating,
        summary=place.summary,
        latitude=place.latitude,
        longitude=place.longitude,
        geocoding_status=place.geocoding_status,
    )
    db.add(db_place)
    await db.commit()
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

    db_place.name = place.name
    db_place.address = place.address
    db_place.category = place.category
    db_place.rating = place.rating
    db_place.summary = place.summary
    db_place.latitude = place.latitude
    db_place.longitude = place.longitude
    db_place.geocoding_status = place.geocoding_status

    await db.commit()
    await db.refresh(db_place)
    return JSONResponse(content={"status": "success", "data": serialize_place(db_place)})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
