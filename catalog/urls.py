from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'products', views.ProductViewSet)
router.register(r'product-categories', views.ProductCategoryViewSet)

app_name = 'catalog'

urlpatterns = [
    path('', include(router.urls)),
]
