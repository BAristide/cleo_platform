from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import StockMove
from .services.stock_service import update_stock_level


@receiver(post_save, sender=StockMove)
def on_stock_move_created(sender, instance, created, **kwargs):
    """Met à jour le StockLevel automatiquement après chaque nouveau mouvement."""
    if created:
        update_stock_level(instance)
