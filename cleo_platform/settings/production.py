from .base import *

DEBUG = False

# Sécurité supplémentaire en production
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# Si ton reverse proxy (nginx) envoie X-Forwarded-Proto=https
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
