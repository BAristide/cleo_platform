# Guide d'installation — Cleo ERP

Ce guide explique comment installer Cleo ERP sur un serveur Linux à l'aide de Docker. Aucune connaissance en développement n'est requise.

---

## 1. Prérequis

### Système minimum

| Ressource | Minimum | Recommandé |
|-----------|---------|------------|
| OS | Ubuntu 22.04+ / Debian 12+ | Ubuntu 24.04 LTS |
| RAM | 2 Go | 4 Go |
| Disque | 10 Go | 20 Go |
| CPU | 2 vCPU | 4 vCPU |

### Installer Docker et Docker Compose

Si Docker n'est pas encore installé :

```bash
# Installer les prérequis
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

# Ajouter la clé GPG Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Ajouter le dépôt Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Installer Docker Engine + Compose
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Ajouter votre utilisateur au groupe docker
sudo usermod -aG docker $USER
```

Se déconnecter et se reconnecter pour que le groupe prenne effet, puis vérifier :

```bash
docker --version
docker compose version
docker run --rm hello-world
```

---

## 2. Installation

### 2.1 Créer le répertoire d'installation

```bash
sudo mkdir -p /opt/cleo
sudo chown $(whoami):$(whoami) /opt/cleo
cd /opt/cleo
```

### 2.2 Créer le fichier docker-compose.yml

```bash
cat > docker-compose.yml << 'EOF'
services:

  db:
    image: postgres:14-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME:-cleo_db}
      POSTGRES_USER: ${DB_USER:-cleo_user}
      POSTGRES_PASSWORD: "${DB_PASSWORD:?DB_PASSWORD requis dans .env}"
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-cleo_user} -d ${DB_NAME:-cleo_db}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  backend:
    image: ecintelligence/cleo-backend:latest
    restart: unless-stopped
    env_file: .env
    environment:
      DB_HOST: db
      DB_PORT: "5432"
      DJANGO_ENV: production
    volumes:
      - static_data:/data/static
      - media_data:/data/media
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/check-auth/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "${CLEO_PORT:-8000}:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - static_data:/data/static:ro
      - media_data:/data/media:ro
    depends_on:
      backend:
        condition: service_healthy

volumes:
  pg_data:
    name: cleo_pg_data
  static_data:
    name: cleo_static_data
  media_data:
    name: cleo_media_data
EOF
```

### 2.3 Créer la configuration Nginx

```bash
cat > nginx.conf << 'EOF'
upstream django {
    server backend:8000;
}

server {
    listen 80;
    server_name _;
    client_max_body_size 50M;

    location /static/ {
        alias /data/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location /media/ {
        alias /data/media/;
        expires 7d;
        add_header Cache-Control "public";
    }

    location / {
        proxy_pass http://django;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
        proxy_read_timeout 120s;
        proxy_connect_timeout 10s;
    }
}
EOF
```

### 2.4 Créer le fichier d'environnement

```bash
cat > .env << 'EOF'
# ============================================================
# Cleo ERP — Variables d'environnement
# ============================================================

# Django
SECRET_KEY=REMPLACEZ-PAR-UNE-CLE-ALEATOIRE-DE-50-CARACTERES
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1

# Base de données
DB_NAME=cleo_db
DB_USER=cleo_user
DB_PASSWORD=REMPLACEZ-PAR-UN-MOT-DE-PASSE-FORT
DB_HOST=localhost
DB_PORT=5432

# Email (optionnel — nécessaire pour l'envoi de notifications)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=votre-email@example.com
EMAIL_HOST_PASSWORD=votre-mot-de-passe-email
DEFAULT_FROM_EMAIL=votre-email@example.com

# API taux de change (optionnel)
OPENEXCHANGE_API_KEY=votre-cle-api

# CORS / CSRF
CORS_ORIGIN_WHITELIST=http://localhost:8000
CSRF_TRUSTED_ORIGINS=http://localhost:8000

# Port d'écoute (optionnel, défaut 8000)
# CLEO_PORT=8000

# Superuser initial (optionnel, défaut admin/admin)
# DJANGO_SUPERUSER_USERNAME=admin
# DJANGO_SUPERUSER_PASSWORD=admin
# DJANGO_SUPERUSER_EMAIL=admin@cleo.local
EOF
```

