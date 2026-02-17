# Guide d'administration — Cleo ERP

Ce guide couvre les opérations courantes d'administration de Cleo ERP en environnement Docker.

---

## 1. Gestion des conteneurs

### Commandes de base

```bash
cd /opt/cleo    # ou le répertoire d'installation

# Démarrer
docker compose up -d

# Arrêter (conserve les données)
docker compose down

# Redémarrer un service
docker compose restart backend

# Voir le statut
docker compose ps

# Voir les logs en temps réel
docker compose logs -f
docker compose logs -f backend    # un seul service
```

### Après modification du `.env`

Un `docker compose restart` ne recharge pas les variables d'environnement. Il faut :

```bash
docker compose down
docker compose up -d
```

---

## 2. Sauvegarde et restauration

### 2.1 Sauvegarde de la base de données

```bash
# Sauvegarde manuelle
docker compose exec db pg_dump -U cleo_user cleo_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2.2 Sauvegarde automatique (crontab)

Créer un script de sauvegarde :

```bash
cat > /opt/cleo/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/cleo/backups"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

# Sauvegarde de la base de données
docker compose -f /opt/cleo/docker-compose.yml exec -T db \
  pg_dump -U cleo_user cleo_db | gzip > "$BACKUP_DIR/cleo_db_$(date +%Y%m%d_%H%M%S).sql.gz"

# Suppression des sauvegardes de plus de N jours
find "$BACKUP_DIR" -name "cleo_db_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "[$(date)] Sauvegarde terminée"
EOF

chmod +x /opt/cleo/backup.sh
```

Planifier une exécution quotidienne à 2h du matin :

```bash
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/cleo/backup.sh >> /opt/cleo/backups/backup.log 2>&1") | crontab -
```

### 2.3 Restauration

```bash
# Arrêter le backend
docker compose stop backend

# Restaurer (fichier .sql non compressé)
docker compose exec -T db psql -U cleo_user cleo_db < backup.sql

# Restaurer (fichier .sql.gz compressé)
gunzip -c backup.sql.gz | docker compose exec -T db psql -U cleo_user cleo_db

# Relancer
docker compose start backend
```

### 2.4 Restauration complète (base vierge)

Si la base existante est corrompue ou si vous souhaitez repartir de zéro avec un dump :

```bash
docker compose stop backend
docker compose exec db psql -U cleo_user -d postgres -c "DROP DATABASE cleo_db;"
docker compose exec db psql -U cleo_user -d postgres -c "CREATE DATABASE cleo_db OWNER cleo_user;"
docker compose exec -T db psql -U cleo_user cleo_db < backup.sql
docker compose start backend
```

---

## 3. Mise à jour de l'application

### 3.1 Depuis Docker Hub

```bash
cd /opt/cleo

# Télécharger la dernière version
docker compose pull backend

# Relancer (les migrations sont appliquées automatiquement)
docker compose down
docker compose up -d

# Vérifier les logs
docker compose logs -f backend
```

### 3.2 Depuis le code source

Si vous avez cloné le dépôt :

```bash
cd ~/cleo_platform

# Récupérer les changements
git pull origin main

# Rebuilder l'image
docker compose build backend

# Relancer
docker compose down
docker compose up -d
```

> L'entrypoint exécute automatiquement `migrate` et `collectstatic` à chaque démarrage. Pas besoin de le faire manuellement.

---

## 4. Gestion des utilisateurs

### 4.1 Créer un superuser

```bash
docker compose exec backend python manage.py createsuperuser
```

### 4.2 Changer un mot de passe

```bash
docker compose exec backend python manage.py changepassword NOM_UTILISATEUR
```

### 4.3 Via l'interface d'administration

Accéder à `http://ADRESSE:8000/admin/` avec un compte superuser pour :

- Créer/modifier/supprimer des utilisateurs
- Attribuer des rôles et des permissions
- Voir les journaux d'activité

### 4.4 Rôles par défaut

Cleo ERP crée 5 rôles avec des niveaux d'accès prédéfinis :

