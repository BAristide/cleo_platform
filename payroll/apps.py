# payroll/apps.py
from django.apps import AppConfig


class PayrollConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'payroll'
    verbose_name = 'Paie'

    def ready(self):
        # Importer les signaux
        pass
