from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

# Créer un routeur pour les vues REST
router = DefaultRouter()
router.register(r'currencies', views.CurrencyViewSet)

app_name = 'core'

urlpatterns = [
    # Exposer les routes API directement
    path('', include(router.urls)),
]