**Éditez le fichier `.env`** pour renseigner au minimum :

- `SECRET_KEY` : générez une clé aléatoire avec `openssl rand -base64 50`
- `DB_PASSWORD` : choisissez un mot de passe fort pour la base de données
- `ALLOWED_HOSTS` : ajoutez l'IP ou le nom de domaine de votre serveur

```bash
nano .env
```

### 2.5 Lancer l'application

```bash
cd /opt/cleo
docker compose up -d
```

Suivre les logs de démarrage :

```bash
docker compose logs -f backend
```

Attendre le message `🚀 Démarrage de Cleo ERP...` puis appuyer sur `Ctrl+C`.

### 2.6 Vérifier le déploiement

```bash
# Vérifier que les 3 conteneurs sont en marche
docker compose ps

# Tester l'accès
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/login/
# Résultat attendu : 200
```

### 2.7 Se connecter

Ouvrir dans un navigateur : `http://ADRESSE-IP-DU-SERVEUR:8000`

Identifiants par défaut : `admin` / `admin`

**Changez le mot de passe immédiatement** via l'interface d'administration Django : `http://ADRESSE-IP:8000/admin/`

---

## 3. Données initialisées automatiquement

Au premier démarrage, l'application initialise :

| Données | Détail |
|---------|--------|
| **Plan comptable** | Plan Comptable Général des Entreprises (PCGE) marocain |
| **Journaux comptables** | Achats, Ventes, Banque, Opérations diverses, etc. |
| **Types de comptes** | Actif, Passif, Charges, Produits |
| **Taxes** | TVA 20%, 14%, 10%, 7% |
| **Paramètres paie** | Plafond CNSS, taux CNSS salarié/patronal, taux AMO, SMIG |
| **Composants salaire** | Salaire de base, heures sup (25/50/100%), ancienneté, transport, repas, IR, CNSS, AMO |
| **Tranches IR** | 6 tranches d'imposition sur le revenu marocain |
| **Types de contrat** | CDI, CDD, ANAPEC |
| **Permissions** | 13 permissions métier (approbation missions, validation paie, etc.) |
| **Rôles** | Administrateur, Ventes, Ressources Humaines, Finance, Employé |

---

## 4. Exposition sur Internet (optionnel)

Par défaut, l'application écoute sur le port 8000 en HTTP. Pour l'exposer sur Internet avec un nom de domaine et HTTPS, placez un reverse proxy devant.

### Exemple avec Nginx + Let's Encrypt

Sur un serveur séparé (ou sur le même serveur, sur un autre port) :

```nginx
server {
    server_name votre-domaine.com;

    location / {
        proxy_pass http://IP-DU-SERVEUR-CLEO:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    client_max_body_size 50M;

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/votre-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/votre-domaine.com/privkey.pem;
}
```

**Mettre à jour le `.env`** pour ajouter le domaine :

```ini
ALLOWED_HOSTS=localhost,127.0.0.1,votre-domaine.com
CSRF_TRUSTED_ORIGINS=http://localhost:8000,https://votre-domaine.com
CORS_ORIGIN_WHITELIST=http://localhost:8000,https://votre-domaine.com
```

Puis redémarrer :

```bash
cd /opt/cleo
docker compose down
docker compose up -d
```

> **Important** : un simple `docker compose restart` ne recharge pas les variables du `.env`. Il faut faire `down` puis `up`.

---

## 5. Changer le port d'écoute

Par défaut, l'application écoute sur le port 8000. Pour changer :

```bash
# Ajouter dans .env
echo "CLEO_PORT=9000" >> /opt/cleo/.env

# Relancer
cd /opt/cleo
docker compose down
docker compose up -d
```

L'application sera accessible sur `http://IP:9000`.

---

## 6. Désinstallation

```bash
# Arrêter et supprimer les conteneurs (les données sont conservées)
cd /opt/cleo
docker compose down

# Pour supprimer aussi toutes les données (IRRÉVERSIBLE)
docker compose down -v
docker image rm ecintelligence/cleo-backend:latest postgres:14-alpine nginx:alpine
rm -rf /opt/cleo
```
