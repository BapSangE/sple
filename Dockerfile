# 1단계: 빌드 스테이지
FROM python:3.12-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates

# uv 설치
ADD https://astral.sh/uv/install.sh /uv-installer.sh
RUN sh /uv-installer.sh && rm /uv-installer.sh
ENV PATH="/root/.local/bin:$PATH"

WORKDIR /app

# 의존성 설치
COPY pyproject.toml uv.lock ./
ENV PATH="/root/.local/bin:$PATH"
RUN uv sync --frozen --no-dev

# 2단계: 실행 스테이지
FROM python:3.12-slim

WORKDIR /app

# 빌드 결과물 복사
COPY --from=builder /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

# 소스 코드 및 필요 리소스 복사
COPY src/ /app/src/
# 정적 파일 경로가 필요한 경우 (없으면 생략 가능)
# COPY src/static /app/src/static 

# 포트 설정
EXPOSE 8000

# 실행
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
