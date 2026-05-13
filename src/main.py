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
GCP_SA_KEY_JSON = os.getenv("GCP_SA_KEY_JSON")
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID", "insta-place-493505")
GCP_LOCATION = os.getenv("GCP_LOCATION", "us-central1")
FB_VERIFY_TOKEN = os.getenv("FB_VERIFY_TOKEN", "sple_default_token")
IG_PAGE_ACCESS_TOKEN = os.getenv("IG_PAGE_ACCESS_TOKEN")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://sple-insta.com")

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
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PlaceRequest(BaseModel):
    url: str

class PlaceItem(BaseModel):
    user_id: str
    name: str
    address: str
    category: str = "All"
    rating: Optional[float] = None
    summary: Optional[str] = None

async def extract_place_info(text: str):
    if not client:
        return None
    prompt = f"당신은 장소 추출 AI입니다. 텍스트에서 상호명과 주소를 JSON 배열로 추출하세요. 텍스트: {text}"
    try:
        response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        match = re.search(r'\[.*\]', response.text, re.DOTALL)
        if match: return json.loads(match.group())
    except Exception as e:
        logger.error(f"AI Error: {e}")
    return None

@app.get("/")
async def read_root():
    return {"status": "online", "message": "Sple Reboot API is running"}

@app.post("/api/analyze")
async def analyze_place_api(request: PlaceRequest):
    extracted_data = await extract_place_info(request.url)
    return JSONResponse(content={"status": "success", "data": extracted_data})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
