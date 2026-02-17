# Cleo ERP

Plateforme de gestion intégrée (ERP) développée par [EC Intelligence](https://ecintelligence.ma), conçue pour les PME marocaines et francophones.

Cleo ERP regroupe la gestion commerciale, les ressources humaines, la paie, la comptabilité et le recrutement dans une interface web moderne et unifiée.

## Modules

| Module | Description |
|--------|-------------|
| **CRM** | Contacts, entreprises, opportunités, pipeline commercial, activités |
| **Ventes** | Devis, commandes, factures, produits, paiements, comptes bancaires |
| **RH** | Employés, départements, postes, missions, GPEC (compétences/formations) |
| **Paie** | Périodes de paie, bulletins, calcul salaire brut/net, IR, CNSS/AMO |
| **Comptabilité** | Plan comptable PCGE, journaux, écritures, immobilisations, rapports fiscaux |
| **Recrutement** | Offres d'emploi, candidatures, entretiens, évaluations |

## Stack technique

- **Backend** : Django 5.2, Django REST Framework 3.16, Gunicorn, WeasyPrint (PDF)
- **Frontend** : React 19, Ant Design 5, Recharts
- **Base de données** : PostgreSQL 14
- **Conteneurisation** : Docker, Docker Compose, Nginx

## Installation rapide (Docker)

**Prérequis** : Docker et Docker Compose installés ([guide d'installation](docs/INSTALLATION.md#1-prérequis)).

```bash
# 1. Cloner le dépôt
git clone git@github.com:BAristide/cleo_platform.git
cd cleo_platform

# 2. Configurer l'environnement
cp .env.example .env
nano .env    # Remplir SECRET_KEY, DB_PASSWORD, etc.

# 3. Lancer
docker compose up -d

# 4. Accéder à l'application
# http://localhost:8000
# Identifiants par défaut : admin / admin
```

L'entrypoint initialise automatiquement la base de données, le plan comptable PCGE, les paramètres de paie marocains, les permissions et les rôles.

## Déploiement sans code source (Docker Hub)

Pour déployer sans cloner le dépôt, seuls 3 fichiers sont nécessaires :

- `docker-compose.yml` (avec l'image `ecintelligence/cleo-backend`)
- `.env`
- `nginx.conf`

Voir le [guide d'installation complet](docs/INSTALLATION.md) pour les détails.

## Développement local (sans Docker)

```bash
# Backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Éditer .env (DB_HOST=localhost, DEBUG=True)
python manage.py migrate
python manage.py init_accounting
python manage.py init_payroll_data
python manage.py create_custom_permissions
python manage.py create_default_roles
python manage.py createsuperuser
python manage.py runserver

# Frontend (dans un autre terminal)
cd frontend
npm install
npm start
```

## Documentation

| Document | Description |
|----------|-------------|
| [Guide d'installation](docs/INSTALLATION.md) | Installation Docker pas à pas pour les PME |
| [Guide d'administration](docs/ADMIN.md) | Sauvegarde, mise à jour, gestion des utilisateurs |
| [Référence API](docs/API.md) | Endpoints REST par module |
| [Architecture technique](docs/ARCHITECTURE.md) | Architecture, modules, flux de requêtes |

## Structure du projet

```
cleo_platform/
├── cleo_platform/          # Configuration Django (settings, urls, wsgi)
├── core/                   # Module Core (devises, paramètres)
├── crm/                    # Module CRM
├── sales/                  # Module Ventes
├── hr/                     # Module RH
├── payroll/                # Module Paie
├── accounting/             # Module Comptabilité
├── recruitment/            # Module Recrutement
├── users/                  # Module Utilisateurs (rôles, permissions, logs)
├── templates/              # Templates Django (login.html, index.html)
├── frontend/               # Application React (Ant Design)
├── docker/                 # Configuration Docker (nginx)
├── docs/                   # Documentation
├── Dockerfile              # Build multi-stage (Node.js + Python)
├── docker-compose.yml      # Orchestration 3 services
├── entrypoint.sh           # Initialisation automatique
├── requirements.txt        # Dépendances Python
└── .env.example            # Modèle de variables d'environnement
```

## Contribution

1. Créer une branche depuis `develop` : `git checkout -b feature/ma-fonctionnalite`
2. Développer et commiter (les pre-commit hooks ruff s'exécutent automatiquement)
3. Pousser et créer une Pull Request vers `develop`
4. Après review et merge dans `develop`, merger dans `main` pour la release
5. Tagger la version : `git tag v1.x.x && git push origin v1.x.x`

**Conventions** :
- Branches : `feature/*`, `fix/*`, `release/*`
- Linting : ruff (Python), ESLint (JavaScript)
- Pre-commit : ruff, ruff-format, trailing-whitespace, check-yaml, detect-private-key

## Licence

Logiciel propriétaire — EC Intelligence. Tous droits réservés.

## Contact

- **Site** : [ecintelligence.ma](https://ecintelligence.ma)
- **Application** : [cleo.ecintelligence.ma](https://cleo.ecintelligence.ma)
- **Email** : infos@ecintelligence.ma
