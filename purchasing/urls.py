from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'suppliers', views.SupplierViewSet)
router.register(r'purchase-orders', views.PurchaseOrderViewSet)
router.register(r'purchase-order-items', views.PurchaseOrderItemViewSet)
router.register(r'receptions', views.ReceptionViewSet)
router.register(r'reception-items', views.ReceptionItemViewSet)
router.register(r'supplier-invoices', views.SupplierInvoiceViewSet)
router.register(r'supplier-invoice-items', views.SupplierInvoiceItemViewSet)
router.register(r'supplier-payments', views.SupplierPaymentViewSet)

app_name = 'purchasing'

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', views.dashboard_view, name='dashboard'),
]
