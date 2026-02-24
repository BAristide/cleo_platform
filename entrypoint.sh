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

# ── Initialisation des données de base ───────────────────────
echo "📊 Initialisation des données..."
python manage.py init_accounting --default-currency ${DEFAULT_CURRENCY_CODE:-MAD} 2>/dev/null || echo "  init_accounting : déjà initialisé ou non disponible"
python manage.py init_payroll_data 2>/dev/null || echo "  init_payroll_data : déjà initialisé ou non disponible"
python manage.py create_custom_permissions 2>/dev/null || echo "  create_custom_permissions : déjà initialisé ou non disponible"
python manage.py create_default_roles 2>/dev/null || echo "  create_default_roles : déjà initialisé ou non disponible"

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

# ── Démarrage ────────────────────────────────────────────────
echo "🚀 Démarrage de Cleo ERP..."
exec "$@"
