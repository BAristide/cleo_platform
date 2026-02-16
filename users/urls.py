from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Créer un routeur pour les vues REST
router = DefaultRouter()
router.register(r'users', views.UserViewSet)
router.register(r'roles', views.UserRoleViewSet)
router.register(r'activity-logs', views.ActivityLogViewSet)

app_name = 'users'

urlpatterns = [
    # Routes API automatiques
    path('', include(router.urls)),
    
    # Route pour la création manuelle de logs
    path('log-activity/', views.log_activity, name='log_activity'),
]
