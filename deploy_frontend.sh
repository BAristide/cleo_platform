#!/bin/bash
# deploy_frontend.sh - Script de déploiement pour les mises à jour du frontend Cleo

set -e

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

handle_error() {
    log_error "$1"
    exit 1
}

check_dir() {
    if [ ! -d "$1" ]; then
        handle_error "Le répertoire $1 n'existe pas"
    fi
}

# =========================
# Configuration
# =========================
FRONTEND_DIR=~/cleo_platform/frontend
BUILD_DIR=$FRONTEND_DIR/build
STATIC_DIR=/data/static
PROJECT_DIR=~/cleo_platform
SITE_URL="https://cleo.ecintelligence.ma"

# =========================
# Build React
# =========================
log_info "Voulez-vous construire le projet React ? (y/n)"
read -r BUILD_PROJECT

check_dir "$FRONTEND_DIR"

if [[ "$BUILD_PROJECT" =~ ^[Yy]$ ]]; then
    log_info "Construction du projet React..."
    cd "$FRONTEND_DIR" || handle_error "Impossible d'accéder à $FRONTEND_DIR"
    npm run build || handle_error "Échec de la construction"
    log_success "Build React terminé"
fi

check_dir "$BUILD_DIR"

# =========================
# Stop Gunicorn
# =========================
log_info "Arrêt de Gunicorn..."
sudo systemctl stop gunicorn || handle_error "Impossible d'arrêter Gunicorn"
log_success "Gunicorn arrêté"

# =========================
# Backup
# =========================
BACKUP_DIR=/data/static/backup/$(date +%Y%m%d_%H%M%S)
log_info "Sauvegarde vers $BACKUP_DIR..."
sudo mkdir -p "$BACKUP_DIR"
sudo cp -r "$STATIC_DIR"/* "$BACKUP_DIR"/ 2>/dev/null || log_warning "Aucun fichier à sauvegarder"
log_success "Backup terminé"

# =========================
# Nettoyage ancien static
# =========================
log_info "Suppression des anciens fichiers statiques..."
sudo rm -rf "$STATIC_DIR"/*
log_success "Nettoyage terminé"

# =========================
# Copie nouveau build
# =========================
log_info "Copie des nouveaux fichiers..."
sudo cp -r "$BUILD_DIR/static"/* "$STATIC_DIR"/
sudo cp "$BUILD_DIR"/*.* "$STATIC_DIR"/ 2>/dev/null || true
log_success "Nouveaux fichiers copiés"

# =========================
# Permissions
# =========================
log_info "Mise à jour des permissions..."
sudo chown -R kni:www-data "$STATIC_DIR"
sudo find "$STATIC_DIR" -type f -exec chmod 644 {} \;
sudo find "$STATIC_DIR" -type d -exec chmod 755 {} \;
log_success "Permissions mises à jour"

# =========================
# Restart Gunicorn
# =========================
log_info "Redémarrage de Gunicorn..."
sudo systemctl start gunicorn || handle_error "Impossible de démarrer Gunicorn"
log_success "Gunicorn redémarré"

# =========================
# Collectstatic Django
# =========================
log_info "Collecte des fichiers statiques Django..."
cd "$PROJECT_DIR" || handle_error "Impossible d'accéder au projet Django"
source "$PROJECT_DIR/venv/bin/activate" || handle_error "Impossible d'activer le venv"
python manage.py collectstatic --noinput || handle_error "collectstatic a échoué"
log_success "collectstatic terminé"

# =========================
# Healthcheck
# =========================
log_info "Vérification de l'application..."
HTTP_CODE=$(curl -k -s -o /dev/null -w "%{http_code}" "$SITE_URL" || true)

if echo "$HTTP_CODE" | grep -qE "200|302"; then
    log_success "Application accessible (HTTP $HTTP_CODE)"
else
    log_warning "Application inaccessible (HTTP $HTTP_CODE)"
fi

# =========================
# Fin
# =========================
log_info "-----------------------------------"
log_success "Déploiement terminé avec succès"
log_info "-----------------------------------"
log_info "Application: $SITE_URL"
log_info "Pensez à vider le cache navigateur (Ctrl+F5)"
log_info "-----------------------------------"
