# LouvorApp Backend - Production Dockerfile
# Builds a slim Python image that runs the FastAPI app with uvicorn.

FROM python:3.11-slim AS base

# Avoid python writing .pyc files and force stdout/stderr to be unbuffered
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# System dependencies (bcrypt needs build tools on some platforms)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (better layer cache)
COPY backend/requirements.txt ./requirements.txt
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy the application source
COPY backend/ ./

# Drop privileges
RUN useradd --create-home --shell /bin/bash app && chown -R app:app /app
USER app

# Expose API port
EXPOSE 8001

# Default env (override at runtime via -e or docker compose)
ENV HOST=0.0.0.0 \
    PORT=8001

# Healthcheck hits the public root of the API
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request,sys; \
        sys.exit(0 if urllib.request.urlopen('http://localhost:8001/api/').status==200 else 1)"

CMD ["sh", "-c", "uvicorn server:app --host ${HOST} --port ${PORT}"]
