# recruitment/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'job-openings', views.JobOpeningViewSet)
router.register(r'candidates', views.CandidateViewSet)
router.register(r'applications', views.ApplicationViewSet)
router.register(r'interview-panels', views.InterviewPanelViewSet)
router.register(r'interviewers', views.InterviewerViewSet)
router.register(r'evaluation-criteria', views.EvaluationCriterionViewSet)
router.register(r'evaluations', views.CandidateEvaluationViewSet)
router.register(r'statistics', views.RecruitmentStatsViewSet)
router.register(r'notifications', views.RecruitmentNotificationViewSet)

# URLs pour la page publique de candidature
#public_urls = [
#    path('apply/<str:reference>/', views.public_application_form, name='public-application-form'),
#    path('apply/<str:reference>/submit/', views.submit_application, name='submit-application'),
#    path('apply/thank-you/', views.application_thank_you, name='application-thank-you'),
#]

urlpatterns = [
    path('', include(router.urls)),
 #   path('public/', include(public_urls)),
#    path('dashboard/', views.recruitment_dashboard, name='recruitment-dashboard'),
]
