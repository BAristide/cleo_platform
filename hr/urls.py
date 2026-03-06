from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

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
router.register(r'announcements', views.AnnouncementViewSet)
router.register(r'certificates', views.WorkCertificateRequestViewSet)
router.register(r'complaints', views.ComplaintViewSet)
router.register(r'reward-types', views.RewardTypeViewSet)
router.register(r'rewards', views.RewardViewSet)
# Congés — EVO-09
router.register(r'leave-types', views.LeaveTypeViewSet)
router.register(r'leave-allocations', views.LeaveAllocationViewSet)
router.register(r'leave-requests', views.LeaveRequestViewSet)

app_name = 'hr'

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', views.dashboard_view, name='dashboard'),
]
