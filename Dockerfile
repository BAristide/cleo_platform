# ============================================================
# Cleo ERP — Dockerfile multi-stage
# Stage 1 : Build React frontend
# Stage 2 : Django + Gunicorn + WeasyPrint
# ============================================================

# ── Stage 1 : Frontend build ─────────────────────────────────
FROM node:18-alpine AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# ── Stage 2 : Backend ────────────────────────────────────────
FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Dépendances système (WeasyPrint + PostgreSQL + healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    libpq-dev \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Code applicatif
COPY . .

# Écraser avec le frontend fraîchement compilé
COPY --from=frontend /frontend/build/ /app/frontend/build/
COPY --from=frontend /frontend/build/index.html /app/templates/index.html

# Répertoires de données
RUN mkdir -p /data/static /data/media

# Entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["gunicorn", \
     "--workers", "3", \
     "--bind", "0.0.0.0:8000", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "cleo_platform.wsgi:application"]
