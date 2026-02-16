from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Créer un routeur pour les vues REST
router = DefaultRouter()
router.register(r'contacts', views.ContactViewSet)
router.register(r'companies', views.CompanyViewSet)
router.register(r'opportunities', views.OpportunityViewSet)
router.register(r'activities', views.ActivityViewSet)
router.register(r'sales-stages', views.SalesStageViewSet)
router.register(r'industries', views.IndustryViewSet)
router.register(r'tags', views.TagViewSet)
router.register(r'activity-types', views.ActivityTypeViewSet)
# Nouveau routeur pour le chatbot
router.register(r'chatbot', views.ChatbotViewSet, basename='chatbot')

app_name = 'crm'

urlpatterns = [
    # Routes API existantes
    path('', include(router.urls)),
    
    # AJOUT: Nouvel endpoint pour le tableau de bord
    path('dashboard/', views.dashboard_view, name='dashboard'),
    # URLs spécifiques au chatbot qui ne suivent pas le modèle standard API REST
    path('api/chatbot/qualify/', views.chatbot_qualify, name='chatbot_qualify'),
    path('api/chatbot/faq/', views.chatbot_faq, name='chatbot_faq'),
    path('api/chatbot/appointment/', views.chatbot_appointment, name='chatbot_appointment'),
    path('api/chatbot/support/', views.chatbot_support, name='chatbot_support'),
]
