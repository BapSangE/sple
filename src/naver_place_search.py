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


def _address_tokens(value: str | None) -> set[str]:
    text = value or ""
    for long, short in [("서울특별시", "서울"), ("부산광역시", "부산"),
                        ("대구광역시", "대구"), ("인천광역시", "인천"),
                        ("광주광역시", "광주"), ("대전광역시", "대전"),
                        ("울산광역시", "울산"), ("경기도", "경기")]:
        text = text.replace(long, short)
    return {token for part in text.split() if (token := _normalize(part))}


def _location_score(address: str | None, item: dict) -> float:
    expected = _address_tokens(address)
    if not expected:
        return 0
    searchable = {
        token
        for field in ("title", "address", "roadAddress")
        for token in _address_tokens(_strip_tags(item.get(field)))
    }
    matched = sum(
        token in searchable if token.isdigit() else any(token in value for value in searchable)
        for token in expected
    )
    return matched / len(expected)


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

    try:
        items = response.json().get("items", [])
        if not isinstance(items, list) or any(not isinstance(item, dict) for item in items):
            return _empty_metadata("api_error")
    except (ValueError, AttributeError):
        return _empty_metadata("api_error")
    if not items:
        return _empty_metadata("not_found")

    normalized_name = _normalize(name)
    candidates = [item for item in items if normalized_name and
                  normalized_name in _normalize(_strip_tags(item.get("title")))]
    selected = max(candidates or items, key=lambda item: _location_score(address, item))
    match_status = "low_confidence"
    if candidates and len(_address_tokens(address)) >= 2 and _location_score(address, selected) == 1:
        # The name and every location token must identify exactly one result. Location text may
        # be a landmark in the title rather than a postal address.
        if sum(_location_score(address, item) == 1 for item in candidates) == 1:
            match_status = "matched"

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
