from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.trustedhost import TrustedHostMiddleware
from pydantic import BaseModel
import os
import logging
from dotenv import load_dotenv
import httpx
from bs4 import BeautifulSoup
from google import genai
import json
import re
import jwt

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_

from database import init_db, get_db, async_session, Place
import auth

# .env 파일 로드
load_dotenv()

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 환경 변수 설정
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
FB_VERIFY_TOKEN = os.getenv("FB_VERIFY_TOKEN", "sple_default_token")
IG_PAGE_ACCESS_TOKEN = os.getenv("IG_PAGE_ACCESS_TOKEN")
# 배포 도메인으로 업데이트
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://sple-insta.com")

GCP_SA_KEY_PATH = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
GCP_SA_KEY_JSON = os.getenv("GCP_SA_KEY_JSON")
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID", "insta-place-493505")
GCP_LOCATION = os.getenv("GCP_LOCATION", "us-central1")

# GCP 인증 파일 처리 (JSON 문자열이 있을 경우 임시 파일 생성)
if not GCP_SA_KEY_PATH and GCP_SA_KEY_JSON:
    try:
        import tempfile
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, "insta-place-gcp.json")
        with open(temp_path, "w", encoding="utf-8") as f:
            f.write(GCP_SA_KEY_JSON)
        GCP_SA_KEY_PATH = temp_path
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = temp_path
        logger.info(f"Created temporary GCP key file at {temp_path}")
    except Exception as e:
        logger.error(f"Failed to create temporary GCP key file: {e}")

JWT_SECRET = os.getenv("NEXTAUTH_SECRET", os.getenv("JWT_SECRET", "super-secret-key-change-me-later"))
ALGORITHM = "HS256"

security = HTTPBearer(auto_error=False)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        logger.warning("get_current_user: No credentials provided in request")
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        return payload
    except Exception as e:
        logger.warning(f"get_current_user: JWT Decode Error - {e}")
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

client = None
if GCP_SA_KEY_PATH and os.path.exists(GCP_SA_KEY_PATH):
    logger.info(f"Using GCP Service Account from {GCP_SA_KEY_PATH}")
    client = genai.Client(
        vertexai=True,
        project=GCP_PROJECT_ID,
        location=GCP_LOCATION
    )
elif GEMINI_API_KEY:
    logger.info("Using Gemini API Key")
    client = genai.Client(api_key=GEMINI_API_KEY)
else:
    logger.warning("Gemini 인증 정보(API_KEY 또는 GCP JSON)가 설정되지 않았습니다.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 앱 시작 시 DB 스키마 생성
    await init_db()
    yield

app = FastAPI(title="Sple API Server", lifespan=lifespan)

# 라우터 등록
app.include_router(auth.router)

# CORS 설정: 운영 도메인 허용
allowed_origins = [
    os.getenv("FRONTEND_URL"),
    "https://sple-insta.com",
    "https://www.sple-insta.com",
    "http://sple-insta.com",
    "http://www.sple-insta.com",
    "http://localhost:3000"
]
# None 값 제거
allowed_origins = [origin for origin in allowed_origins if origin]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# 현재 파일의 디렉토리 경로 가져오기
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# --- Pydantic Models ---

class PlaceRequest(BaseModel):
    url: str

class PlaceSaveRequest(BaseModel):
    name: str
    address: str
    description: str
    url: str
    lat: float = None
    lng: float = None
    rating: float = 0.0
    tags: list = []
    categories: list = []
    detailed_highlights: str = ""
    user_email: str = None
    memo: str = None
    folder: str = "기본 폴더"

# --- Utility Functions ---

async def get_instagram_metadata(url: str):
    """인스타그램 본문을 가져오기 위해 여러 기법을 순차적으로 시도합니다."""
    clean_url = url.split('?')[0]
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7"
    }

    try:
        async with httpx.AsyncClient() as client_http:
            # 1. Jina Reader 시도
            reader_url = f"https://r.jina.ai/{clean_url}"
            response = await client_http.get(reader_url, headers=headers, timeout=12.0)

            if response.status_code == 200 and "Instagram" in response.text and len(response.text) > 300:
                return {"raw_text": response.text}

            # 2. 직접 스크래핑 시도
            response = await client_http.get(clean_url, headers=headers, follow_redirects=True, timeout=10.0)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                og_desc = soup.find("meta", property="og:description")
                og_title = soup.find("meta", property="og:title")
                combined_text = f"{og_title['content'] if og_title else ''}\n{og_desc['content'] if og_desc else ''}"
                if len(combined_text.strip()) > 30:
                    return {"raw_text": combined_text}

    except Exception as e:
        logger.error(f"Metadata extraction error: {e}")
    return None

