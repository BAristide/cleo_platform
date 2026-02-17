# Référence API — Cleo ERP

Cleo ERP expose une API REST via Django REST Framework. Toutes les routes API sont préfixées par `/api/` et nécessitent une authentification par session.

---

## Authentification

L'API utilise l'authentification par session Django (cookies). Les endpoints d'authentification :

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/login/` | Connexion (username + password via formulaire) |
| GET | `/logout/` | Déconnexion |
| GET | `/api/check-auth/` | Vérifier l'état d'authentification (retourne 302 si non connecté) |

Le token CSRF est géré automatiquement par le frontend React via `axiosConfig.js`. Pour les appels API directs, inclure le cookie `csrftoken` dans l'en-tête `X-CSRFToken`.

---

## Convention des endpoints

Chaque module expose des ViewSets REST standard via `DefaultRouter`. Pour chaque ressource, les opérations CRUD suivantes sont disponibles :

| Méthode | URL | Action |
|---------|-----|--------|
| GET | `/api/{module}/{ressource}/` | Lister |
| POST | `/api/{module}/{ressource}/` | Créer |
| GET | `/api/{module}/{ressource}/{id}/` | Détail |
| PUT | `/api/{module}/{ressource}/{id}/` | Modifier (complet) |
| PATCH | `/api/{module}/{ressource}/{id}/` | Modifier (partiel) |
| DELETE | `/api/{module}/{ressource}/{id}/` | Supprimer |

La pagination, le filtrage et la recherche sont configurés globalement via Django REST Framework.

---

## Module Core — `/api/core/`

| Ressource | Endpoint | Description |
|-----------|----------|-------------|
| Devises | `/api/core/currencies/` | Gestion des devises (MAD, EUR, USD, etc.) |

---

## Module CRM — `/api/crm/`

| Ressource | Endpoint | Description |
|-----------|----------|-------------|
| Contacts | `/api/crm/contacts/` | Gestion des contacts (nom, email, téléphone, entreprise) |
| Entreprises | `/api/crm/companies/` | Entreprises clientes et prospects |
| Opportunités | `/api/crm/opportunities/` | Pipeline commercial, montants, probabilités |
| Activités | `/api/crm/activities/` | Tâches, appels, réunions liées aux contacts |
| Étapes de vente | `/api/crm/sales-stages/` | Configuration du pipeline (Prospect, Qualification, etc.) |
| Industries | `/api/crm/industries/` | Secteurs d'activité |
| Tags | `/api/crm/tags/` | Étiquettes pour catégoriser contacts/opportunités |
| Types d'activité | `/api/crm/activity-types/` | Configuration des types d'activité (Appel, Email, etc.) |
| Chatbot | `/api/crm/chatbot/` | Interface chatbot CRM |

### Endpoints spécifiques CRM

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/crm/dashboard/` | KPIs du tableau de bord CRM |
| POST | `/api/crm/api/chatbot/qualify/` | Qualification automatique d'un prospect |
| POST | `/api/crm/api/chatbot/faq/` | FAQ chatbot |
| POST | `/api/crm/api/chatbot/appointment/` | Prise de rendez-vous chatbot |
| POST | `/api/crm/api/chatbot/support/` | Support chatbot |

---

## Module Ventes — `/api/sales/`

| Ressource | Endpoint | Description |
|-----------|----------|-------------|
| Comptes bancaires | `/api/sales/bank-accounts/` | Comptes bancaires de l'entreprise |
| Produits | `/api/sales/products/` | Catalogue produits/services |
| Devis | `/api/sales/quotes/` | Devis clients |
| Lignes de devis | `/api/sales/quote-items/` | Détail des lignes de devis |
| Commandes | `/api/sales/orders/` | Bons de commande |
| Lignes de commande | `/api/sales/order-items/` | Détail des lignes de commande |
| Factures | `/api/sales/invoices/` | Factures (standard, avoir) |
| Lignes de facture | `/api/sales/invoice-items/` | Détail des lignes de facture |
| Paiements | `/api/sales/payments/` | Enregistrement des paiements reçus |

---

## Module RH — `/api/hr/`

| Ressource | Endpoint | Description |
|-----------|----------|-------------|
| Départements | `/api/hr/departments/` | Structure organisationnelle |
| Postes | `/api/hr/job-titles/` | Intitulés de poste |
| Employés | `/api/hr/employees/` | Dossiers employés (contrat, salaire, situation) |
| Missions | `/api/hr/missions/` | Ordres de mission avec workflow d'approbation |
| Disponibilités | `/api/hr/availabilities/` | Demandes de disponibilité / congés |
| Compétences | `/api/hr/skills/` | Référentiel GPEC (compétences et niveaux) |
| Formations | `/api/hr/training-courses/` | Catalogue de formations |
| Plans de formation | `/api/hr/training-plans/` | Plans de formation annuels |
| Éléments de plan | `/api/hr/training-plan-items/` | Détail des actions de formation |

