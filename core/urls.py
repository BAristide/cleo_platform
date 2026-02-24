from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'currencies', views.CurrencyViewSet)

app_name = 'core'

urlpatterns = [
    path('', include(router.urls)),
    # ── Localization Packs — Setup API ───────────────────────────────
    path('setup/status/', views.SetupStatusView.as_view(), name='setup-status'),
    path('setup/packs/', views.SetupPacksView.as_view(), name='setup-packs'),
    path('setup/', views.SetupCreateView.as_view(), name='setup-create'),
    # ── Infos entreprise (post-setup) ────────────────────────────────
    path('company/', views.CompanyInfoView.as_view(), name='company-info'),
]
