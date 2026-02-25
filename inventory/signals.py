import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import StockMove
from .services.stock_service import update_stock_level

logger = logging.getLogger(__name__)


@receiver(post_save, sender=StockMove)
def on_stock_move_created(sender, instance, created, **kwargs):
    """Met à jour le StockLevel automatiquement après chaque nouveau mouvement."""
    if created:
        update_stock_level(instance)


def _on_invoice_item_created(sender, instance, created, **kwargs):
    """Génère un StockMove OUT pour chaque ligne de facture stockable."""
    if created:
        from .services.sales_integration import create_stock_move_for_invoice_item

        create_stock_move_for_invoice_item(instance)


def connect_sales_signals():
    """
    Connecte les signaux Sales → Stocks via post_save.connect().
    """
    from sales.models import InvoiceItem

    post_save.connect(
        _on_invoice_item_created,
        sender=InvoiceItem,
        dispatch_uid='inventory_invoice_item_stock_move',
    )
    logger.info('Signal Sales → Stocks connecté (InvoiceItem)')
