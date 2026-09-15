from pathlib import Path


def test_backend_deploy_passes_naver_search_credentials_to_ecs_task():
    deploy_workflow = Path(".github/workflows/deploy.yml").read_text(encoding="utf-8")

    assert "NAVER_SEARCH_CLIENT_ID=${{ secrets.NAVER_SEARCH_CLIENT_ID }}" in deploy_workflow
    assert "NAVER_SEARCH_CLIENT_SECRET=${{ secrets.NAVER_SEARCH_CLIENT_SECRET }}" in deploy_workflow


def test_backend_deploy_passes_nvidia_key():
    workflow = Path(".github/workflows/deploy.yml").read_text(encoding="utf-8")
    assert "NVIDIA_API_KEY=${{ secrets.NVIDIA_API_KEY }}" in workflow
    assert "GEMINI_API_KEY" not in workflow
