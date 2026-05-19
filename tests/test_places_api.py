import os
import sys
from uuid import uuid4

import httpx
import pytest
import pytest_asyncio

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "src"))
from database import init_db
from main import app


@pytest_asyncio.fixture(autouse=True)
async def initialized_db():
    await init_db()


@pytest.mark.asyncio
async def test_places_api_saves_and_lists_places_for_a_user():
    user_id = f"test-user-{uuid4()}"
    payload = {
        "user_id": user_id,
        "name": "Sple Test Bar",
        "address": "63 Gojan 1-gil, Danwon-gu, Ansan-si",
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
        assert created["data"]["geocoding_status"] == "pending"

        list_response = await ac.get("/api/places", params={"user_id": user_id})
        assert list_response.status_code == 200
        listed = list_response.json()
        assert listed["status"] == "success"
        assert len(listed["data"]) == 1
        assert listed["data"][0]["name"] == payload["name"]


@pytest.mark.asyncio
async def test_places_api_allows_missing_address_for_name_only_candidates():
    user_id = f"test-user-{uuid4()}"
    payload = {
        "user_id": user_id,
        "name": "Sple Name Only Place",
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
    assert created["data"]["address"] == ""
    assert created["data"]["latitude"] is None
    assert created["data"]["longitude"] is None
    assert created["data"]["geocoding_status"] == "pending"


@pytest.mark.asyncio
async def test_places_api_updates_address_and_coordinates_for_saved_place():
    user_id = f"test-user-{uuid4()}"

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        create_response = await ac.post(
            "/api/places",
            json={"user_id": user_id, "name": "Sple Name Only Place"},
        )
        place_id = create_response.json()["data"]["id"]

        update_response = await ac.patch(
            f"/api/places/{place_id}",
            json={
                "user_id": user_id,
                "name": "Sple Name Only Place",
                "address": "1 Teheran-ro, Gangnam-gu, Seoul",
                "latitude": 37.5666805,
                "longitude": 126.9784147,
                "geocoding_status": "resolved",
            },
        )

    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["status"] == "success"
    assert updated["data"]["address"] == "1 Teheran-ro, Gangnam-gu, Seoul"
    assert updated["data"]["latitude"] == 37.5666805
    assert updated["data"]["longitude"] == 126.9784147
    assert updated["data"]["geocoding_status"] == "resolved"


@pytest.mark.asyncio
async def test_places_api_requires_user_id_when_listing_places():
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        response = await ac.get("/api/places")

    assert response.status_code == 422
