from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

# Créer un routeur pour enregistrer les viewsets
router = DefaultRouter()
router.register(r'account-types', views.AccountTypeViewSet)
router.register(r'accounts', views.AccountViewSet)
router.register(r'journals', views.JournalViewSet)
router.register(r'journal-entries', views.JournalEntryViewSet)
router.register(r'fiscal-years', views.FiscalYearViewSet)
router.register(r'fiscal-periods', views.FiscalPeriodViewSet)
router.register(r'reconciliations', views.ReconciliationViewSet)
router.register(r'bank-statements', views.BankStatementViewSet)
router.register(r'analytic-accounts', views.AnalyticAccountViewSet)
router.register(r'taxes', views.TaxViewSet)
router.register(r'asset-categories', views.AssetCategoryViewSet)
router.register(r'assets', views.AssetViewSet)

app_name = 'accounting'

# Définir les routes de l'application
urlpatterns = [
    # API Router - directement exposé sans préfixe "api/"
    path('', include(router.urls)),
    # Routes pour le dashboard et les rapports
    path('dashboard/', views.dashboard_view, name='dashboard'),
    path('general-ledger/', views.general_ledger, name='general_ledger'),
    path(
        'general-ledger/export/',
        views.general_ledger_export,
        name='general_ledger_export',
    ),
    path('trial-balance/', views.trial_balance, name='trial_balance'),
    path(
        'trial-balance/export/', views.trial_balance_export, name='trial_balance_export'
    ),
    path('balance-sheet/', views.balance_sheet, name='balance_sheet'),
    path('income-statement/', views.income_statement, name='income_statement'),
    path(
        'financial-statements/export/',
        views.financial_statements_export,
        name='financial_statements_export',
    ),
    path('vat-declaration/', views.vat_declaration, name='vat_declaration'),
    path(
        'vat-declaration/export/',
        views.vat_declaration_export,
        name='vat_declaration_export',
    ),
    path(
        'import-journal-entries/',
        views.import_journal_entries,
        name='import_journal_entries',
    ),
]
