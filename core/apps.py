from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'
    verbose_name = _('Configuration')

    def ready(self):
        """
        Import des signaux au démarrage de l'application.
        """
        try:
            import core.signals  # noqa: F401
        except ImportError:
            pass
