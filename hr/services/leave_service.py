# hr/services/leave_service.py
from datetime import date, timedelta
from decimal import Decimal


def calculate_working_days(start_date: date, end_date: date) -> Decimal:
    """
    Calcule le nombre de jours ouvrés entre deux dates (lundi–vendredi).
    Hors jours fériés — dette technique documentée (Annexe B).
    Pack-indépendant : aucune référence à un calendrier national.
    """
    if start_date > end_date:
        return Decimal('0')
    count = 0
    current = start_date
    while current <= end_date:
        if current.weekday() < 5:  # lundi=0 ... vendredi=4
            count += 1
        current += timedelta(days=1)
    return Decimal(str(count))
