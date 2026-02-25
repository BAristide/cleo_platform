from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class InventoryConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'inventory'
    verbose_name = _('Gestion des stocks')

    def ready(self):
        import inventory.signals  # noqa: F401

        # Connecter les signaux Sales → Stocks (import différé pour éviter les circulaires)
        from inventory.signals import connect_sales_signals

        connect_sales_signals()
