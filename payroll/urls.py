# payroll/urls.py
from django.urls import path, include
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

app_name = 'payroll'

urlpatterns = [
    # Routes API automatiques
    path('', include(router.urls)),
    
    # Route du tableau de bord
    path('dashboard/', views.payroll_dashboard, name='dashboard'),
]

