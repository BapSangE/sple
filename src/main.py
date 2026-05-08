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

# --- Utility Functions ---
async def get_instagram_metadata(url: str):
    """인스타그램 메타데이터를 여러 방법으로 시도하여 가져옵니다."""
    clean_url = url.split('?')[0]
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }
    
    try:
        async with httpx.AsyncClient() as client_http:
            # 방법 1: Jina Reader (성능은 좋으나 차단 가능성 있음)
            reader_url = f"https://r.jina.ai/{clean_url}"
            response = await client_http.get(reader_url, headers=headers, timeout=8.0)
            if response.status_code == 200 and len(response.text) > 100 and "securitycompromise" not in response.text.lower():
                return {"raw_text": response.text}
            
            # 방법 2: 직접 OpenGraph 메타 태그 추출 (차단 방어용)
            res = await client_http.get(clean_url, headers=headers, follow_redirects=True, timeout=8.0)
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
    # 프롬프트 강화: 장소가 아닐 경우 빈 리스트 반환 지시 추가
    prompt = f"""
    당신은 한국의 핫플레이스 정보를 전문적으로 추출하는 AI입니다. 
    제공된 인스타그램 텍스트에서 '실제 방문 가능한 특정 장소(식당, 카페, 문화공간 등)'가 언급되었는지 판단하세요.

    [핵심 규칙]
    1. **장소 여부 판단:** 방문 가능한 구체적인 상호명이 없다면(예: 단순 일상 글, 셀카, 풍경 등) 아무것도 추출하지 말고 빈 배열 `[]`만 반환하세요.
    2. **상호명 우선:** 장소가 맞다면, 상세 주소가 없더라도 '성수동 어니언'처럼 지역명과 상호명을 결합하여 실제 도로명/지번 주소를 유추하여 기입하세요.
    3. **오직 JSON만:** 설명 없이 오직 JSON 배열만 출력하세요.

    [응답 형식]
    - 장소가 맞을 때: [ {{"name": "상호명", "address": "주소"}} ]
    - 장소가 아닐 때: []

    텍스트:
    \"\"\"{text}\"\"\"
    """
    try:
        response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        json_match = re.search(r'\[.*\]', response.text, re.DOTALL)
        if json_match: return json.loads(json_match.group())
    except Exception as e:
        logger.error(f"Gemini 2.5 Flash Error: {e}")
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
    text_for_ai = raw_content
    if raw_content.startswith("http"):
        metadata = await get_instagram_metadata(raw_content)
        text_for_ai = metadata["raw_text"] if metadata else raw_content
    
    extracted_data = await extract_place_info(text_for_ai)
    return JSONResponse(content={"status": "success", "data": extracted_data})

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
