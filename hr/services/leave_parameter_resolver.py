# hr/services/leave_parameter_resolver.py
from decimal import Decimal


class LeaveParameterResolver:
    """
    Résolution centralisée des paramètres congés.
    Toutes les valeurs proviennent de PayrollParameter (fixtures de pack).
    Cache 1h — même mécanisme que PayrollParameterResolver.
    Lève ValueError explicite si un paramètre est absent du pack actif.
    Pack-indépendant : zéro constante nationale dans ce service.
    """

    REQUIRED_KEYS = [
        'LEAVE_ANNUAL_DAYS',
        'LEAVE_ACCRUAL_DAY',
        'LEAVE_SICK_DAYS_ANNUAL',
        'LEAVE_MATERNITY_DAYS',
        'LEAVE_PATERNITY_DAYS',
    ]

    @classmethod
    def get(cls, key: str) -> Decimal:
        from django.core.cache import cache

        from payroll.models import PayrollParameter

        cache_key = f'leave_param_{key}'
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        try:
            param = PayrollParameter.objects.get(key=key)
        except PayrollParameter.DoesNotExist:
            raise ValueError(
                f"Paramètre congé '{key}' absent. "
                f'Vérifiez les fixtures du pack actif dans _load_locale_pack().'
            )

        value = param.value_decimal or Decimal('0')
        cache.set(cache_key, value, 3600)
        return value

    @classmethod
    def clear_cache(cls):
        from django.core.cache import cache

        cache.delete_many([f'leave_param_{k}' for k in cls.REQUIRED_KEYS])
