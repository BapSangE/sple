import pytest
import httpx
import sys
import os

# sys.path 설정
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from main import app
from fastapi.testclient import TestClient
import jwt

client = TestClient(app)

def test_read_main():
    response = client.get("/")
    assert response.status_code == 200
    assert "application/json" in response.headers["content-type"]
    assert response.json()["status"] == "online"

def test_share_target():
    response = client.get("/share-target?text=hello&url=https://www.instagram.com/p/123456789/", follow_redirects=False)
    # Redirects to /?url=https://www.instagram.com/p/123456789/
    assert response.status_code in [302, 307, 303]

@pytest.mark.asyncio
async def test_add_place_text_directly():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        data = {"url": "홍대 카페 어니언 강추! 서울특별시 마포구 어쩌고 123"}
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
        assert not response.json()["data"]

@pytest.mark.asyncio
async def test_get_places_requires_auth():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/places")
        assert response.status_code == 401
        
@pytest.mark.asyncio
async def test_get_places_with_auth():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        # Create a mock token
        secret = os.getenv("NEXTAUTH_SECRET", os.getenv("JWT_SECRET", "super-secret-key-change-me-later"))
        token = jwt.encode({"sub": "1", "email": "test@example.com"}, secret, algorithm="HS256")
        
        response = await ac.get("/api/places", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        assert response.json()["status"] == "success"

