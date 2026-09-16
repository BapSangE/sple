import asyncio
from uuid import uuid4
import httpx
import pytest
import pytest_asyncio
import main
from database import init_db


@pytest_asyncio.fixture
async def api():
    await init_db()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=main.app), base_url='http://test') as client:
        yield client


async def test_internal_auth_fails_closed(api, monkeypatch):
    monkeypatch.setattr(main, 'BACKEND_API_KEY', None)
    monkeypatch.setenv('APP_ENV', 'production')
    monkeypatch.setenv('ALLOW_INSECURE_LOCAL_AUTH', 'true')
    with pytest.raises(RuntimeError, match='BACKEND_API_KEY'):
        main.validate_security_configuration()
    assert (await api.get('/api/places', params={'user_id': 'owner'})).status_code == 503
    monkeypatch.setattr(main, 'BACKEND_API_KEY', 'test-secret')
    main.validate_security_configuration()
    assert (await api.get('/api/places', params={'user_id': 'owner'})).status_code == 401
    assert (await api.get('/api/places', params={'user_id': 'owner'}, headers={'x-sple-internal-key': 'wrong'})).status_code == 401
    assert (await api.get('/api/places', params={'user_id': 'owner'}, headers={'x-sple-internal-key': 'test-secret'})).status_code == 200


async def test_recovery_only_reads_updates_and_returns_current_users_places(api, monkeypatch):
    owner, other = str(uuid4()), str(uuid4())
    for user_id in (owner, other):
        await api.post('/api/places', json={'user_id': user_id, 'name': user_id, 'address': '서울 강남구'})
    async def geocode(address): return 37.5, 127.0
    monkeypatch.setattr(main, 'geocode_address_via_naver_api', geocode)
    response = await api.post('/api/places/recover-coordinates', json={'user_id': owner})
    assert response.status_code == 200
    data = response.json()['data']
    assert data['total_found'] == data['recovered_count'] == 1
    assert [item['name'] for item in data['details']] == [owner]
    other_places = (await api.get('/api/places', params={'user_id': other})).json()['data']
    assert other_places[0]['latitude'] is None
    assert (await api.post('/api/places/recover-coordinates')).status_code == 422


async def test_failed_recovery_status_is_committed(api, monkeypatch):
    user = str(uuid4())
    await api.post('/api/places', json={'user_id': user, 'name': '카페', 'address': '서울'})
    async def fail(address): return None, None
    monkeypatch.setattr(main, 'geocode_address_via_naver_api', fail)
    await api.post('/api/places/recover-coordinates', json={'user_id': user})
    places = (await api.get('/api/places', params={'user_id': user})).json()['data']
    assert places[0]['geocoding_status'] == 'failed'


async def test_recovery_uses_unique_local_search_coordinates_without_crossing_users(api, monkeypatch):
    from naver_place_search import _empty_metadata
    owner, other = str(uuid4()), str(uuid4())
    for user_id in (owner, other):
        await api.post('/api/places', json={
            'user_id': user_id, 'name': '버터앤쉘터', 'address': '용산 아이파크몰'
        })
    result = _empty_metadata('matched')
    result.mapx = '1269873882'
    result.mapy = '375666103'
    monkeypatch.setattr(main, 'search_naver_local_place', lambda name, address: result)

    response = await api.post('/api/places/recover-coordinates', json={'user_id': owner})

    assert response.json()['data']['recovered_count'] == 1
    owner_place = (await api.get('/api/places', params={'user_id': owner})).json()['data'][0]
    other_place = (await api.get('/api/places', params={'user_id': other})).json()['data'][0]
    assert owner_place['latitude'] == pytest.approx(37.5666103)
    assert owner_place['longitude'] == pytest.approx(126.9873882)
    assert other_place['latitude'] is None


@pytest.mark.parametrize('mapx, mapy', [
    ('not-a-number', '375666103'),
    ('1810000000', '375666103'),
    ('1269873882', '910000000'),
    ('311277', '552097'),
    ('0', '0'),
])
async def test_local_search_invalid_coordinates_are_rejected(monkeypatch, mapx, mapy):
    from naver_place_search import _empty_metadata
    result = _empty_metadata('matched')
    result.mapx = mapx
    result.mapy = mapy
    monkeypatch.setattr(main, 'search_naver_local_place', lambda name, address: result)

    assert await main.resolve_place_coordinates('버터앤쉘터', '용산 아이파크몰') == (None, None)


