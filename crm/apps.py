from django.apps import AppConfig


class CrmConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'crm'
    verbose_name = 'CRM'

    def ready(self):
        """
        Import les signaux lors du chargement de l'application.
        Cela permet d'enregistrer les handlers de signaux.
        """
