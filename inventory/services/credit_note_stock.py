"""
Service de retour en stock pour les avoirs (clients et fournisseurs).
Génère des StockMove RETURN_IN ou RETURN_OUT.
"""

import logging

from django.utils import timezone

from inventory.models import StockMove, Warehouse

logger = logging.getLogger(__name__)


def _get_default_warehouse():
    """Récupère l'entrepôt par défaut ou le premier actif."""
    wh = Warehouse.objects.filter(is_default=True).first()
    if not wh:
        wh = Warehouse.objects.filter(is_active=True).first()
    return wh


def create_return_stock_move(
    product,
    quantity,
    reference,
    move_type='RETURN_IN',
    source_document_type='credit_note',
    source_document_id=None,
    unit_cost=None,
    user=None,
    notes='',
):
    """
    Crée un StockMove de retour (RETURN_IN pour avoir client, RETURN_OUT pour avoir fournisseur).
    Ne traite que les produits stockables.

    Returns:
        StockMove or None
    """
    if not product:
        return None

    # Ne traiter que les produits stockables
    if getattr(product, 'product_type', 'stockable') != 'stockable':
        logger.info('Produit %s non stockable — retour stock ignoré', product.reference)
        return None

    if quantity <= 0:
        return None

    warehouse = _get_default_warehouse()
    if not warehouse:
        logger.warning(
            'Aucun entrepôt trouvé — retour stock non généré pour %s', reference
        )
        return None

    # Éviter les doublons
    existing = StockMove.objects.filter(
        source_document_type=source_document_type,
        source_document_id=source_document_id,
        product=product,
        move_type=move_type,
    ).exists()
    if existing:
        logger.info(
            'StockMove %s déjà existant pour %s (doc_id=%s)',
            move_type,
            product.reference,
            source_document_id,
        )
        return None

    move = StockMove.objects.create(
        product=product,
        warehouse=warehouse,
        move_type=move_type,
        quantity=quantity,
        unit_cost=unit_cost,
        reference=reference,
        source_document_type=source_document_type,
        source_document_id=source_document_id,
        date=timezone.now(),
        notes=notes or f'Retour stock — {reference}',
        created_by=user,
    )

    logger.info(
        'StockMove %s créé : produit=%s, qté=%s, ref=%s',
        move_type,
        product.reference,
        quantity,
        reference,
    )

    return move


def process_credit_note_returns(credit_note, items_with_return, user=None):
    """
    Traite les retours en stock pour un avoir client.

    Args:
        credit_note: Instance Invoice (type=credit_note)
        items_with_return: list of dicts {product, quantity, invoice_item_id}
        user: Utilisateur courant
    Returns:
        list of StockMove created
    """
    moves = []
    for item_data in items_with_return:
        move = create_return_stock_move(
            product=item_data['product'],
            quantity=item_data['quantity'],
            reference=f'AV-{credit_note.number}',
            move_type='RETURN_IN',
            source_document_type='credit_note_item',
            source_document_id=item_data.get('invoice_item_id'),
            unit_cost=item_data.get('unit_cost'),
            user=user,
            notes=f'Retour client — Avoir {credit_note.number} (Facture {credit_note.parent_invoice.number})',
        )
        if move:
            moves.append(move)
    return moves


def process_supplier_credit_note_returns(credit_note, items_with_return, user=None):
    """
    Traite les retours en stock pour un avoir fournisseur.

    Args:
        credit_note: Instance SupplierInvoice (type=credit_note)
        items_with_return: list of dicts {product, quantity, supplier_invoice_item_id}
        user: Utilisateur courant
    Returns:
        list of StockMove created
    """
    moves = []
    for item_data in items_with_return:
        move = create_return_stock_move(
            product=item_data['product'],
            quantity=item_data['quantity'],
            reference=f'AV-FOURN-{credit_note.number}',
            move_type='RETURN_OUT',
            source_document_type='supplier_credit_note_item',
            source_document_id=item_data.get('supplier_invoice_item_id'),
            unit_cost=item_data.get('unit_cost'),
            user=user,
            notes=f'Retour fournisseur — Avoir {credit_note.number}',
        )
        if move:
            moves.append(move)
    return moves
