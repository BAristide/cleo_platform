#!/bin/bash
set -e

# ── Attente de PostgreSQL ────────────────────────────────────
echo "⏳ Attente de PostgreSQL (${DB_HOST}:${DB_PORT:-5432})..."
MAX_RETRIES=30
RETRY=0
while ! python -c "
import psycopg2
psycopg2.connect(
    dbname='${DB_NAME}',
    user='${DB_USER}',
    password='${DB_PASSWORD}',
    host='${DB_HOST}',
    port='${DB_PORT:-5432}'
)
" 2>/dev/null; do
    RETRY=$((RETRY + 1))
    if [ $RETRY -ge $MAX_RETRIES ]; then
        echo "❌ PostgreSQL n'est pas disponible après ${MAX_RETRIES} tentatives."
        exit 1
    fi
    echo "  Tentative ${RETRY}/${MAX_RETRIES}..."
    sleep 2
done
echo "✅ PostgreSQL est prêt."

# ── Migrations ───────────────────────────────────────────────
echo "🔄 Application des migrations..."
python manage.py migrate --noinput

# ── Fichiers statiques ───────────────────────────────────────
echo "📦 Collecte des fichiers statiques Django..."
python manage.py collectstatic --noinput

echo "📦 Copie des fichiers frontend React..."
cp -rf /app/frontend/build/static/* /data/static/ 2>/dev/null || true

for f in favicon.ico manifest.json logo192.png logo512.png robots.txt; do
    cp /app/frontend/build/$f /data/static/ 2>/dev/null || true
done

# ── Setup initial (Localization Packs v2.0) ──────────────────
if [ -n "${DEFAULT_COUNTRY}" ]; then
    echo "🌍 Mode headless : chargement du pack ${DEFAULT_COUNTRY}..."
    python manage.py init_setup \
        --country "${DEFAULT_COUNTRY}" \
        --company-name "${COMPANY_NAME:-Mon Entreprise}" \
        ${INSTALL_DEMO_DATA:+--demo} \
        2>/dev/null || echo "  init_setup : déjà initialisé ou non disponible"
else
    echo "🧙 Mode wizard : configuration via navigateur"
    python manage.py init_setup --check-only \
        2>/dev/null || echo "  En attente de configuration"
fi

# ── Superuser ────────────────────────────────────────────────
echo "👤 Vérification du superuser..."
python manage.py shell -c "
from django.contrib.auth.models import User

email = '${DJANGO_SUPERUSER_EMAIL:-admin@cleo.local}'

if not User.objects.filter(is_superuser=True).exists():
    User.objects.create_superuser(
        username=email,
        email=email,
        password='${DJANGO_SUPERUSER_PASSWORD:-admin}'
    )
    print(f'  ✅ Superuser créé : {email}')
    print('  ⚠️  CHANGEZ LE MOT DE PASSE IMMÉDIATEMENT')
else:
    print('  ℹ️  Un superuser existe déjà.')
"

# ── Rôles et permissions par défaut ────────────────────────────
echo "🔐 Vérification des rôles et permissions..."
python manage.py create_default_roles 2>/dev/null || echo "  Rôles : commande non disponible"
python manage.py create_custom_permissions 2>/dev/null || echo "  Permissions : commande non disponible"

# ── Démarrage ────────────────────────────────────────────────
echo "🚀 Démarrage de Cleo ERP..."
exec "$@"