async def extract_place_info(text: str):
    """Gemini를 사용하여 장소 정보를 정밀 추출하고 위경도 좌표를 유추합니다."""
    if not client or not text: return None

    prompt = f"""
    당신은 한국의 핫플레이스와 맛집 정보를 전문적으로 수집하는 데이터 엔지니어입니다.
    제공된 인스타그램 게시물 텍스트에서 언급된 모든 장소(맛집, 카페, 문화공간 등)를 찾아 상세 정보를 JSON 배열 형태로 추출하세요.

    [핵심 지시 사항]
    1. **주소 정밀 추출:** 텍스트에 상세 주소가 없더라도 '성수동 어니언', '한남동 나리의집' 처럼 지역명과 상호명이 있다면 해당 지역의 실제 주소를 유추하여 기입하세요.
    2. **위경도 유추 (Critical):** 추출하거나 유추한 주소를 기반으로 해당 장소의 위도(lat)와 경도(lng) 값을 소수점 6자리까지 최대한 정확하게 추론하여 포함하세요. (예: 서울특별시청 -> lat: 37.5665, lng: 126.9780)
    3. **카테고리 분류:** 아래 가이드에 따라 id 형태로 분류하세요.
       - cafe, restaurant, bar, shopping, culture, nature, stay, other
    4. **매력 포인트 요약:** `detailed_highlights` 필드에 장소의 특징(분위기, 대표 메뉴 등)을 3줄의 불렛포인트 형태(\n으로 구분)로 작성하세요.

    [응답 JSON 형식]
    [
      {{
        "name": "상호명",
        "address": "서울특별시 OO구 OO로 123",
        "lat": 37.XXXXXX,
        "lng": 126.XXXXXX,
        "description": "감성적인 한 줄 요약",
        "rating": 4.5,
        "tags": ["태그1", "태그2"],
        "categories": ["category_id"],
        "detailed_highlights": "• 특징 1\n• 특징 2\n• 특징 3"
      }}
    ]

    인스타그램 텍스트:
    \"\"\"{text}\"\"\"
    """

    try:
        response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        json_match = re.search(r'\[.*\]', response.text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
    except Exception as e:
        logger.error(f"Gemini 정밀 분석 에러: {e}")
    return None

async def send_ig_reply(recipient_id: str, message_text: str):
    """인스타그램 DM으로 자동 답장을 보냅니다."""
    if not IG_PAGE_ACCESS_TOKEN: return
    url = f"https://graph.facebook.com/v19.0/me/messages?access_token={IG_PAGE_ACCESS_TOKEN}"
    payload = {"recipient": {"id": recipient_id}, "message": {"text": message_text}}
    async with httpx.AsyncClient() as client_http:
        await client_http.post(url, json=payload)

# --- Helper Function for SQLAlchemy Models ---
def row_to_dict(row):
    """SQLAlchemy 모델 객체를 딕셔너리로 변환합니다."""
    return {c.name: getattr(row, c.name) for c in row.__table__.columns}

# --- API Endpoints ---

@app.get("/")
async def read_root():
    """서버 상태 확인용 루트 엔드포인트"""
    return {
        "status": "online",
        "message": "Sple API Server is running",
        "frontend": FRONTEND_URL
    }
def health_check():
    return {"status": "ok", "message": "Server is alive!"}

@app.get("/share-target")
async def share_target(request: Request, text: str = None, url: str = None):
    """PWA 공유 대상을 Next.js 프론트엔드로 리다이렉트합니다."""
    shared_content = f"{text or ''} {url or ''}"
    match = re.search(r'https://www.instagram.com/[^\s]+', shared_content)
    target_url = match.group(0) if match else None
    
    redirect_url = f"{FRONTEND_URL}/"
    if target_url:
        redirect_url += f"?url={target_url}"
        
    return RedirectResponse(url=redirect_url)

@app.get("/api/places")
async def get_places(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """로그인된 사용자의 저장된 장소 목록을 반환합니다."""
    try:
        user_email = user.get("email")
        stmt = select(Place).where(Place.user_email == user_email).order_by(Place.created_at.desc())
            
        result = await db.execute(stmt)
        places = result.scalars().all()
        
        places_data = [row_to_dict(p) for p in places]
        # Parse JSON strings back to lists for frontend compatibility
        for p in places_data:
            if p.get('tags'):
                try: p['tags'] = json.loads(p['tags'])
                except: p['tags'] = []
            if p.get('categories'):
                try: p['categories'] = json.loads(p['categories'])
                except: p['categories'] = []
                
        return JSONResponse(content={"status": "success", "data": places_data})
    except Exception as e:
        logger.exception("Error fetching places from DB")
        return JSONResponse(content={"status": "error", "message": "장소 목록을 불러오는 중 오류가 발생했습니다."}, status_code=500)

@app.post("/api/analyze")
async def analyze_place_api(request: PlaceRequest):
    """URL 또는 텍스트를 분석하여 정보를 추출합니다."""
    raw_content = request.url.strip()
    if raw_content.startswith("http"):
        metadata = await get_instagram_metadata(raw_content)
        text_for_ai = metadata["raw_text"] if metadata else raw_content
    else:
        text_for_ai = raw_content

    extracted_data = await extract_place_info(text_for_ai)
    return JSONResponse(content={"status": "success", "data": extracted_data})

@app.post("/api/save-place")
async def save_place_api(request: PlaceSaveRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """장소 데이터를 DB에 저장합니다."""
    try:
        new_place = Place(
            name=request.name,
            address=request.address,
            description=request.description,
            url=request.url,
            lat=request.lat,
            lng=request.lng,
            rating=request.rating,
            tags=json.dumps(request.tags),
            categories=json.dumps(request.categories),
            detailed_highlights=request.detailed_highlights,
            user_email=user.get("email"),
            user_id=int(user.get("sub")) if user.get("sub") else None,
            memo=request.memo,
            folder=request.folder
        )
        db.add(new_place)
        await db.commit()
        return JSONResponse(content={"status": "success", "message": "저장되었습니다."})
    except Exception as e:
        logger.error(f"Save error: {e}")
        await db.rollback()
        return JSONResponse(content={"status": "error", "message": str(e)}, status_code=500)

@app.get("/api/search")
async def search_places(q: str = "", user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """장소 검색 API"""
    if not q:
        return await get_places(user=user, db=db)
        
    try:
        user_email = user.get("email")
        query = f"%{q}%"
        stmt = select(Place).where(
            Place.user_email == user_email,
            or_(Place.name.ilike(query), Place.address.ilike(query))
        ).order_by(Place.created_at.desc())
            
        result = await db.execute(stmt)
        places = result.scalars().all()
        
        places_data = [row_to_dict(p) for p in places]
        for p in places_data:
            if p.get('tags'):
                try: p['tags'] = json.loads(p['tags'])
                except: p['tags'] = []
            if p.get('categories'):
                try: p['categories'] = json.loads(p['categories'])
                except: p['categories'] = []
                
        return JSONResponse(content={"status": "success", "data": places_data})
    except Exception as e:
        logger.exception("Search error")
        return JSONResponse(content={"status": "error", "message": str(e)}, status_code=500)

# --- Instagram DM Webhook ---

@app.get("/api/webhook/instagram")
async def verify_webhook(request: Request):
    """Meta의 Webhook 검증(Hub Challenge) 처리"""
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode == "subscribe" and token == FB_VERIFY_TOKEN:
        return int(challenge)
    raise HTTPException(status_code=403, detail="Verification failed")

@app.post("/api/webhook/instagram")
async def handle_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """실제 DM 메시지 수신 처리 및 자동 저장"""
    data = await request.json()
    try:
        if data.get("object") == "instagram":
            for entry in data.get("entry", []):
                for messaging_event in entry.get("messaging", []):
                    sender_id = messaging_event["sender"]["id"]
                    message = messaging_event.get("message", {})
                    text = message.get("text", "")
                    
                    attachments = message.get("attachments", [])
                    for attachment in attachments:
                        if attachment.get("type") == "share":
                            text += f" {attachment['payload'].get('url', '')}"

                    urls = re.findall(r'https://www.instagram.com/[^\s]+', text)
                    if urls:
                        target_url = urls[0]
                        metadata = await get_instagram_metadata(target_url)
                        if metadata:
                            extracted_list = await extract_place_info(metadata["raw_text"])
                            if extracted_list and isinstance(extracted_list, list):
                                for p_data in extracted_list:
                                    new_place = Place(
                                        name=p_data.get("name", ""),
                                        address=p_data.get("address", ""),
                                        description=p_data.get("description", ""),
                                        url=target_url,
                                        lat=p_data.get("lat"),
                                        lng=p_data.get("lng"),
                                        categories=json.dumps(p_data.get("categories", [])),
                                        detailed_highlights=p_data.get("detailed_highlights", "")
                                    )
                                    db.add(new_place)
                                await db.commit()
                                await send_ig_reply(sender_id, f"✅ '{extracted_list[0].get('name', '장소')}' 등 정보를 추가했어요!")

    except Exception as e:
        logger.error(f"Webhook error: {e}")
        await db.rollback()
    return JSONResponse(content={"status": "ok"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False,proxy_headers=True,forwarded_allow_ips="*")