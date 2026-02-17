from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

# Créer un routeur pour les vues REST
router = DefaultRouter()
router.register(r'departments', views.DepartmentViewSet)
router.register(r'job-titles', views.JobTitleViewSet)
router.register(r'employees', views.EmployeeViewSet)
router.register(r'missions', views.MissionViewSet)
router.register(r'availabilities', views.AvailabilityViewSet)
router.register(r'skills', views.SkillViewSet)
router.register(r'training-courses', views.TrainingCourseViewSet)
router.register(r'training-plans', views.TrainingPlanViewSet)
router.register(r'training-plan-items', views.TrainingPlanItemViewSet)

app_name = 'hr'

urlpatterns = [
    # Routes API automatiques
    path('', include(router.urls)),
    # Route du tableau de bord
    path('dashboard/', views.dashboard_view, name='dashboard'),
]
