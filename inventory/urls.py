from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'warehouses', views.WarehouseViewSet)
router.register(r'product-categories', views.ProductCategoryViewSet)
router.register(r'stock-moves', views.StockMoveViewSet)
router.register(r'stock-levels', views.StockLevelViewSet)
router.register(r'inventories', views.StockInventoryViewSet)
router.register(r'inventory-lines', views.StockInventoryLineViewSet)

app_name = 'inventory'

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', views.dashboard_view, name='dashboard'),
]
