from django.apps import AppConfig


class SalesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'sales'
    verbose_name = 'Ventes'

    def ready(self):
        """
        Méthode exécutée lors du chargement de l'application.
        Utile pour enregistrer les signaux ou effectuer d'autres initialisations.
        """
