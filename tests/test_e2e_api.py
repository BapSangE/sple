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
async def test_analyze_endpoint():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        data = {"url": "성수동 어니언"}
        response = await ac.post("/api/analyze", json=data)
        assert response.status_code == 200
        json_data = response.json()
        assert json_data["status"] == "success"
        if json_data["data"]:
            assert isinstance(json_data["data"], list)
            assert "name" in json_data["data"][0]