### Endpoints spécifiques RH

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/hr/dashboard/` | KPIs du tableau de bord RH |

### Workflow d'approbation des missions

Les missions suivent un workflow multi-niveaux :

1. **Brouillon** → Soumission par l'employé
2. **En attente N+1** → Approbation par le manager
3. **En attente RH** → Approbation par les ressources humaines
4. **En attente Finance** → Approbation par la direction financière
5. **Approuvée** / **Rejetée**

---

## Module Paie — `/api/payroll/`

| Ressource | Endpoint | Description |
|-----------|----------|-------------|
| Périodes | `/api/payroll/periods/` | Périodes de paie (mois) |
| Paramètres | `/api/payroll/parameters/` | Paramètres (plafond CNSS, taux, SMIG) |
| Types de contrat | `/api/payroll/contract-types/` | CDI, CDD, ANAPEC |
| Composants salaire | `/api/payroll/components/` | Composants (base, HS, IR, CNSS, etc.) |
| Tranches IR | `/api/payroll/tax-brackets/` | Barème de l'impôt sur le revenu |
| Paie employé | `/api/payroll/employee-payrolls/` | Calcul de paie individuel |
| Lancements paie | `/api/payroll/payroll-runs/` | Lancements de paie collectifs |
| Bulletins de paie | `/api/payroll/payslips/` | Bulletins générés (PDF via WeasyPrint) |
| Acomptes | `/api/payroll/advances/` | Acomptes sur salaire |

### Endpoints spécifiques Paie

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/payroll/dashboard/` | KPIs du tableau de bord Paie |

---

## Module Comptabilité — `/api/accounting/`

| Ressource | Endpoint | Description |
|-----------|----------|-------------|
| Types de comptes | `/api/accounting/account-types/` | Actif, Passif, Charges, Produits |
| Comptes | `/api/accounting/accounts/` | Plan comptable (PCGE) |
| Journaux | `/api/accounting/journals/` | Journaux comptables |
| Écritures | `/api/accounting/journal-entries/` | Écritures comptables (lignes débit/crédit) |
| Exercices | `/api/accounting/fiscal-years/` | Exercices comptables |
| Périodes fiscales | `/api/accounting/fiscal-periods/` | Périodes au sein d'un exercice |
| Lettrages | `/api/accounting/reconciliations/` | Rapprochements comptables |
| Relevés bancaires | `/api/accounting/bank-statements/` | Import et rapprochement bancaire |
| Comptes analytiques | `/api/accounting/analytic-accounts/` | Comptabilité analytique |
| Taxes | `/api/accounting/taxes/` | Configuration TVA (20%, 14%, 10%, 7%) |
| Catégories d'immobilisations | `/api/accounting/asset-categories/` | Catégories (matériel, mobilier, etc.) |
| Immobilisations | `/api/accounting/assets/` | Gestion des immobilisations et amortissements |

### Rapports comptables

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/accounting/dashboard/` | KPIs du tableau de bord comptable |
| GET | `/api/accounting/general-ledger/` | Grand livre |
| GET | `/api/accounting/general-ledger/export/` | Export grand livre |
| GET | `/api/accounting/trial-balance/` | Balance des comptes |
| GET | `/api/accounting/trial-balance/export/` | Export balance |
| GET | `/api/accounting/balance-sheet/` | Bilan |
| GET | `/api/accounting/income-statement/` | Compte de résultat |
| GET | `/api/accounting/financial-statements/export/` | Export états financiers |
| GET | `/api/accounting/vat-declaration/` | Déclaration de TVA |
| GET | `/api/accounting/vat-declaration/export/` | Export déclaration TVA |
| POST | `/api/accounting/import-journal-entries/` | Import d'écritures comptables |

---

## Module Recrutement — `/api/recruitment/`

| Ressource | Endpoint | Description |
|-----------|----------|-------------|
| Offres d'emploi | `/api/recruitment/job-openings/` | Postes ouverts au recrutement |
| Candidats | `/api/recruitment/candidates/` | Base de candidats |
| Candidatures | `/api/recruitment/applications/` | Candidatures liées aux offres |
| Jurys | `/api/recruitment/interview-panels/` | Panels d'entretien |
| Évaluateurs | `/api/recruitment/interviewers/` | Membres des jurys |
| Critères d'évaluation | `/api/recruitment/evaluation-criteria/` | Grille d'évaluation |
| Évaluations | `/api/recruitment/evaluations/` | Évaluations des candidats |
| Statistiques | `/api/recruitment/statistics/` | Statistiques de recrutement |
| Notifications | `/api/recruitment/notifications/` | Notifications de recrutement |

---

## Module Utilisateurs — `/api/users/`

| Ressource | Endpoint | Description |
|-----------|----------|-------------|
| Utilisateurs | `/api/users/users/` | Gestion des comptes utilisateur |
| Rôles | `/api/users/roles/` | Rôles et permissions par module |
| Journaux d'activité | `/api/users/activity-logs/` | Historique des actions utilisateur |

### Endpoints spécifiques

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/users/log-activity/` | Enregistrer une action manuellement |

---

## Documentation interactive (Swagger)

Pour activer la documentation API interactive Swagger, installer `drf-spectacular` et ajouter la configuration dans `settings/base.py` :

```python
INSTALLED_APPS = [
    # ...
    'drf_spectacular',
]

REST_FRAMEWORK = {
    # ...
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'Cleo ERP API',
    'DESCRIPTION': 'API REST de la plateforme ERP Cleo',
    'VERSION': '1.0.0',
}
```

Ajouter les URLs dans `cleo_platform/urls.py` :

```python
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    # ...
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]
```

La documentation sera alors accessible via `/api/docs/`.