| Rôle | Core | CRM | Ventes | RH | Paie | Comptabilité |
|------|------|-----|--------|----|------|--------------|
| **Administrateur** | admin | admin | admin | admin | admin | admin |
| **Ventes** | read | admin | admin | read | — | read |
| **Ressources Humaines** | read | read | read | admin | admin | read |
| **Finance** | read | read | read | read | read | admin |
| **Employé** | read | read | read | read | read | — |

---

## 5. Shell Django

Pour exécuter des commandes Django directement :

```bash
# Shell interactif Python
docker compose exec backend python manage.py shell

# Exemples de commandes utiles
docker compose exec backend python manage.py shell -c "
from django.contrib.auth.models import User
for u in User.objects.all():
    print(f'{u.username} - {u.email} - superuser:{u.is_superuser}')
"
```

### Management commands disponibles

| Commande | Description |
|----------|-------------|
| `init_accounting` | Initialise le plan comptable PCGE, les journaux et les taxes |
| `init_payroll_data` | Initialise les paramètres de paie marocains (CNSS, AMO, IR) |
| `create_custom_permissions` | Crée les 13 permissions métier |
| `create_default_roles` | Crée les 5 rôles par défaut |
| `update_employee_family_status` | Met à jour la situation familiale des employés |

```bash
# Exécuter une management command
docker compose exec backend python manage.py init_accounting
```

---

## 6. Monitoring et logs

### Logs des conteneurs

```bash
# Tous les services
docker compose logs -f

# Un service spécifique
docker compose logs -f backend
docker compose logs -f db
docker compose logs -f nginx

# Les 100 dernières lignes
docker compose logs --tail=100 backend
```

### État de la base de données

```bash
# Se connecter au shell PostgreSQL
docker compose exec db psql -U cleo_user cleo_db

# Requêtes utiles dans psql :
# \dt                          — Lister les tables
# \dt+ sales_*                 — Tailles des tables sales
# SELECT count(*) FROM ...;    — Compter les enregistrements
# \q                           — Quitter
```

### Espace disque des volumes

```bash
docker system df -v | grep cleo
```

---

## 7. Résolution de problèmes

### L'application retourne « Bad Request (400) »

Le domaine ou l'IP ne figure pas dans `ALLOWED_HOSTS` du fichier `.env`. Ajouter l'adresse et relancer :

```bash
# Éditer .env, ajouter le domaine/IP dans ALLOWED_HOSTS
nano .env
docker compose down && docker compose up -d
```

### Les fichiers statiques retournent 404

```bash
# Vérifier que le volume static contient des fichiers
docker compose exec nginx ls -la /data/static/

# Si vide, relancer collectstatic
docker compose exec backend python manage.py collectstatic --noinput
```

### Le backend ne démarre pas

```bash
# Consulter les logs
docker compose logs backend

# Vérifier les variables d'environnement
docker compose exec backend env | grep -E "DB_|SECRET|ALLOWED"
```

### La génération PDF échoue

WeasyPrint nécessite des bibliothèques système. Vérifier :

```bash
docker compose exec backend python -c "import weasyprint; print('WeasyPrint OK')"
```

### Erreur de connexion à la base de données

```bash
# Vérifier que le conteneur DB est en marche
docker compose ps db

# Tester la connexion
docker compose exec db psql -U cleo_user -d cleo_db -c "SELECT 1;"
```

### Port 8000 déjà utilisé

```bash
# Identifier le processus
sudo ss -tlnp | grep 8000

# Changer le port dans .env
echo "CLEO_PORT=9000" >> .env
docker compose down && docker compose up -d
```

---

## 8. Réinitialisation complète

Pour repartir de zéro avec une base vierge et les données initiales :

```bash
cd /opt/cleo

# ATTENTION : supprime toutes les données
docker compose down -v
docker compose up -d
```

L'entrypoint recréera la base, appliquera les migrations, initialisera les données de base et créera le superuser `admin/admin`.
