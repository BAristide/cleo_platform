"""Service centralisé pour récupérer le taux de TVA par défaut."""

import logging
from decimal import Decimal

logger = logging.getLogger(__name__)


def get_default_tax_rate():
    """
    Retourne le taux de TVA par défaut depuis accounting.Tax.
    Lit la taxe TVA collectée (non déductible) avec le taux le plus élevé.
    Fallback: 0 si aucune taxe configurée.
    """
    try:
        from accounting.models import Tax

        tax = (
            Tax.objects.filter(
                tax_category='vat',
                active=True,
                is_deductible=False,
            )
            .order_by('-amount')
            .first()
        )
        if tax:
            return tax.amount
    except Exception as e:
        logger.warning(f'Impossible de lire le taux de TVA par défaut: {e}')

    return Decimal('0.00')
