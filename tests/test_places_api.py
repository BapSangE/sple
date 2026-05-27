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


@pytest.mark.asyncio
async def test_places_enrich_api_stores_naver_metadata_for_owned_place(monkeypatch):
    user_id = f"test-user-{uuid4()}"

    class FakeMetadata:
        title = "덮밥장사장 강남점"
        url = "https://example.com/naver-place"
        category = "음식점>일식"
        description = "덮밥 전문점"
        telephone = "02-0000-0000"
        address = "서울 강남구"
        road_address = "서울 강남구 테헤란로"
        mapx = "3"
        mapy = "4"
        match_status = "matched"
        enriched_at = None

    def fake_search(name, address):
        assert name == "덮밥장사장"
        assert address == "서울 강남구"
        return FakeMetadata()

    monkeypatch.setattr("main.search_naver_local_place", fake_search)

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        create_response = await ac.post(
            "/api/places",
            json={
                "user_id": user_id,
                "name": "덮밥장사장",
                "address": "서울 강남구",
            },
        )
        place_id = create_response.json()["data"]["id"]

        enrich_response = await ac.post(
            f"/api/places/{place_id}/enrich",
            json={"user_id": user_id},
        )

    assert enrich_response.status_code == 200
    enriched = enrich_response.json()
    assert enriched["status"] == "success"
    assert enriched["data"]["naver_place_title"] == "덮밥장사장 강남점"
    assert enriched["data"]["naver_place_url"] == "https://example.com/naver-place"
    assert enriched["data"]["naver_category"] == "음식점>일식"
    assert enriched["data"]["naver_match_status"] == "matched"


@pytest.mark.asyncio
async def test_places_enrich_api_rejects_other_users(monkeypatch):
    owner_id = f"test-user-{uuid4()}"
    other_user_id = f"test-user-{uuid4()}"

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        create_response = await ac.post(
            "/api/places",
            json={
                "user_id": owner_id,
                "name": "Sple Private Place",
                "address": "서울",
            },
        )
        place_id = create_response.json()["data"]["id"]

        enrich_response = await ac.post(
            f"/api/places/{place_id}/enrich",
            json={"user_id": other_user_id},
        )

    assert enrich_response.status_code == 404


@pytest.mark.asyncio
async def test_places_enrich_api_retries_transient_missing_credentials_status(monkeypatch):
    user_id = f"test-user-{uuid4()}"

    class MissingCredentialsMetadata:
        title = None
        url = None
        category = None
        description = None
        telephone = None
        address = None
        road_address = None
        mapx = None
        mapy = None
        match_status = "missing_credentials"
        enriched_at = None

    class MatchedMetadata:
        title = "Retry Success Place"
        url = "https://example.com/retry"
        category = "음식점"
        description = None
        telephone = None
        address = "서울"
        road_address = "서울 중구"
        mapx = None
        mapy = None
        match_status = "matched"
        enriched_at = None

    metadata_sequence = [MissingCredentialsMetadata(), MatchedMetadata()]

    def fake_search(name, address):
        return metadata_sequence.pop(0)

    monkeypatch.setattr("main.search_naver_local_place", fake_search)

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        create_response = await ac.post(
            "/api/places",
            json={
                "user_id": user_id,
                "name": "Retry Place",
                "address": "서울",
            },
        )
        place_id = create_response.json()["data"]["id"]

        first_response = await ac.post(
            f"/api/places/{place_id}/enrich",
            json={"user_id": user_id},
        )
        second_response = await ac.post(
            f"/api/places/{place_id}/enrich",
            json={"user_id": user_id},
        )

    assert first_response.status_code == 200
    assert first_response.json()["data"]["naver_match_status"] == "missing_credentials"
    assert second_response.status_code == 200
    assert second_response.json()["data"]["naver_match_status"] == "matched"
    assert second_response.json()["data"]["naver_place_title"] == "Retry Success Place"
