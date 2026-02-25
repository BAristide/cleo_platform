from decimal import Decimal

from django.db import transaction

from inventory.models import StockLevel

# Types de mouvements qui AUGMENTENT le stock
MOVE_TYPES_IN = {'IN', 'RETURN_IN'}

# Types qui DIMINUENT le stock
MOVE_TYPES_OUT = {'OUT', 'RETURN_OUT'}

# Ajustement : la quantité remplace (via différence)
MOVE_TYPES_ADJUST = {'ADJUST'}

# Transfert : sort d'un entrepôt, entre dans un autre (géré séparément)
MOVE_TYPES_TRANSFER = {'TRANSFER'}


@transaction.atomic
def update_stock_level(stock_move):
    """
    Met à jour le StockLevel après création d'un StockMove.
    Crée le StockLevel s'il n'existe pas encore.
    """
    level, _created = StockLevel.objects.select_for_update().get_or_create(
        product=stock_move.product,
        warehouse=stock_move.warehouse,
        defaults={'quantity_on_hand': Decimal('0'), 'quantity_reserved': Decimal('0')},
    )

    move_type = stock_move.move_type
    qty = stock_move.quantity

    if move_type in MOVE_TYPES_IN:
        level.quantity_on_hand += qty
    elif move_type in MOVE_TYPES_OUT:
        level.quantity_on_hand -= qty
    elif move_type in MOVE_TYPES_ADJUST:
        # Pour un ajustement d'inventaire, la quantité du move est la valeur absolue
        # de la différence. On détermine le sens via les notes ou le signe.
        # Convention : si source_document_type == 'inventory', on lit la différence
        # directement depuis la ligne d'inventaire. Sinon, on traite comme une entrée.
        if (
            stock_move.source_document_type == 'inventory'
            and stock_move.source_document_id
        ):
            from inventory.models import StockInventoryLine

            # Recalculer à partir des lignes d'inventaire validées
            lines = StockInventoryLine.objects.filter(
                inventory_id=stock_move.source_document_id,
                product=stock_move.product,
            )
            for line in lines:
                diff = line.physical_qty - line.theoretical_qty
                level.quantity_on_hand += diff
        else:
            # Ajustement manuel positif (entrée)
            level.quantity_on_hand += qty

    level.save()
    return level
