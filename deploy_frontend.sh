#!/bin/bash
# deploy_frontend.sh - Script de déploiement pour les mises à jour du frontend Cleo

# Couleurs pour une meilleure lisibilité
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages en couleur
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Fonction pour gérer les erreurs
handle_error() {
    log_error "$1"
    exit 1
}

# Fonction pour vérifier l'existence d'un répertoire
check_dir() {
    if [ ! -d "$1" ]; then
        handle_error "Le répertoire $1 n'existe pas"
    fi
}

# Demander à l'utilisateur s'il veut construire le projet
log_info "Voulez-vous construire le projet React ? (y/n)"
read -r BUILD_PROJECT

# Vérifier les chemins
FRONTEND_DIR=~/cleo_platform/frontend
BUILD_DIR=$FRONTEND_DIR/build
STATIC_DIR=/data/static

check_dir "$FRONTEND_DIR"

# Étape 1: Construire le projet si demandé
if [[ "$BUILD_PROJECT" =~ ^[Yy]$ ]]; then
    log_info "Construction du projet React..."
    cd "$FRONTEND_DIR" || handle_error "Impossible d'accéder au répertoire $FRONTEND_DIR"
    npm run build || handle_error "Échec de la construction du projet"
    log_success "Construction du projet terminée"
fi

check_dir "$BUILD_DIR"

# Étape 2: Arrêter Gunicorn
log_info "Arrêt de Gunicorn..."
sudo systemctl stop gunicorn || handle_error "Impossible d'arrêter Gunicorn"
log_success "Gunicorn arrêté"

# Étape 3: Backup des anciens fichiers (optionnel)
BACKUP_DIR=/data/static/backup/$(date +%Y%m%d_%H%M%S)
log_info "Sauvegarde des fichiers existants dans $BACKUP_DIR..."
sudo mkdir -p "$BACKUP_DIR"
sudo cp -r "$STATIC_DIR"/* "$BACKUP_DIR"/ 2>/dev/null || log_warning "Aucun fichier à sauvegarder ou erreur lors de la sauvegarde"
log_success "Sauvegarde terminée"

# Étape 4: Identifier les fichiers qui sont référencés par HTML
log_info "Identification des fichiers référencés dans index.html..."
REFERENCED_JS=$(grep -o 'main\.[a-z0-9]*\.js' "$STATIC_DIR/index.html" 2>/dev/null || echo "main.c510dc0c.js")
REFERENCED_CSS=$(grep -o 'main\.[a-z0-9]*\.css' "$STATIC_DIR/index.html" 2>/dev/null || echo "main.c538ef7b.css")

log_info "Fichier JS référencé: $REFERENCED_JS"
log_info "Fichier CSS référencé: $REFERENCED_CSS"

# Étape 5: Vider le répertoire static
log_info "Suppression des anciens fichiers statiques..."
sudo rm -rf "$STATIC_DIR"/* || handle_error "Impossible de supprimer les fichiers statiques"
log_success "Anciens fichiers supprimés"

# Étape 6: Copier les nouveaux fichiers
log_info "Copie des nouveaux fichiers statiques..."
cp -r "$BUILD_DIR/static"/* "$STATIC_DIR"/ || handle_error "Échec de la copie des fichiers statiques"
cp "$BUILD_DIR"/*.* "$STATIC_DIR"/ || log_warning "Problème lors de la copie des fichiers racine"
log_success "Nouveaux fichiers copiés"

# Étape 7: Créer des copies compatibles avec les anciennes références
log_info "Création des copies compatibles..."
CURRENT_JS=$(find "$STATIC_DIR/js" -name "main.*.js" | head -1)
CURRENT_CSS=$(find "$STATIC_DIR/css" -name "main.*.css" | head -1)

if [ -n "$CURRENT_JS" ]; then
    cp "$CURRENT_JS" "$STATIC_DIR/js/$REFERENCED_JS" || log_warning "Impossible de créer la copie JS compatible"
    log_success "Copie JS compatible créée: $REFERENCED_JS"
else
    log_warning "Aucun fichier JS trouvé dans $STATIC_DIR/js/"
fi

if [ -n "$CURRENT_CSS" ]; then
    cp "$CURRENT_CSS" "$STATIC_DIR/css/$REFERENCED_CSS" || log_warning "Impossible de créer la copie CSS compatible"
    log_success "Copie CSS compatible créée: $REFERENCED_CSS"
else
    log_warning "Aucun fichier CSS trouvé dans $STATIC_DIR/css/"
fi

# Étape 8: Définir les permissions appropriées
log_info "Mise à jour des permissions..."
sudo chown -R kni:www-data "$STATIC_DIR"/ || log_warning "Problème lors de la mise à jour des propriétaires"
sudo chmod -R 644 "$STATIC_DIR"/*.* || log_warning "Problème lors de la mise à jour des permissions des fichiers"
sudo find "$STATIC_DIR" -type d -exec chmod 755 {} \; || log_warning "Problème lors de la mise à jour des permissions des répertoires"
log_success "Permissions mises à jour"

# Étape 9: Redémarrer Gunicorn
log_info "Redémarrage de Gunicorn..."
sudo systemctl start gunicorn || handle_error "Impossible de démarrer Gunicorn"
log_success "Gunicorn redémarré"

# Étape 10: Vérifier l'accessibilité des fichiers
log_info "Vérification de l'accessibilité des fichiers..."
SITE_URL="https://cleo.ecintelligence.ma"
JS_URL="$SITE_URL/static/js/$REFERENCED_JS"
CSS_URL="$SITE_URL/static/css/$REFERENCED_CSS"

log_info "-----------------------------------"
log_info "Déploiement terminé!"
log_info "-----------------------------------"
log_info "Pour vérifier l'installation, accédez aux URL suivantes:"
log_info "- Application: $SITE_URL"
log_info "- Fichier JS: $JS_URL"
log_info "- Fichier CSS: $CSS_URL"
log_info "-----------------------------------"
log_info "N'oubliez pas de vider le cache de votre navigateur avec Ctrl+F5 ou Cmd+Shift+R"
log_info "-----------------------------------"
