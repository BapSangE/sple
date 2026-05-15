import os
import sys
from uuid import uuid4

import httpx
import pytest
import pytest_asyncio

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "src"))
from main import app
from database import init_db


@pytest_asyncio.fixture(autouse=True)
async def initialized_db():
    await init_db()


@pytest.mark.asyncio
async def test_places_api_saves_and_lists_places_for_a_user():
    user_id = f"test-user-{uuid4()}"
    payload = {
        "user_id": user_id,
        "name": "어니언 성수",
        "address": "서울 성동구 아차산로9길 8",
    }

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        create_response = await ac.post("/api/places", json=payload)
        assert create_response.status_code == 200
        created = create_response.json()
        assert created["status"] == "success"
        assert created["data"]["name"] == payload["name"]
        assert created["data"]["address"] == payload["address"]
        assert created["data"]["user_id"] == user_id

        list_response = await ac.get("/api/places", params={"user_id": user_id})
        assert list_response.status_code == 200
        listed = list_response.json()
        assert listed["status"] == "success"
        assert len(listed["data"]) == 1
        assert listed["data"][0]["name"] == payload["name"]


@pytest.mark.asyncio
async def test_places_api_requires_user_id_when_listing_places():
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        response = await ac.get("/api/places")

    assert response.status_code == 422
