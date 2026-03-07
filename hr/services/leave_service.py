# hr/services/leave_service.py
from datetime import date, timedelta
from decimal import Decimal


def calculate_working_days(start_date: date, end_date: date) -> Decimal:
    """
    Calcule le nombre de jours ouvres entre deux dates (lundi-vendredi),
    en excluant les jours feries charges en base via _load_locale_pack().
    Pack-independant : aucune date nationale n'est hardcodee ici.
    Les jours feries sont dans PublicHoliday, charges par core/views._load_locale_pack().
    """
    if start_date > end_date:
        return Decimal('0')

    from django.db.models import Q

    from hr.models import PublicHoliday

    holidays = list(
        PublicHoliday.objects.filter(
            Q(date__range=(start_date, end_date)) | Q(is_recurring=True)
        )
    )

    count = 0
    current = start_date
    while current <= end_date:
        if current.weekday() < 5:
            if not any(h.matches_date(current) for h in holidays):
                count += 1
        current += timedelta(days=1)

    return Decimal(str(count))
