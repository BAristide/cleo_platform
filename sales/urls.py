from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

# Créer un routeur pour les vues REST
router = DefaultRouter()
router.register(r'bank-accounts', views.BankAccountViewSet)
router.register(r'products', views.ProductViewSet)
router.register(r'quotes', views.QuoteViewSet)
router.register(r'quote-items', views.QuoteItemViewSet)
router.register(r'orders', views.OrderViewSet)
router.register(r'order-items', views.OrderItemViewSet)
router.register(r'invoices', views.InvoiceViewSet)
router.register(r'invoice-items', views.InvoiceItemViewSet)
router.register(r'payments', views.PaymentViewSet)

app_name = 'sales'

urlpatterns = [
    # CORRECTION: Au lieu de placer les routes sous 'api/', les exposer directement
    path('', include(router.urls)),
]
