from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import logging
from dotenv import load_dotenv
import httpx
from bs4 import BeautifulSoup
from google import genai
import json
import re
from pathlib import Path
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db, init_db, Place as DBPlace

# .env 파일 로드
load_dotenv()

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 환경 변수 설정
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
FB_VERIFY_TOKEN = os.getenv("FB_VERIFY_TOKEN", "sple_default_token")
IG_PAGE_ACCESS_TOKEN = os.getenv("IG_PAGE_ACCESS_TOKEN")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://sple-insta.com")

# GCP 인증 설정
GCP_SA_KEY_PATH = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "insta-place-gcp.json")
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID", "insta-place-493505")
GCP_LOCATION = os.getenv("GCP_LOCATION", "us-central1")

# Gemini 클라이언트 초기화
client = None
sa_path = Path(GCP_SA_KEY_PATH)
if not sa_path.is_absolute():
    root_dir = Path(__file__).resolve().parent.parent
    sa_path = root_dir / sa_path

if sa_path.exists():
    logger.info(f"Using Vertex AI with GCP Service Account: {sa_path}")
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(sa_path)
    client = genai.Client(vertexai=True, project=GCP_PROJECT_ID, location=GCP_LOCATION)
elif GEMINI_API_KEY:
    logger.info("Using Gemini API Key (Fallback)")
    client = genai.Client(api_key=GEMINI_API_KEY)

if not client:
    logger.warning("Gemini 인증 정보가 설정되지 않았습니다.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Sple Reboot API", lifespan=lifespan)

# CORS 설정 (운영 도메인 및 로컬 환경 허용)
allowed_origins = [
    "https://sple-insta.com",
    "https://www.sple-insta.com",
    "http://sple-insta.com",
    "http://www.sple-insta.com",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models ---
class PlaceRequest(BaseModel):
    url: str

class PlaceItem(BaseModel):
    user_id: str
    name: str
    address: str
    category: str = "All"
    rating: Optional[float] = None
    summary: Optional[str] = None

# --- Utility Functions ---
async def get_instagram_metadata(url: str):
    """인스타그램 메타데이터를 추출합니다."""      
    clean_url = url.split('?')[0]
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }

    try:
        async with httpx.AsyncClient() as client_http:
            # 방법 1: Jina Reader
            reader_url = f"https://r.jina.ai/{clean_url}"
            response = await client_http.get(reader_url, headers=headers, timeout=20.0)
            if response.status_code == 200 and len(response.text) > 100 and "securitycompromise" not in response.text.lower():
                return {"raw_text": response.text}

            # 방법 2: OpenGraph 메타 태그
            res = await client_http.get(clean_url, headers=headers, follow_redirects=True, timeout=20.0)
            if res.status_code == 200:
                soup = BeautifulSoup(res.text, 'html.parser')
                og_desc = soup.find("meta", property="og:description")
                og_title = soup.find("meta", property="og:title")
                combined = f"{og_title['content'] if og_title else ''} {og_desc['content'] if og_desc else ''}".strip()
                if combined:
                    return {"raw_text": combined}
    except Exception as e:
        logger.error(f"Metadata extraction error: {e}")
    return None

async def extract_place_info(text: str):
    if not client or not text: return None
    
    prompt = f"""
    당신은 한국의 핫플레이스 정보를 전문적으로 추출하는 AI입니다. 
    제공된 텍스트(인스타그램 게시글 등)에서 '실제 방문 가능한 특정 장소(식당, 카페, 술집, 문화공간 등)'를 찾아내세요.

    [핵심 규칙]
    1. **상호명 추출:** 이모지나 불필요한 수식어는 제외하고 실제 검색 가능한 상호명만 추출하세요. (예: "🔥43번지 혼술바🔥" -> "43번지 혼술바")
    2. **주소 추출:** 텍스트에 포함된 도로명 주소나 지번 주소를 정확히 추출하세요. 주소가 불완전하더라도 지역명(예: 안산 중앙동)이 있다면 포함하세요.
    3. **데이터 유추:** 상호명은 있지만 주소가 명확하지 않은 경우, 텍스트 내의 지역 힌트를 조합하여 가장 유력한 주소를 응답하세요.
    4. **다중 장소:** 여러 장소가 있다면 모두 배열에 담으세요.
    5. **응답 형식:** 오직 JSON 배열만 출력하세요. 장소를 찾을 수 없으면 `[]`를 반환하세요.

    텍스트:
    \"\"\"{text}\"\"\"
    """
    try:
        # 모델 명칭 원복: gemini-2.5-flash
        response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        json_match = re.search(r'\[.*\]', response.text, re.DOTALL)
        if json_match: return json.loads(json_match.group())
    except Exception as e:
        logger.error(f"Gemini API Error: {e}")
    return None

