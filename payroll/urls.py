# payroll/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

# Créer un routeur pour les vues REST
router = DefaultRouter()
router.register(r'periods', views.PayrollPeriodViewSet)
router.register(r'parameters', views.PayrollParameterViewSet)
router.register(r'contract-types', views.ContractTypeViewSet)
router.register(r'components', views.SalaryComponentViewSet)
router.register(r'tax-brackets', views.TaxBracketViewSet)
router.register(r'employee-payrolls', views.EmployeePayrollViewSet)
router.register(r'payroll-runs', views.PayrollRunViewSet)
router.register(r'payslips', views.PaySlipViewSet)
router.register(r'advances', views.AdvanceSalaryViewSet)
router.register(r'employee-allowances', views.EmployeeAllowanceViewSet)

app_name = 'payroll'

urlpatterns = [
    # Routes API automatiques
    path('', include(router.urls)),
    # Labels dynamiques (pack-agnostique)Route du tableau de bord
    path('labels/', views.payroll_labels, name='labels'),
    path('dashboard/', views.payroll_dashboard, name='dashboard'),
]
