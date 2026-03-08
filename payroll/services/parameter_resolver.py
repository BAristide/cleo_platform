# payroll/services/parameter_resolver.py
from decimal import Decimal

from django.core.cache import cache

from ..models import PayrollParameter

REQUIRED_PARAMS = [
    'CNSS_CEILING',
    'CNSS_EMPLOYEE_RATE',
    'CNSS_EMPLOYER_RATE',
    'AMO_EMPLOYEE_RATE',
    'AMO_EMPLOYER_RATE',
    'WORKING_DAYS_MONTH',
    'WORKING_HOURS_MONTH',
]

OPTIONAL_PARAMS_DEFAULTS = {
    'SENIORITY_2Y_RATE': Decimal('0'),
    'SENIORITY_5Y_RATE': Decimal('0'),
    'SENIORITY_12Y_RATE': Decimal('0'),
    'SENIORITY_20Y_RATE': Decimal('0'),
    'SENIORITY_25Y_RATE': Decimal('0'),
    'SPOUSE_DEDUCTION': Decimal('0'),
    'CHILD_DEDUCTION': Decimal('0'),
    'MAX_DEPENDENT_CHILDREN': Decimal('0'),
    'SMIG': Decimal('0'),
}

CACHE_TTL = 3600  # 1 heure


class PayrollParameterResolver:
    @staticmethod
    def get_required(code: str) -> Decimal:
        """
        Retourne la valeur d'un paramètre requis depuis la base.
        Lève ValueError si absent ou inactif — bloque le calcul du bulletin.
        """
        cache_key = f'payroll_param_{code}'
        cached = cache.get(cache_key)
        if cached is not None:
            return cached
        try:
            value = PayrollParameter.objects.get(code=code, is_active=True).value
            cache.set(cache_key, value, CACHE_TTL)
            return value
        except PayrollParameter.DoesNotExist:
            raise ValueError(
                f"Paramètre de paie requis '{code}' absent ou inactif. "
                f'Vérifiez le chargement du pack via '
                f"'python manage.py init_payroll_data --locale <pack> --force'."
            )

    @staticmethod
    def get_optional(code: str, fallback: Decimal = Decimal('0')) -> Decimal:
        """
        Retourne la valeur d'un paramètre optionnel depuis la base.
        Retourne fallback si absent — sans erreur.
        """
        cache_key = f'payroll_param_{code}'
        cached = cache.get(cache_key)
        if cached is not None:
            return cached
        try:
            value = PayrollParameter.objects.get(code=code, is_active=True).value
            cache.set(cache_key, value, CACHE_TTL)
            return value
        except PayrollParameter.DoesNotExist:
            return fallback

    @staticmethod
    def validate_pack() -> dict:
        """
        Vérifie que tous les paramètres requis sont présents et actifs en base.
        Retourne {valid, missing, configured, total_required}.
        """
        configured = list(
            PayrollParameter.objects.filter(
                code__in=REQUIRED_PARAMS, is_active=True
            ).values_list('code', flat=True)
        )
        missing = [c for c in REQUIRED_PARAMS if c not in configured]
        return {
            'valid': len(missing) == 0,
            'missing': missing,
            'configured': configured,
            'total_required': len(REQUIRED_PARAMS),
        }

    @staticmethod
    def clear_cache():
        """Invalide le cache de tous les paramètres en base (dynamique, pas de liste hardcodée)."""
        all_codes = list(PayrollParameter.objects.values_list('code', flat=True))
        for code in all_codes:
            cache.delete(f'payroll_param_{code}')