async def send_ig_reply(recipient_id: str, message_text: str):
    if not IG_PAGE_ACCESS_TOKEN: return
    url = f"https://graph.facebook.com/v19.0/me/messages?access_token={IG_PAGE_ACCESS_TOKEN}"
    payload = {"recipient": {"id": recipient_id}, "message": {"text": message_text}}
    async with httpx.AsyncClient() as client_http:
        await client_http.post(url, json=payload)

# --- API Endpoints ---
@app.get("/")
async def read_root():
    return {"status": "online", "message": "Sple Reboot API is running"}

@app.post("/api/analyze")
async def analyze_place_api(request: PlaceRequest):
    raw_content = request.url.strip()

    if raw_content.startswith("http"):
        metadata = await get_instagram_metadata(raw_content)
        text_for_ai = metadata["raw_text"] if metadata else raw_content
    else:
        text_for_ai = raw_content

    extracted_data = await extract_place_info(text_for_ai)

    if not extracted_data and raw_content.startswith("http"):
        extracted_data = await extract_place_info(raw_content)

    return JSONResponse(content={"status": "success", "data": extracted_data})      

@app.post("/api/places")
async def save_place(place: PlaceItem, db: AsyncSession = Depends(get_db)):
    db_place = DBPlace(**place.model_dump())
    db.add(db_place)
    await db.commit()
    await db.refresh(db_place)
    return {"status": "success", "data": {"id": db_place.id, **place.model_dump()}} 

@app.get("/api/places")
async def get_places(user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DBPlace).where(DBPlace.user_id == user_id))    
    places = result.scalars().all()
    return {"status": "success", "data": [{"id": p.id, "name": p.name, "address": p.address, "category": p.category, "rating": p.rating, "summary": p.summary} for p in places]}

@app.get("/api/webhook/instagram")
async def verify_webhook(request: Request):
    params = request.query_params
    if params.get("hub.mode") == "subscribe" and params.get("hub.verify_token") == FB_VERIFY_TOKEN:
        return int(params.get("hub.challenge"))
    raise HTTPException(status_code=403, detail="Verification failed")

@app.post("/api/webhook/instagram")
async def handle_webhook(request: Request):
    data = await request.json()
    try:
        if data.get("object") == "instagram":
            for entry in data.get("entry", []):
                for messaging_event in entry.get("messaging", []):
                    sender_id = messaging_event["sender"]["id"]
                    text = messaging_event.get("message", {}).get("text", "")       
                    urls = re.findall(r'https://www.instagram.com/[^\s]+', text)    
                    if urls:
                        metadata = await get_instagram_metadata(urls[0])
                        if metadata:
                            extracted = await extract_place_info(metadata["raw_text"])
                            if extracted:
                                p = extracted[0]
                                query = f"{p['address']} {p['name']}".strip()       
                                naver_url = f"https://m.map.naver.com/search2/search.naver?query={re.sub(r'\s+', '+', query)}"
                                reply_msg = f"📍 '{p['name']}' 정보를 찾았어요!\n\n네이버 지도로 보기:\n{naver_url}"
                                await send_ig_reply(sender_id, reply_msg)
    except Exception as e:
        logger.error(f"Webhook error: {e}")
    return JSONResponse(content={"status": "ok"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
