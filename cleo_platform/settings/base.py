import os
from datetime import timedelta
from pathlib import Path

from decouple import Csv, config

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# ── Version de la plateforme ────────────────────────────────────
VERSION = '3.26.0'

SITE_URL = config('SITE_URL', default='http://localhost:8000')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'django_filters',
    'corsheaders',
    'core',
    'catalog',
    'crm',
    'sales',
    'hr',
    'payroll',
    'accounting',
    'users',
    'recruitment',
    'inventory',
    'purchasing',
    'dashboard',
    'django_celery_beat',
    'notifications',
    'drf_spectacular',
]

REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'Cleo ERP API',
    'DESCRIPTION': 'API REST de la plateforme de gestion Cleo ERP — CRM, Ventes, Achats, Stocks, RH, Paie, Comptabilité, Recrutement, Notifications.',
    'VERSION': VERSION,
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'SCHEMA_PATH_PREFIX': '/api/',
    'ENUM_NAME_OVERRIDES': {},
    'POSTPROCESSING_HOOKS': [
        'drf_spectacular.hooks.postprocess_schema_enums',
    ],
    'TAGS': [
        {
            'name': 'Core',
            'description': 'Configuration, devises, setup, recherche globale',
        },
        {
            'name': 'CRM',
            'description': 'Contacts, entreprises, opportunités, activités',
        },
        {
            'name': 'Sales',
            'description': 'Produits, devis, commandes, factures, paiements',
        },
        {
            'name': 'Purchasing',
            'description': 'Fournisseurs, bons de commande, réceptions, factures fournisseur',
        },
        {
            'name': 'Inventory',
            'description': 'Entrepôts, niveaux de stock, mouvements, inventaires',
        },
        {
            'name': 'HR',
            'description': 'Employés, départements, postes, missions, formations',
        },
        {'name': 'Payroll', 'description': 'Bulletins de paie, cotisations, avances'},
        {
            'name': 'Accounting',
            'description': 'Plan comptable, écritures, journaux, rapports',
        },
        {
            'name': 'Recruitment',
            'description': 'Offres, candidatures, entretiens, évaluations',
        },
        {
            'name': 'Users',
            'description': "Profils, rôles, permissions, journal d'activité",
        },
        {
            'name': 'Notifications',
            'description': 'Alertes, préférences, centre de notifications',
        },
        {'name': 'Dashboard', 'description': 'Statistiques et KPI consolidés'},
    ],
}

# =========================
# JWT (v3.7.0)
# =========================

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': False,
    'UPDATE_LAST_LOGIN': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'TOKEN_OBTAIN_SERIALIZER': 'rest_framework_simplejwt.serializers.TokenObtainPairSerializer',
}


MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'users.middleware.ActivityLogMiddleware',
]

AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
]

# =========================
# CORS / CSRF (Étape 0.6)
# =========================
CORS_ALLOW_CREDENTIALS = True
CORS_ORIGIN_WHITELIST = config('CORS_ORIGIN_WHITELIST', cast=Csv())
CSRF_TRUSTED_ORIGINS = config('CSRF_TRUSTED_ORIGINS', cast=Csv())

ROOT_URLCONF = 'cleo_platform.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'cleo_platform.wsgi.application'

# =========================
# Database (Étape 0.6)
# =========================
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME'),
        'USER': config('DB_USER'),
        'PASSWORD': config('DB_PASSWORD'),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = 'static/'
STATIC_ROOT = '/data/static/'
MEDIA_URL = '/media/'
MEDIA_ROOT = '/data/media/'

RECRUITMENT_FILES_DIR = os.path.join(MEDIA_ROOT, 'recruitment')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# =========================
# Secrets / Hosts (Étape 0.6)
# =========================
ALLOWED_HOSTS = config('ALLOWED_HOSTS', cast=Csv())
SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool)

# =========================
# API (Étape 0.6)
# =========================
OPENEXCHANGE_API_KEY = config('OPENEXCHANGE_API_KEY', default='')


# =========================
# Email (Étape 0.6)
# =========================
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = config('EMAIL_HOST', default='outlook.office365.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL')
SERVER_EMAIL = config('DEFAULT_FROM_EMAIL')

# Configuration de l'authentification
LOGIN_URL = '/login/'
LOGIN_REDIRECT_URL = '/'
LOGOUT_REDIRECT_URL = '/login/'

# =========================
# Celery (v3.2.0)
# =========================
CELERY_BROKER_URL = config('CELERY_BROKER_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = config(
    'CELERY_RESULT_BACKEND', default='redis://localhost:6379/0'
)
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# =========================
# Logging
# =========================
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{asctime}] {levelname} {name}: {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}
