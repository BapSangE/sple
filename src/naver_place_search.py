from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import html
import os
import re
from typing import Any

import httpx


LOCAL_SEARCH_URL = "https://openapi.naver.com/v1/search/local.json"


@dataclass
class NaverPlaceMetadata:
    title: str | None
    url: str | None
    category: str | None
    description: str | None
    telephone: str | None
    address: str | None
    road_address: str | None
    mapx: str | None
    mapy: str | None
    match_status: str
    enriched_at: datetime


def _empty_metadata(match_status: str) -> NaverPlaceMetadata:
    return NaverPlaceMetadata(
        title=None,
        url=None,
        category=None,
        description=None,
        telephone=None,
        address=None,
        road_address=None,
        mapx=None,
        mapy=None,
        match_status=match_status,
        enriched_at=datetime.now(timezone.utc),
    )


def _strip_tags(value: str | None) -> str | None:
    if not value:
        return None
    without_tags = re.sub(r"<[^>]+>", "", value)
    return html.unescape(without_tags).strip() or None


def _normalize(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"[^0-9a-zA-Z가-힣]", "", value).lower()


def _to_text(value: Any) -> str | None:
    if value is None or value == "":
        return None
    return str(value)


def search_naver_local_place(name: str, address: str | None = None) -> NaverPlaceMetadata:
    client_id = os.getenv("NAVER_SEARCH_CLIENT_ID")
    client_secret = os.getenv("NAVER_SEARCH_CLIENT_SECRET")

    if not client_id or not client_secret:
        return _empty_metadata("missing_credentials")

    query = " ".join(part.strip() for part in [name, address or ""] if part and part.strip())
    if not query:
        return _empty_metadata("empty_query")

    try:
        response = httpx.get(
            LOCAL_SEARCH_URL,
            params={"query": query, "display": 5, "sort": "random"},
            headers={
                "X-Naver-Client-Id": client_id,
                "X-Naver-Client-Secret": client_secret,
            },
            timeout=5,
        )
        response.raise_for_status()
    except httpx.HTTPError:
        return _empty_metadata("api_error")

    items: list[dict[str, Any]] = response.json().get("items", [])
    if not items:
        return _empty_metadata("not_found")

    normalized_name = _normalize(name)
    selected = items[0]
    match_status = "low_confidence"

    for item in items:
        title = _strip_tags(item.get("title"))
        if normalized_name and normalized_name in _normalize(title):
            selected = item
            match_status = "matched"
            break

    return NaverPlaceMetadata(
        title=_strip_tags(selected.get("title")),
        url=selected.get("link") or None,
        category=_strip_tags(selected.get("category")),
        description=_strip_tags(selected.get("description")),
        telephone=selected.get("telephone") or None,
        address=selected.get("address") or None,
        road_address=selected.get("roadAddress") or None,
        mapx=_to_text(selected.get("mapx")),
        mapy=_to_text(selected.get("mapy")),
        match_status=match_status,
        enriched_at=datetime.now(timezone.utc),
    )
