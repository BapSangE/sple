import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock
import httpx
import pytest
import main
import ai_extraction
from ai_extraction import AnalysisLimiter


def fake_client(monkeypatch, result='[]', error=None):
    generate = AsyncMock(return_value=SimpleNamespace(text=result), side_effect=error)
    monkeypatch.setattr(main, 'client', SimpleNamespace(aio=SimpleNamespace(models=SimpleNamespace(generate_content=generate))))
    return generate


async def analyze(text='성수동 어니언'):
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=main.app), base_url='http://test') as client:
        return await client.post('/api/analyze', json={'text': text})


async def test_extraction_validates_structured_output(monkeypatch):
    generate = fake_client(monkeypatch, '[{"name":" 어니언 ","address":"서울 성동구","category":"Cafe","summary":"카페"}]')
    response = await analyze()
    assert response.status_code == 200
    assert response.json()['data'][0]['name'] == '어니언'
    assert generate.await_args.kwargs['config']['response_mime_type'] == 'application/json'


async def test_empty_extraction_is_success(monkeypatch):
    fake_client(monkeypatch)
    response = await analyze()
    assert response.status_code == 200
    assert response.json()['data'] == []


@pytest.mark.parametrize('result', ['not json', 'null', '[{}]', '[{"name":42}]', '[{"name":"카페","category":"Invalid"}]', '[{"name":"카페","summary":"' + 'x' * 81 + '"}]'])
async def test_invalid_ai_output_is_not_success(monkeypatch, result):
    fake_client(monkeypatch, result)
    response = await analyze()
    assert response.status_code == 502
    assert response.json()['detail']['code'] == 'AI_INVALID_RESPONSE'


async def test_missing_ai_configuration_is_service_error():
    response = await analyze()
    assert response.status_code == 503
    assert response.json()['detail']['code'] == 'AI_NOT_CONFIGURED'


async def test_ai_failure_is_service_error(monkeypatch):
    fake_client(monkeypatch, error=RuntimeError('upstream failure'))
    response = await analyze()
    assert response.status_code == 502
    assert response.json()['detail']['code'] == 'AI_UNAVAILABLE'


async def test_slow_ai_does_not_block_health_and_is_cancelled(monkeypatch):
    started, cancelled = asyncio.Event(), asyncio.Event()
    async def slow(**kwargs):
        started.set()
        try:
            await asyncio.sleep(60)
        finally:
            cancelled.set()
    generate = fake_client(monkeypatch)
    generate.side_effect = slow
    monkeypatch.setattr(ai_extraction, 'AI_TIMEOUT_SECONDS', 0.1)
    task = asyncio.create_task(analyze())
    await started.wait()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=main.app), base_url='http://test') as client:
        health = await client.get('/health')
    assert health.status_code == 200
    assert not task.done()
    assert (await task).status_code == 504
    assert cancelled.is_set()
    assert ai_extraction.analysis_limiter.active == 0


async def test_rate_limit_and_input_limit(monkeypatch):
    generate = fake_client(monkeypatch)
    monkeypatch.setattr(ai_extraction, 'analysis_limiter', AnalysisLimiter(per_minute=1))
    assert (await analyze('x' * 10_001)).status_code == 422
    assert generate.await_count == 0
    assert (await analyze()).status_code == 200
    assert (await analyze()).status_code == 429
    assert generate.await_count == 1


async def test_concurrency_limit_releases_slot():
    limiter = AnalysisLimiter(concurrency=1)
    async with limiter.slot():
        with pytest.raises(main.HTTPException) as error:
            async with limiter.slot():
                pytest.fail('second call should be rejected')
        assert error.value.status_code == 429
    assert limiter.active == 0
