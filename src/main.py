from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse, RedirectResponse, FileResponse
from fastapi.staticfiles import StaticFiles
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
import sqlite3

# .env 파일 로드
load_dotenv()

# 데이터베이스 파일 경로
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sple.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            name TEXT,
            profile_image TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS places (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            address TEXT NOT NULL,
            description TEXT,
            url TEXT,
            lat REAL,
            lng REAL,
            rating REAL,
            tags TEXT,
            category TEXT,
            categories TEXT, -- JSON array of selected categories
            image_url TEXT,
            detailed_highlights TEXT,
            user_email TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    try:
        cursor.execute("ALTER TABLE places ADD COLUMN user_email TEXT")
    except sqlite3.OperationalError:
        pass # Column already exists

    conn.commit()
    conn.close()

# DB 초기화 실행
init_db()

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 환경 변수 설정
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
FB_VERIFY_TOKEN = os.getenv("FB_VERIFY_TOKEN", "sple_default_token")
IG_PAGE_ACCESS_TOKEN = os.getenv("IG_PAGE_ACCESS_TOKEN")
# 배포 도메인으로 업데이트
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://sple-insta.com")

client = None
if GEMINI_API_KEY:
    client = genai.Client(api_key=GEMINI_API_KEY)
else:
    logger.warning("GEMINI_API_KEY가 설정되지 않았습니다.")

app = FastAPI(title="Sple API Server")

# CORS 설정: 운영 도메인 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://sple-insta.com"], # 운영 및 로컬 개발 환경 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

# --- API Endpoints ---

@app.get("/")
async def read_root():
    """서버 상태 확인용 루트 엔드포인트"""
    return {
        "status": "online",
        "message": "Sple API Server is running",
        "frontend": FRONTEND_URL
    }

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
async def get_places(user_email: str = None):
    """저장된 모든 장소 목록을 반환합니다."""
    try:
        with sqlite3.connect(DB_PATH) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            if user_email:
                cursor.execute("SELECT * FROM places WHERE user_email = ? ORDER BY created_at DESC", (user_email,))
            else:
                cursor.execute("SELECT * FROM places ORDER BY created_at DESC")
            rows = cursor.fetchall()
            places = [dict(row) for row in rows]
        return JSONResponse(content={"status": "success", "data": places})
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
async def save_place_api(request: PlaceSaveRequest):
    """장소 데이터를 DB에 저장합니다."""
    try:
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO places (name, address, description, url, lat, lng, rating, tags, categories, detailed_highlights, user_email) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    request.name, 
                    request.address, 
                    request.description, 
                    request.url, 
                    request.lat, 
                    request.lng, 
                    request.rating, 
                    json.dumps(request.tags), 
                    json.dumps(request.categories), 
                    request.detailed_highlights,
                    request.user_email
                )
            )
            conn.commit()
        return JSONResponse(content={"status": "success", "message": "저장되었습니다."})
    except Exception as e:
        logger.error(f"Save error: {e}")
        return JSONResponse(content={"status": "error", "message": str(e)}, status_code=500)

@app.get("/api/search")
async def search_places(q: str = "", user_email: str = None):
    """장소 검색 API"""
    if not q:
        return await get_places(user_email)
        
    try:
        query = f"%{q}%"
        with sqlite3.connect(DB_PATH) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            if user_email:
                cursor.execute(
                    "SELECT * FROM places WHERE (name LIKE ? OR address LIKE ?) AND user_email = ? ORDER BY created_at DESC", 
                    (query, query, user_email)
                )
            else:
                cursor.execute(
                    "SELECT * FROM places WHERE name LIKE ? OR address LIKE ? ORDER BY created_at DESC", 
                    (query, query)
                )
            rows = cursor.fetchall()
            places = [dict(row) for row in rows]
        return JSONResponse(content={"status": "success", "data": places})
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
async def handle_webhook(request: Request):
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
                                    with sqlite3.connect(DB_PATH) as conn:
                                        cursor = conn.cursor()
                                        cursor.execute(
                                            "INSERT INTO places (name, address, description, url, lat, lng, categories, detailed_highlights) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                                            (p_data["name"], p_data["address"], p_data["description"], target_url, p_data.get("lat"), p_data.get("lng"), json.dumps(p_data.get("categories", [])), p_data.get("detailed_highlights", ""))
                                        )
                                        conn.commit()
                                await send_ig_reply(sender_id, f"✅ '{extracted_list[0]['name']}' 등 정보를 추가했어요!")

    except Exception as e:
        logger.error(f"Webhook error: {e}")
    return JSONResponse(content={"status": "ok"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
