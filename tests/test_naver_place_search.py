import os
import sys

import pytest

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "src"))

from naver_place_search import search_naver_local_place


def test_search_naver_local_place_returns_missing_credentials(monkeypatch):
    monkeypatch.delenv("NAVER_SEARCH_CLIENT_ID", raising=False)
    monkeypatch.delenv("NAVER_SEARCH_CLIENT_SECRET", raising=False)

    result = search_naver_local_place("덮밥장사장", "서울 강남구")

    assert result.match_status == "missing_credentials"
    assert result.title is None


def test_search_naver_local_place_strips_html_and_selects_matching_title(monkeypatch):
    monkeypatch.setenv("NAVER_SEARCH_CLIENT_ID", "client")
    monkeypatch.setenv("NAVER_SEARCH_CLIENT_SECRET", "secret")

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "items": [
                    {
                        "title": "<b>다른가게</b>",
                        "link": "https://example.com/other",
                        "category": "음식점&gt;한식",
                        "description": "",
                        "telephone": "",
                        "address": "서울",
                        "roadAddress": "서울",
                        "mapx": "1",
                        "mapy": "2",
                    },
                    {
                        "title": "<b>덮밥장사장</b> 강남점",
                        "link": "https://example.com/matched",
                        "category": "음식점&gt;일식",
                        "description": "<b>덮밥</b> 전문점",
                        "telephone": "02-0000-0000",
                        "address": "서울 강남구",
                        "roadAddress": "서울 강남구 테헤란로",
                        "mapx": "3",
                        "mapy": "4",
                    },
                ]
            }

    captured = {}

    def fake_get(url, params, headers, timeout):
        captured["url"] = url
        captured["params"] = params
        captured["headers"] = headers
        captured["timeout"] = timeout
        return FakeResponse()

    monkeypatch.setattr("naver_place_search.httpx.get", fake_get)

    result = search_naver_local_place("덮밥장사장", "서울 강남구")

    assert result.title == "덮밥장사장 강남점"
    assert result.category == "음식점>일식"
    assert result.description == "덮밥 전문점"
    assert result.telephone == "02-0000-0000"
    assert result.road_address == "서울 강남구 테헤란로"
    assert result.mapx == "3"
    assert result.mapy == "4"
    assert result.match_status == "matched"
    assert captured["params"]["query"] == "덮밥장사장 서울 강남구"
    assert captured["headers"]["X-Naver-Client-Id"] == "client"
    assert captured["headers"]["X-Naver-Client-Secret"] == "secret"
    assert captured["timeout"] == 5


def test_search_naver_local_place_returns_not_found(monkeypatch):
    monkeypatch.setenv("NAVER_SEARCH_CLIENT_ID", "client")
    monkeypatch.setenv("NAVER_SEARCH_CLIENT_SECRET", "secret")

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"items": []}

    monkeypatch.setattr("naver_place_search.httpx.get", lambda *args, **kwargs: FakeResponse())

    result = search_naver_local_place("없는가게", "서울")

    assert result.match_status == "not_found"
    assert result.title is None


@pytest.mark.parametrize("address, expected, status", [
    ("서울특별시 성동구", "서울 성동구", "matched"),
    ("부산 해운대구", "서울 강남구", "low_confidence"),
    ("", "서울 강남구", "low_confidence"),
])
def test_same_brand_requires_matching_region(monkeypatch, address, expected, status):
    monkeypatch.setenv("NAVER_SEARCH_CLIENT_ID", "client")
    monkeypatch.setenv("NAVER_SEARCH_CLIENT_SECRET", "secret")
    class Response:
        def raise_for_status(self): pass
        def json(self):
            return {"items": [{"title": "테스트카페", "address": addr} for addr in ("서울 강남구", "서울 성동구")]}
    monkeypatch.setattr("naver_place_search.httpx.get", lambda *args, **kwargs: Response())
    result = search_naver_local_place("테스트카페", address)
    assert result.address == expected
    assert result.match_status == status
