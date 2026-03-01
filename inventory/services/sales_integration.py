"""
Intégration Sales → Stocks.
Génère automatiquement des StockMove OUT lors de la création de lignes de facture.
"""

import logging

from django.contrib.contenttypes.models import ContentType
from django.utils import timezone

from inventory.models import StockMove, Warehouse

logger = logging.getLogger(__name__)


def create_stock_move_for_invoice_item(invoice_item):
    """
    Crée un StockMove OUT pour une ligne de facture
    si le produit est de type 'stockable'.
    Ne traite que les factures standard (pas les avoirs ni les acomptes).
    """
    invoice = invoice_item.invoice

    # Ne pas traiter les avoirs ni les factures d'acompte
    if invoice.type in ('credit_note', 'deposit'):
        return None

    product = invoice_item.product
    if not product:
        return None

    # Ne traiter que les produits stockables
    if getattr(product, 'product_type', 'stockable') != 'stockable':
        return None

    # Éviter les quantités nulles ou négatives
    if invoice_item.quantity <= 0:
        return None

    # Récupérer l'entrepôt par défaut
    default_warehouse = Warehouse.objects.filter(is_default=True).first()
    if not default_warehouse:
        default_warehouse = Warehouse.objects.filter(is_active=True).first()

    if not default_warehouse:
        logger.warning(
            'Aucun entrepôt trouvé — mouvement stock non généré pour facture %s',
            invoice.number,
        )
        return None

    # Éviter les doublons (si le signal se déclenche plusieurs fois)
    ct = ContentType.objects.get_for_model(invoice_item)
    existing = StockMove.objects.filter(
        content_type=ct,
        object_id=invoice_item.pk,
    ).exists()
    if existing:
        return None

    move = StockMove.objects.create(
        product=product,
        warehouse=default_warehouse,
        move_type='OUT',
        quantity=invoice_item.quantity,
        unit_cost=invoice_item.unit_price,
        reference=f'FACT-{invoice.number}',
        content_type=ct,
        object_id=invoice_item.pk,
        date=timezone.now(),
        notes=f'Sortie automatique — Facture {invoice.number}',
    )

    logger.info(
        'Facture %s, ligne %s : StockMove OUT créé (produit=%s, qté=%s)',
        invoice.number,
        invoice_item.pk,
        product.reference,
        invoice_item.quantity,
    )

    return move
