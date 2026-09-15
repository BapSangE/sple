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
async def test_health_endpoints():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        health_response = await ac.get("/health")
        db_response = await ac.get("/health/db")

    assert health_response.status_code == 200
    assert health_response.json()["status"] == "ok"
    assert db_response.status_code == 200
    assert db_response.json()["status"] == "ok"

@pytest.mark.asyncio
async def test_analyze_endpoint(monkeypatch):
    from unittest.mock import AsyncMock
    monkeypatch.setattr("main.extract_place_info", AsyncMock(return_value=[{"name": "어니언", "address": ""}]))
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        data = {"text": "성수동 어니언"}
        response = await ac.post("/api/analyze", json=data)
        assert response.status_code == 200
        json_data = response.json()
        assert json_data["status"] == "success"
        assert json_data["data"] == [{"name": "어니언", "address": ""}]


@pytest.mark.asyncio
async def test_analyze_endpoint_rejects_url_only_input():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/analyze",
            json={"text": "https://www.instagram.com/p/example/"},
        )

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "TEXT_REQUIRED"
