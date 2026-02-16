import os

environment = os.environ.get('DJANGO_ENV', 'production').lower()

if environment == 'development':
    from .development import *
elif environment == 'production':
    from .production import *
else:
    from .base import *
