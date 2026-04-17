from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
import os
import logging
from dotenv import load_dotenv
import httpx
from bs4 import BeautifulSoup
from google import genai
import json
import re

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# .env 파일 로드
load_dotenv()

# 환경 변수 설정
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
FB_VERIFY_TOKEN = os.getenv("FB_VERIFY_TOKEN", "sple_default_token")
IG_PAGE_ACCESS_TOKEN = os.getenv("IG_PAGE_ACCESS_TOKEN")

client = None
if GEMINI_API_KEY:
    client = genai.Client(api_key=GEMINI_API_KEY)
else:
    logger.warning("GEMINI_API_KEY가 설정되지 않았습니다.")

app = FastAPI(title="Sple MVP")

# 현재 파일의 디렉토리 경로 가져오기
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 정적 파일 및 템플릿 설정
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))

# PWA 필수 파일들을 루트에서 제공 (404 방지)
@app.get("/sw.js")
async def get_sw():
    return FileResponse(os.path.join(BASE_DIR, "static", "sw.js"))

@app.get("/manifest.json")
async def get_manifest():
    return FileResponse(os.path.join(BASE_DIR, "static", "manifest.json"))

# 장소 추가 요청 모델
class PlaceRequest(BaseModel):
    url: str

async def get_instagram_metadata(url: str):
    """인스타그램 본문을 가져오기 위해 여러 기법을 순차적으로 시도합니다."""
    # 쿼리 스트링 제거하여 순수 URL 확보
    clean_url = url.split('?')[0]
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7"
    }

    try:
        async with httpx.AsyncClient() as client_http:
            # 1. Jina Reader 시도
            reader_url = f"https://r.jina.ai/{clean_url}"
            logger.info(f"Checking Jina Reader for: {clean_url}")
            response = await client_http.get(reader_url, headers=headers, timeout=12.0)

            if response.status_code == 200 and "Instagram" in response.text and len(response.text) > 300:
                logger.info("Successfully fetched via Jina Reader")
                return {"raw_text": response.text}

            # 2. Jina 실패 시 직접 스크래핑 시도
            logger.info("Jina failed or blocked. Trying direct meta-tag extraction...")
            response = await client_http.get(clean_url, headers=headers, follow_redirects=True, timeout=10.0)

            if response.status_code == 429:
                logger.warning("Instagram blocked direct request (429)")
                return None

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
    """Gemini를 사용하여 장소 정보를 추출합니다."""
    if not client or not text: return None

    prompt = f"""
    아래 인스타그램 게시물 정보(텍스트)에서 언급된 맛집이나 핫플레이스의 정보를 추출해줘.
    텍스트에 주소가 없더라도 상호명과 지역명(예: 성수, 한남)이 있다면 가장 유력한 한국 내 주소를 유추해줘.

    응답 형식은 반드시 아래 JSON 구조로만 해줘:
    {{
      "name": "상호명",
      "address": "행정구역 주소 (도로명 또는 지번)",
      "description": "장소에 대한 한 줄 요약"
    }}

    텍스트 정보:
    \"\"\"{text}\"\"\"
    """

    try:
        response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        json_match = re.search(r'\{.*\}', response.text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
    except Exception as e:
        logger.error(f"Gemini error: {e}")
    return None

async def send_ig_reply(recipient_id: str, message_text: str):
    """인스타그램 DM으로 자동 답장을 보냅니다."""
    if not IG_PAGE_ACCESS_TOKEN: return
    url = f"https://graph.facebook.com/v19.0/me/messages?access_token={IG_PAGE_ACCESS_TOKEN}"
    payload = {"recipient": {"id": recipient_id}, "message": {"text": message_text}}
    async with httpx.AsyncClient() as client_http:
        await client_http.post(url, json=payload)

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request, url: str = None):
    kakao_api_key = os.getenv("KAKAO_JAVASCRIPT_APP_KEY", "")
    return templates.TemplateResponse(request=request, name="index.html", context={"kakao_api_key": kakao_api_key, "shared_url": url})

@app.get("/share-target")
async def share_target(request: Request, text: str = None, url: str = None):
    shared_content = f"{text or ''} {url or ''}"
    match = re.search(r'https://www.instagram.com/[^\s]+', shared_content)
    target_url = match.group(0) if match else None
    return RedirectResponse(url=f"/?url={target_url}" if target_url else "/")

# --- Instagram DM Webhook ---

@app.get("/api/webhook/instagram")
async def verify_webhook(request: Request):
    """Meta의 Webhook 검증(Hub Challenge) 처리"""
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode == "subscribe" and token == FB_VERIFY_TOKEN:
        logger.info("Webhook verified successfully!")
        return int(challenge)
    raise HTTPException(status_code=403, detail="Verification failed")

@app.post("/api/webhook/instagram")
async def handle_webhook(request: Request):
    """실제 DM 메시지 수신 처리"""
    data = await request.json()
    logger.info(f"Webhook received: {json.dumps(data)}")

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
                            extracted = await extract_place_info(metadata["raw_text"])
                            if extracted:
                                await send_ig_reply(sender_id, f"✅ '{extracted['name']}' 정보를 스플 지도에 추가했어요!")
                            else:
                                await send_ig_reply(sender_id, "📍 장소 정보는 확인했지만 상세 주소를 찾지 못했어요.")
                        else:
                            await send_ig_reply(sender_id, "😅 링크를 읽지 못했습니다. 본문을 복사해서 앱에 넣어주세요!")

    except Exception as e:
        logger.error(f"Webhook processing error: {e}")
    return JSONResponse(content={"status": "ok"})

@app.post("/api/add-place")
async def add_place(request: PlaceRequest):
    # 로깅을 통해 수신된 데이터 확인
    logger.info(f"수신된 데이터: {request.url[:50]}...") 
    
    raw_content = request.url.strip()
    
    if len(raw_content) < 2:
        logger.error("입력 내용이 너무 짧음")
        raise HTTPException(status_code=400, detail="분석할 내용을 입력해 주세요.")

    # 1. URL 형태인 경우 메타데이터 추출 시도
    if raw_content.startswith("http") and "instagram.com" in raw_content:
        logger.info("URL 감지: 메타데이터 추출 시작")
        metadata = await get_instagram_metadata(raw_content)
        if not metadata:
            return JSONResponse(content={
                "status": "error", 
                "message": "인스타그램 차단으로 링크를 읽지 못했습니다. 본문 내용을 직접 복사해서 넣어주세요!"
            })
        text_for_ai = metadata["raw_text"]
    else:
        # 2. 일반 텍스트인 경우 그대로 사용
        logger.info("텍스트 본문 감지: 직접 AI 분석 시작")
        text_for_ai = raw_content

    # AI 정보 추출
    extracted_data = await extract_place_info(text_for_ai)

    if not extracted_data or not extracted_data.get("name"):
        logger.warning("AI 분석 결과 없음")
        return JSONResponse(content={
            "status": "error", 
            "message": "장소 정보를 찾지 못했습니다. 맛집 이름이 포함된 본문을 다시 넣어주세요!"
        })

    logger.info(f"분석 성공: {extracted_data['name']}")
    return JSONResponse(content={"status": "success", "data": extracted_data})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

