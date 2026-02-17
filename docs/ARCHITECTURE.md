# Architecture technique — Cleo ERP

---

## 1. Vue d'ensemble

Cleo ERP est une application web monolithique modulaire construite sur Django (backend) et React (frontend). Le frontend est servi par Django — ce n'est pas une SPA découplée.

```
┌──────────────────────────────────────────────────┐
│                  Navigateur                       │
│  React 19 (Ant Design) — rendu côté client       │
└────────────────────┬─────────────────────────────┘
                     │ HTTP/HTTPS
┌────────────────────▼─────────────────────────────┐
│              Nginx (conteneur)                    │
│  /static/ → volume direct (JS, CSS, assets)      │
│  /media/  → volume direct (PDFs, uploads)        │
│  /*       → proxy vers Django                    │
└────────────────────┬─────────────────────────────┘
                     │ port 8000 (interne)
┌────────────────────▼─────────────────────────────┐
│         Django 5.2 + Gunicorn (conteneur)        │
│                                                   │
│  ┌─────────┐ ┌──────┐ ┌─────┐ ┌───────┐         │
│  │   CRM   │ │Sales │ │ HR  │ │Payroll│  ...     │
│  └────┬────┘ └──┬───┘ └──┬──┘ └───┬───┘         │
│       │         │        │        │               │
│  ┌────▼─────────▼────────▼────────▼──────┐       │
│  │      Django REST Framework            │       │
│  │   Serializers, ViewSets, Filters      │       │
│  └───────────────────┬───────────────────┘       │
│                      │                            │
│  ┌───────────────────▼───────────────────┐       │
│  │           Django ORM                   │       │
│  └───────────────────┬───────────────────┘       │
└──────────────────────┼────────────────────────────┘
                       │ port 5432 (interne)
┌──────────────────────▼────────────────────────────┐
│            PostgreSQL 14 (conteneur)               │
│            Volume persistant : cleo_pg_data        │
└────────────────────────────────────────────────────┘
```

---

## 2. Pourquoi Django sert le frontend

Contrairement à une architecture SPA classique où un serveur web séparé sert le frontend, Cleo ERP fait servir le frontend par Django. Cette décision architecturale a plusieurs conséquences :

1. **Le login est un template Django** (`templates/login.html`), rendu côté serveur avec gestion CSRF.
2. **Les routes frontend sont protégées par Django** via `login_required` sur des `TemplateView` qui rendent `templates/index.html` (le shell React).
3. **L'authentification est par session** (cookies), pas par JWT. Le token CSRF est géré par Django et transmis au frontend via `axiosConfig.js`.
4. **`axiosConfig.js` utilise `window.location`** pour construire la baseURL — aucune URL n'est hardcodée.

Le frontend React (compilé via `npm run build`) est intégré dans les fichiers statiques de Django via `collectstatic`.

---

## 3. Flux d'une requête

### Accès à un module (ex: `/crm/`)

```
1. Navigateur → GET /crm/
2. Nginx → route "/" → proxy vers backend:8000
3. Django → login_required → utilisateur authentifié ?
   ├─ Non → redirect 302 /login/ → render templates/login.html
   └─ Oui → render templates/index.html (shell React)
4. Navigateur charge React → GET /static/js/main.xxxxx.js
5. Nginx → route "/static/" → sert le fichier directement (pas Django)
6. React s'initialise → GET /api/check-auth/
7. Nginx → route "/api/" → proxy vers backend:8000
8. Django → SessionAuth → retourne les infos utilisateur (JSON)
9. React affiche le dashboard CRM
```

### Appel API (ex: liste des contacts)

```
1. React → GET /api/crm/contacts/?page=1&search=maroc
2. Nginx → proxy vers backend:8000
3. Django → SessionAuth → vérifie l'authentification
4. DRF → ContactViewSet.list() → filtre, pagine
5. Django ORM → SELECT ... FROM crm_contact WHERE ...
6. PostgreSQL → retourne les résultats
7. DRF → sérialise en JSON → retourne la réponse
8. React → affiche la liste dans Ant Design Table
```

