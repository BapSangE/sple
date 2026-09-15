import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock
import httpx
import pytest
import main
import ai_extraction
from ai_extraction import AnalysisLimiter


def fake_client(monkeypatch, result='[]', error=None):
    generate = AsyncMock(return_value=SimpleNamespace(choices=[SimpleNamespace(finish_reason="stop", message=SimpleNamespace(content=result))]), side_effect=error)
    monkeypatch.setattr(main, 'client', SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=generate))))
    return generate


async def analyze(text='성수동 어니언'):
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=main.app), base_url='http://test') as client:
        return await client.post('/api/analyze', json={'text': text})


async def test_extraction_validates_structured_output(monkeypatch):
    generate = fake_client(monkeypatch, '[{"name":" 어니언 ","address":"서울 성동구","category":"Cafe","summary":"카페"}]')
    response = await analyze()
    assert response.status_code == 200
    assert response.json()['data'][0]['name'] == '어니언'
    assert generate.await_args.kwargs['model'] == 'nvidia/nemotron-3-ultra-550b-a55b'
    assert generate.await_args.kwargs['stream'] is False


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


@pytest.mark.parametrize("status,expected", [(200, 200), (401, 502), (429, 429), (500, 502)])
async def test_nvidia_sdk_http_contract(monkeypatch, status, expected):
    import json
    from openai import AsyncOpenAI
    requests = []
    def handle(request):
        requests.append(request)
        payload = json.loads(request.content)
        assert request.url == "https://integrate.api.nvidia.com/v1/chat/completions"
        assert request.headers["authorization"] == "Bearer test-only-key"
        assert payload["model"] == "nvidia/nemotron-3-ultra-550b-a55b"
        assert payload["chat_template_kwargs"] == {"enable_thinking": False}
        assert payload["stream"] is False
        assert payload["messages"][1] == {"role": "user", "content": "성수동 어니언"}
        if status != 200:
            return httpx.Response(status, json={"error": {"message": "secret upstream detail"}})
        return httpx.Response(200, json={
            "id": "test", "object": "chat.completion", "created": 0, "model": payload["model"],
            "choices": [{"index": 0, "finish_reason": "stop", "message": {
                "role": "assistant", "content": "[]", "reasoning_content": "not JSON; never expose this"
            }}],
        })
    async with AsyncOpenAI(api_key="test-only-key", base_url="https://integrate.api.nvidia.com/v1", max_retries=0,
                           http_client=httpx.AsyncClient(transport=httpx.MockTransport(handle))) as sdk:
        monkeypatch.setattr(main, "client", sdk)
        response = await analyze()
    assert response.status_code == expected
    assert len(requests) == 1
    assert "secret upstream detail" not in response.text
    if expected == 200:
        assert response.json()["data"] == []


@pytest.mark.parametrize("choices", [[], [SimpleNamespace(finish_reason="length", message=SimpleNamespace(content="[]"))]])
async def test_incomplete_completion_rejected(monkeypatch, choices):
    generate = fake_client(monkeypatch)
    generate.return_value = SimpleNamespace(choices=choices)
    response = await analyze()
    assert response.status_code == 502
    assert response.json()["detail"]["code"] == "AI_INVALID_RESPONSE"


async def test_sdk_timeout(monkeypatch):
    from openai import APITimeoutError
    fake_client(monkeypatch, error=APITimeoutError(request=httpx.Request("POST", "https://example.test")))
    assert (await analyze()).status_code == 504


async def test_nvidia_initialization_and_shutdown(monkeypatch):
    monkeypatch.setenv("NVIDIA_API_KEY", "test-only-key")
    sdk = SimpleNamespace(close=AsyncMock())
    from unittest.mock import Mock
    factory = Mock(return_value=sdk)
    monkeypatch.setattr(main, "AsyncOpenAI", factory)
    monkeypatch.setattr(main, "init_db", AsyncMock())
    async with main.lifespan(main.app):
        assert main.client is sdk
        assert factory.call_args.kwargs["max_retries"] == 0
        assert factory.call_args.kwargs["api_key"] == "test-only-key"
    sdk.close.assert_awaited_once()


def test_no_key_does_not_fall_back_to_gemini(monkeypatch):
    monkeypatch.delenv("NVIDIA_API_KEY", raising=False)
    monkeypatch.setenv("GEMINI_API_KEY", "unused-key")
    main.init_nvidia_client()
    assert main.client is None
