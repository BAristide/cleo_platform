# hr/services/leave_parameter_resolver.py
import logging
from decimal import Decimal

logger = logging.getLogger(__name__)


class LeaveParameterResolver:
    """
    Résolution centralisée des paramètres congés.
    Toutes les valeurs proviennent de PayrollParameter (fixtures de pack).
    Identifiés par leur champ `code` (unique par installation).
    Cache 1h. Lève ValueError si le paramètre est absent.
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
    def get(cls, code: str) -> Decimal:
        from django.core.cache import cache

        from payroll.models import PayrollParameter

        cache_key = f'leave_param_{code}'
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        try:
            param = PayrollParameter.objects.get(code=code, is_active=True)
        except PayrollParameter.DoesNotExist:
            raise ValueError(
                f"Paramètre congé '{code}' absent. "
                f'Vérifiez les fixtures du pack actif dans _load_locale_pack().'
            )

        value = param.value or Decimal('0')
        cache.set(cache_key, value, 3600)
        return value

    @classmethod
    def get_optional(cls, code: str, default=None):
        """
        Comme get() mais retourne `default` si le paramètre est absent.
        Utilisé pour les paramètres optionnels selon le pack (ex: LEAVE_MAX_CARRY_DAYS).
        """
        from decimal import Decimal

        from django.core.cache import cache

        from payroll.models import PayrollParameter

        if default is None:
            default = Decimal('0')

        cache_key = f'leave_param_{code}'
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        try:
            param = PayrollParameter.objects.get(code=code, is_active=True)
            value = param.value or Decimal('0')
            cache.set(cache_key, value, 3600)
            return value
        except PayrollParameter.DoesNotExist:
            logger.info(
                f"Paramètre congé '{code}' absent du pack actif — valeur par défaut : {default}"
            )
            return default

    @classmethod
    def clear_cache(cls):
        from django.core.cache import cache

        cache.delete_many([f'leave_param_{k}' for k in cls.REQUIRED_KEYS])
