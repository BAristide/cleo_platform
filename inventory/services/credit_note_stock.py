"""
Service de retour en stock pour les avoirs (clients et fournisseurs).
Genere des StockMove RETURN_IN ou RETURN_OUT.
"""

import logging

from django.contrib.contenttypes.models import ContentType
from django.utils import timezone

from inventory.models import StockMove, Warehouse

logger = logging.getLogger(__name__)


def _get_default_warehouse():
    """Recupere l'entrepot par defaut ou le premier actif."""
    wh = Warehouse.objects.filter(is_default=True).first()
    if not wh:
        wh = Warehouse.objects.filter(is_active=True).first()
    return wh


def create_return_stock_move(
    product,
    quantity,
    reference,
    move_type='RETURN_IN',
    source_object=None,
    unit_cost=None,
    user=None,
    notes='',
):
    """
    Cree un StockMove de retour (RETURN_IN pour avoir client, RETURN_OUT pour avoir fournisseur).
    Ne traite que les produits stockables.
    """
    if not product:
        return None

    if getattr(product, 'product_type', 'stockable') != 'stockable':
        logger.info('Produit %s non stockable — retour stock ignore', product.reference)
        return None

    if quantity <= 0:
        return None

    warehouse = _get_default_warehouse()
    if not warehouse:
        logger.warning(
            'Aucun entrepot trouve — retour stock non genere pour %s', reference
        )
        return None

    # Preparer les champs GenericFK
    ct = None
    obj_id = None
    if source_object is not None:
        ct = ContentType.objects.get_for_model(source_object)
        obj_id = source_object.pk

    # Eviter les doublons
    if ct and obj_id:
        existing = StockMove.objects.filter(
            content_type=ct,
            object_id=obj_id,
            product=product,
            move_type=move_type,
        ).exists()
        if existing:
            logger.info(
                'StockMove %s deja existant pour %s (ct=%s, obj_id=%s)',
                move_type,
                product.reference,
                ct,
                obj_id,
            )
            return None

    move = StockMove.objects.create(
        product=product,
        warehouse=warehouse,
        move_type=move_type,
        quantity=quantity,
        unit_cost=unit_cost,
        reference=reference,
        content_type=ct,
        object_id=obj_id,
        date=timezone.now(),
        notes=notes or f'Retour stock — {reference}',
        created_by=user,
    )

    logger.info(
        'StockMove %s cree : produit=%s, qte=%s, ref=%s',
        move_type,
        product.reference,
        quantity,
        reference,
    )

    return move


def process_credit_note_returns(credit_note, items_with_return, user=None):
    """
    Traite les retours en stock pour un avoir client.
    """
    moves = []
    for item_data in items_with_return:
        move = create_return_stock_move(
            product=item_data['product'],
            quantity=item_data['quantity'],
            reference=f'AV-{credit_note.number}',
            move_type='RETURN_IN',
            source_object=credit_note,
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
    """
    moves = []
    for item_data in items_with_return:
        move = create_return_stock_move(
            product=item_data['product'],
            quantity=item_data['quantity'],
            reference=f'AV-FOURN-{credit_note.number}',
            move_type='RETURN_OUT',
            source_object=credit_note,
            unit_cost=item_data.get('unit_cost'),
            user=user,
            notes=f'Retour fournisseur — Avoir {credit_note.number}',
        )
        if move:
            moves.append(move)
    return moves