---

## 4. Modules Django

### Structure type d'un module

Chaque module suit la même organisation :

```
module/
├── admin.py           # Enregistrement Django Admin
├── apps.py            # Configuration de l'app
├── filters.py         # Filtres DRF (si nécessaire)
├── models.py          # Modèles de données (ORM)
├── serializers.py     # Serializers DRF (JSON ↔ modèles)
├── signals.py         # Signaux Django (post_save, etc.)
├── urls.py            # Routes API (DefaultRouter)
├── views.py           # ViewSets DRF + vues dashboard
├── management/
│   └── commands/      # Management commands (init_*, create_*)
├── migrations/        # Migrations de base de données
└── tests.py           # Tests (à développer)
```

### Modules et responsabilités

| Module | Modèles principaux | Services métier |
|--------|-------------------|-----------------|
| **core** | Currency | Gestion des devises, paramètres globaux |
| **crm** | Contact, Company, Opportunity, Activity, SalesStage, Tag | Pipeline CRM, chatbot |
| **sales** | Product, Quote, Order, Invoice, Payment, BankAccount | Cycle de vente complet (devis → commande → facture → paiement) |
| **hr** | Employee, Department, JobTitle, Mission, Skill, TrainingPlan | GPEC, workflow d'approbation multi-niveaux |
| **payroll** | PayrollPeriod, PayrollRun, PaySlip, EmployeePayroll, SalaryComponent, TaxBracket | Calcul salaire (salary_calculator), génération bulletins PDF |
| **accounting** | Account, Journal, JournalEntry, FiscalYear, Tax, Asset | Plan PCGE, rapports (bilan, CPC, TVA), immobilisations |
| **recruitment** | JobOpening, Candidate, Application, InterviewPanel, Evaluation | Processus de recrutement, évaluations |
| **users** | UserRole, ActivityLog, auth_backends, middleware | Rôles/permissions par module, journaux d'activité |

### Relations entre modules

```
core ←──── (Currency utilisée par sales, accounting)
  │
crm ─────── sales (Company partagée, opportunités → devis)
  │
hr ────────── payroll (Employee → calcul de paie, bulletins)
  │
  └──── recruitment (Department, JobTitle → offres d'emploi)

accounting ← sales (factures → écritures comptables)
           ← payroll (bulletins → écritures de paie)

users ←──── tous les modules (permissions, logs d'activité)
```

---

## 5. Infrastructure Docker

### Conteneurs

| Service | Image | Rôle | Port |
|---------|-------|------|------|
| `nginx` | `nginx:alpine` | Fichiers statiques + proxy | 8000 (exposé) |
| `backend` | `ecintelligence/cleo-backend` | Django + Gunicorn | 8000 (interne) |
| `db` | `postgres:14-alpine` | Base de données | 5432 (interne) |

### Volumes persistants

| Volume | Chemin conteneur | Contenu |
|--------|-----------------|---------|
| `cleo_pg_data` | `/var/lib/postgresql/data` | Données PostgreSQL |
| `cleo_static_data` | `/data/static` | JS/CSS React compilés + assets Django Admin |
| `cleo_media_data` | `/data/media` | Fichiers uploadés (CVs, PDFs générés) |

### Rôle du Nginx interne

Le Nginx à l'intérieur du Docker Compose est un **composant applicatif**, pas un reverse proxy d'exposition. Son rôle :

- Servir les fichiers statiques directement depuis les volumes (sans mobiliser un worker Python Gunicorn pour chaque `.js` ou `.css`)
- Proxier les requêtes dynamiques (API, templates, admin) vers Gunicorn
- Limiter la taille des uploads à 50 Mo

Pour exposer l'application sur Internet (SSL, nom de domaine), l'opérateur place son propre reverse proxy (Nginx, HAProxy, Traefik, etc.) devant le port 8000.

