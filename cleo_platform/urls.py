from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.contrib.auth.decorators import login_required
from django.urls import include, path
from django.views.generic import TemplateView
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from . import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('api/check-auth/', views.check_auth, name='check_auth'),
    # Routes protégées (nécessitent une authentification)
    path('', login_required(views.index_view), name='index'),
    path('api/core/', include('core.urls')),
    path('api/crm/', include('crm.urls')),
    path('api/catalog/', include('catalog.urls')),
    path('api/sales/', include('sales.urls')),
    path('api/hr/', include('hr.urls')),
    path('api/payroll/', include('payroll.urls')),
    path('api/accounting/', include('accounting.urls')),
    path('api/users/', include('users.urls')),
    path('api/recruitment/', include('recruitment.urls')),
    path('api/inventory/', include('inventory.urls')),
    path('api/purchasing/', include('purchasing.urls')),
    path('api/dashboard/', include('dashboard.urls')),
    path('api/notifications/', include('notifications.urls')),
    # Documentation API (Swagger / ReDoc)
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path(
        'api/docs/',
        SpectacularSwaggerView.as_view(url_name='schema'),
        name='swagger-ui',
    ),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    # Authentification JWT (v3.7.0)
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # Routes pour le frontend (nécessitent une authentification)
    path('crm/', login_required(TemplateView.as_view(template_name='index.html'))),
    path(
        'crm/<path:path>',
        login_required(TemplateView.as_view(template_name='index.html')),
    ),
    path('sales/', login_required(TemplateView.as_view(template_name='index.html'))),
    path(
        'sales/<path:path>',
        login_required(TemplateView.as_view(template_name='index.html')),
    ),
    path('hr/', login_required(TemplateView.as_view(template_name='index.html'))),
    path(
        'hr/<path:path>',
        login_required(TemplateView.as_view(template_name='index.html')),
    ),
    path('payroll/', login_required(TemplateView.as_view(template_name='index.html'))),
    path(
        'payroll/<path:path>',
        login_required(TemplateView.as_view(template_name='index.html')),
    ),
    path(
        'accounting/', login_required(TemplateView.as_view(template_name='index.html'))
    ),
    path(
        'accounting/<path:path>',
        login_required(TemplateView.as_view(template_name='index.html')),
    ),
    path('users/', login_required(TemplateView.as_view(template_name='index.html'))),
    path(
        'users/<path:path>',
        login_required(TemplateView.as_view(template_name='index.html')),
    ),
    path(
        'recruitment/', login_required(TemplateView.as_view(template_name='index.html'))
    ),
    path(
        'recruitment/<path:path>',
        login_required(TemplateView.as_view(template_name='index.html')),
    ),
    path('catalog/', login_required(TemplateView.as_view(template_name='index.html'))),
    path(
        'catalog/<path:path>',
        login_required(TemplateView.as_view(template_name='index.html')),
    ),
    path(
        'inventory/', login_required(TemplateView.as_view(template_name='index.html'))
    ),
    path(
        'inventory/<path:path>',
        login_required(TemplateView.as_view(template_name='index.html')),
    ),
    path(
        'purchasing/', login_required(TemplateView.as_view(template_name='index.html'))
    ),
    path(
        'purchasing/<path:path>',
        login_required(TemplateView.as_view(template_name='index.html')),
    ),
    # Nouveau : routes frontend pour Settings
    path('settings/', login_required(TemplateView.as_view(template_name='index.html'))),
    path(
        'settings/<path:path>',
        login_required(TemplateView.as_view(template_name='index.html')),
    ),
    # Module Espace Employé (v3.35.0)
    path('my-space/', login_required(TemplateView.as_view(template_name='index.html'))),
    path(
        'my-space/<path:path>',
        login_required(TemplateView.as_view(template_name='index.html')),
    ),
    # Routes SPA : notifications, profil (v3.37.0)
    path(
        'notifications/',
        login_required(TemplateView.as_view(template_name='index.html')),
    ),
    path(
        'notifications/<path:path>',
        login_required(TemplateView.as_view(template_name='index.html')),
    ),
    path('profile/', login_required(TemplateView.as_view(template_name='index.html'))),
    path(
        'profile/<path:path>',
        login_required(TemplateView.as_view(template_name='index.html')),
    ),
]

urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
