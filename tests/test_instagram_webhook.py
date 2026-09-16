import hashlib
import hmac
import json
from unittest.mock import AsyncMock

import httpx
import pytest

import main


def signed_headers(body: bytes, secret: str = "app-secret"):
    digest = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return {"x-hub-signature-256": f"sha256={digest}"}


async def request(method: str, path: str, **kwargs):
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=main.app), base_url="http://test"
    ) as client:
        return await client.request(method, path, **kwargs)


@pytest.mark.asyncio
async def test_instagram_webhook_verification(monkeypatch):
    monkeypatch.setattr(main, "INSTAGRAM_WEBHOOK_VERIFY_TOKEN", "verify-secret")

    response = await request(
        "GET",
        "/webhooks/instagram?hub.mode=subscribe&hub.verify_token=verify-secret&hub.challenge=123456",
    )

    assert response.status_code == 200
    assert response.text == "123456"


@pytest.mark.asyncio
async def test_instagram_webhook_rejects_invalid_verification(monkeypatch):
    monkeypatch.setattr(main, "INSTAGRAM_WEBHOOK_VERIFY_TOKEN", "verify-secret")

    response = await request(
        "GET",
        "/webhooks/instagram?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123456",
    )

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "WEBHOOK_VERIFICATION_FAILED"


@pytest.mark.asyncio
async def test_instagram_webhook_analyzes_shared_post_once(monkeypatch):
    monkeypatch.setattr(main, "META_APP_SECRET", "app-secret")
    main._instagram_seen_events.clear()
    main._instagram_seen_order.clear()
    process = AsyncMock()
    monkeypatch.setattr(main, "process_instagram_shared_post", process)
    payload = {
        "object": "instagram",
        "entry": [{
            "messaging": [{
                "sender": {"id": "sender-1"},
                "message": {
                    "mid": "mid-1",
                    "attachments": [
                        {"type": "share", "payload": {"title": "legacy"}},
                        {"type": "ig_post", "payload": {
                            "ig_post_media_id": "media-1",
                            "title": "담결 한양대에리카점 추천 글",
                            "url": "https://lookaside.fbsbx.com/signed",
                        }},
                    ],
                },
            }],
        }],
    }
    body = json.dumps(payload).encode()

    first = await request("POST", "/webhooks/instagram", content=body, headers=signed_headers(body))
    second = await request("POST", "/webhooks/instagram", content=body, headers=signed_headers(body))

    assert first.status_code == 200
    assert first.json() == {"status": "accepted", "events": 1}
    assert second.json() == {"status": "accepted", "events": 0}
    process.assert_awaited_once_with(
        "mid-1", "sender-1", {
            "title": "담결 한양대에리카점 추천 글",
            "url": "https://lookaside.fbsbx.com/signed",
            "media_id": "media-1",
        }
    )


@pytest.mark.asyncio
async def test_instagram_webhook_rejects_bad_signature(monkeypatch):
    monkeypatch.setattr(main, "META_APP_SECRET", "app-secret")
    response = await request(
        "POST",
        "/webhooks/instagram",
        content=b'{"object":"instagram"}',
        headers={"x-hub-signature-256": "sha256=wrong"},
    )

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "WEBHOOK_SIGNATURE_INVALID"


@pytest.mark.asyncio
async def test_instagram_webhook_requires_app_secret(monkeypatch):
    monkeypatch.setattr(main, "META_APP_SECRET", None)
    response = await request(
        "POST", "/webhooks/instagram", content=b'{"object":"instagram"}'
    )

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "WEBHOOK_SIGNATURE_INVALID"
