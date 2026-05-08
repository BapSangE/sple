import pytest
import httpx
import sys
import os

# src 경로 추가
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "src"))
from main import app

@pytest.mark.asyncio
async def test_read_root():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/")
        assert response.status_code == 200
        assert response.json()["status"] == "online"

@pytest.mark.asyncio
async def test_add_place_text_directly():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        data = {"url": "성수동 어니언 강추! 서울특별시 성동구 아차산로9길 8"}
        response = await ac.post("/api/analyze", json=data)
        assert response.status_code == 200
        json_data = response.json()
        assert json_data["status"] == "success"
        assert isinstance(json_data["data"], list)
        assert len(json_data["data"]) > 0
        assert "어니언" in json_data["data"][0]["name"]

@pytest.mark.asyncio
async def test_add_place_short_text():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        data = {"url": "a"}
        response = await ac.post("/api/analyze", json=data)
        assert response.status_code == 200
        assert "data" in response.json()

@pytest.mark.asyncio
async def test_get_places_requires_auth():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/places")
        assert response.status_code == 401