### Dockerfile multi-stage

Le Dockerfile utilise deux étapes :

1. **Stage 1 — `node:18-alpine`** : compile le frontend React (`npm ci` + `npm run build`)
2. **Stage 2 — `python:3.10-slim`** : installe les dépendances Python et système, copie le code, intègre le frontend compilé

Ce build multi-stage garantit que le `templates/index.html` est toujours synchronisé avec les fichiers JS/CSS générés (les hashes dans les noms de fichiers correspondent).

### Entrypoint

Au démarrage du conteneur backend, `entrypoint.sh` exécute :

1. Attente de PostgreSQL (max 30 tentatives)
2. Migrations Django (`migrate --noinput`)
3. Collecte des fichiers statiques (`collectstatic --noinput`)
4. Copie des fichiers frontend React vers `/data/static/`
5. Initialisation des données de base (comptabilité, paie, permissions, rôles)
6. Création du superuser (si aucun n'existe)
7. Démarrage de Gunicorn (`exec "$@"`)

---

## 6. Authentification et permissions

### Système d'authentification

- **Backend** : authentification par session Django (cookie `sessionid`)
- **CSRF** : token transmis via cookie `csrftoken`, inclus dans les requêtes AJAX par `axiosConfig.js`
- **Frontend** : `AuthContext` React gère l'état d'authentification, `PrivateRoute` protège les routes

### Permissions par module

Le système `check_auth` implémente 6 niveaux d'accès par module et par rôle :

| Niveau | Description |
|--------|-------------|
| `no_access` | Aucun accès au module |
| `read` | Consultation uniquement |
| `create` | Lecture + création |
| `update` | Lecture + création + modification |
| `delete` | Lecture + création + modification + suppression |
| `admin` | Accès complet |

### Middleware

- **ActivityLogMiddleware** : journalise toutes les actions utilisateur dans `users.ActivityLog`

---

## 7. Services métier

| Service | Module | Description |
|---------|--------|-------------|
| `salary_calculator` | payroll | Calcul du salaire brut/net (CNSS, AMO, IR marocain) |
| `pdf_generator` | payroll | Génération de bulletins de paie en PDF (WeasyPrint) |
| `email_service` | core | Envoi d'emails (SMTP Outlook/Office 365) |
| `financial_report_service` | accounting | Génération des rapports comptables (bilan, CPC) |

---

## 8. Frontend React

### Organisation

```
frontend/src/
├── App.js                    # Router principal
├── utils/
│   └── axiosConfig.js        # Instance Axios configurée (CSRF, baseURL)
├── components/
│   ├── crm/                  # 14 composants (Dashboard, ContactList, etc.)
│   ├── sales/                # 18 composants
│   ├── hr/                   # 22 composants
│   ├── payroll/              # 12 composants
│   ├── accounting/           # 21 composants
│   └── recruitment/          # 13 composants
└── context/
    └── AuthContext.js         # Gestion de l'état d'authentification
```

### Bibliothèques principales

| Bibliothèque | Usage |
|--------------|-------|
| React 19 | Framework UI |
| Ant Design 5 | Composants UI (tables, formulaires, menus, modals) |
| React Router 6 | Routage côté client |
| Axios | Requêtes HTTP vers l'API |
| Recharts | Graphiques dans les dashboards |
| Moment.js | Formatage des dates |

Chaque module possède son propre Layout, Routes, Dashboard et ses composants dédiés. La navigation est assurée par une sidebar et un système de breadcrumbs.

---

## 9. Localisation

- **Langue** : français (interface, labels, messages d'erreur)
- **Devise** : MAD (Dirham marocain) par défaut
- **Plan comptable** : PCGE (Plan Comptable Général des Entreprises marocain)
- **Fiscalité** : IR marocain (6 tranches), CNSS, AMO
- **Internationalisation** : `gettext_lazy` utilisé dans les modèles Django