async def test_local_search_low_confidence_coordinates_are_rejected(monkeypatch):
    from naver_place_search import _empty_metadata
    result = _empty_metadata('low_confidence')
    result.mapx = '1269873882'
    result.mapy = '375666103'
    monkeypatch.setattr(main, 'search_naver_local_place', lambda name, address: result)

    assert await main.resolve_place_coordinates('버터앤쉘터', '용산 아이파크몰') == (None, None)


async def test_create_and_update_use_local_search_coordinate_fallback(api, monkeypatch):
    from naver_place_search import _empty_metadata
    monkeypatch.setenv('NAVER_SEARCH_CLIENT_ID', 'client')
    monkeypatch.setenv('NAVER_SEARCH_CLIENT_SECRET', 'secret')
    coordinates = iter([('1269873882', '375666103'), ('1290756416', '351798863')])

    def search(name, address):
        result = _empty_metadata('matched')
        result.mapx, result.mapy = next(coordinates)
        return result

    monkeypatch.setattr(main, 'search_naver_local_place', search)
    user = str(uuid4())
    created = await api.post('/api/places', json={
        'user_id': user, 'name': '버터앤쉘터', 'address': '용산 아이파크몰'
    })
    place_id = created.json()['data']['id']
    assert created.json()['data']['latitude'] == pytest.approx(37.5666103)
    assert created.json()['data']['geocoding_status'] == 'resolved'

    updated = await api.patch(f'/api/places/{place_id}', json={
        'user_id': user, 'name': '테스트카페', 'address': '부산 해운대구'
    })
    assert updated.json()['data']['latitude'] == pytest.approx(35.1798863)
    assert updated.json()['data']['longitude'] == pytest.approx(129.0756416)
    assert updated.json()['data']['geocoding_status'] == 'resolved'


async def test_save_retries_and_concurrent_requests_do_not_duplicate(api):
    user = str(uuid4())
    payload = {'user_id': user, 'name': '카페', 'request_id': str(uuid4())}
    responses = await asyncio.gather(*(api.post('/api/places', json=payload) for _ in range(3)))
    assert all(response.status_code == 200 for response in responses)
    ids = {response.json()['data']['id'] for response in responses}
    assert len(ids) == 1
    replay = await api.post('/api/places', json=payload)
    assert replay.json()['data']['id'] in ids
    assert len((await api.get('/api/places', params={'user_id': user})).json()['data']) == 1
    other = await api.post('/api/places', json={**payload, 'user_id': str(uuid4())})
    assert other.json()['data']['id'] not in ids


async def test_other_user_cannot_update_or_delete(api):
    owner, other = str(uuid4()), str(uuid4())
    created = await api.post('/api/places', json={'user_id': owner, 'name': 'private'})
    place_id = created.json()['data']['id']
    assert (await api.patch(f'/api/places/{place_id}', json={'user_id': other, 'name': 'changed'})).status_code == 404
    assert (await api.delete(f'/api/places/{place_id}', params={'user_id': other})).status_code == 404
    assert (await api.get('/api/places', params={'user_id': other})).json()['data'] == []


async def test_edit_invalidates_naver_metadata_and_expired_cache_refreshes(api, monkeypatch):
    from datetime import datetime, timezone, timedelta
    from naver_place_search import _empty_metadata
    from database import async_session, Place
    user = str(uuid4())
    created = await api.post('/api/places', json={'user_id': user, 'name': '카페', 'address': '서울'})
    place_id = created.json()['data']['id']
    async with async_session() as db:
        place = await db.get(Place, place_id)
        place.naver_match_status = 'matched'
        place.naver_place_title = 'old'
        place.naver_enriched_at = datetime.now(timezone.utc) - timedelta(days=8)
        await db.commit()
    calls = []
    def search(name, address):
        calls.append(name)
        result = _empty_metadata('matched')
        result.title = 'new'
        return result
    monkeypatch.setattr(main, 'search_naver_local_place', search)
    enriched = await api.post(f'/api/places/{place_id}/enrich', json={'user_id': user})
    assert enriched.json()['data']['naver_place_title'] == 'new'
    await api.post(f'/api/places/{place_id}/enrich', json={'user_id': user})
    assert len(calls) == 1
    updated = await api.patch(f'/api/places/{place_id}', json={'user_id': user, 'name': '새 카페', 'address': '부산'})
    assert updated.json()['data']['naver_place_title'] is None
    assert updated.json()['data']['naver_enriched_at'] is None
