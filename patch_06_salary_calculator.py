# payroll/services/parameter_resolver.py
"""
PayrollParameterResolver — v3.28.0.
Supporte reference_date pour le versioning des taux (PAIE-23).
"""

from datetime import date
from decimal import Decimal

from django.core.cache import cache
from django.db import models

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

CACHE_TTL = 3600  # 1 heure


class PayrollParameterResolver:
    @staticmethod
    def get_required(code: str, reference_date=None) -> Decimal:
        """
        Retourne la valeur d'un parametre requis depuis la base.
        Si reference_date est fourni, filtre par date d'effet et date de fin.
        Leve ValueError si absent ou inactif.
        """
        today = reference_date or date.today()
        # Pas de cache si reference_date explicite (recalcul historique)
        if reference_date is None:
            cache_key = f'payroll_param_{code}'
            cached = cache.get(cache_key)
            if cached is not None:
                return cached

        param = (
            PayrollParameter.objects.filter(
                code=code,
                is_active=True,
                effective_date__lte=today,
            )
            .filter(models.Q(end_date__isnull=True) | models.Q(end_date__gte=today))
            .order_by('-effective_date')
            .first()
        )

        if param is None:
            raise ValueError(
                f"Parametre de paie requis '{code}' absent ou inactif "
                f'pour la date {today}. '
                f'Verifiez le chargement du pack via '
                f"'python manage.py init_payroll_data --locale <pack> --force'."
            )

        if reference_date is None:
            cache.set(f'payroll_param_{code}', param.value, CACHE_TTL)
        return param.value

    @staticmethod
    def get_optional(
        code: str, fallback: Decimal = Decimal('0'), reference_date=None
    ) -> Decimal:
        """
        Retourne la valeur d'un parametre optionnel depuis la base.
        Retourne fallback si absent — sans erreur.
        """
        today = reference_date or date.today()
        if reference_date is None:
            cache_key = f'payroll_param_{code}'
            cached = cache.get(cache_key)
            if cached is not None:
                return cached

        param = (
            PayrollParameter.objects.filter(
                code=code,
                is_active=True,
                effective_date__lte=today,
            )
            .filter(models.Q(end_date__isnull=True) | models.Q(end_date__gte=today))
            .order_by('-effective_date')
            .first()
        )

        if param is None:
            return fallback

        if reference_date is None:
            cache.set(f'payroll_param_{code}', param.value, CACHE_TTL)
        return param.value

    @staticmethod
    def validate_pack() -> dict:
        """
        Verifie que tous les parametres requis sont presents et actifs en base.
        """
        today = date.today()
        configured = []
        for code in REQUIRED_PARAMS:
            exists = (
                PayrollParameter.objects.filter(
                    code=code,
                    is_active=True,
                    effective_date__lte=today,
                )
                .filter(models.Q(end_date__isnull=True) | models.Q(end_date__gte=today))
                .exists()
            )
            if exists:
                configured.append(code)
        missing = [c for c in REQUIRED_PARAMS if c not in configured]
        return {
            'valid': len(missing) == 0,
            'missing': missing,
            'configured': configured,
            'total_required': len(REQUIRED_PARAMS),
        }

    @staticmethod
    def clear_cache():
        """Invalide le cache de tous les parametres en base (dynamique)."""
        all_codes = list(PayrollParameter.objects.values_list('code', flat=True))
        for code in all_codes:
            cache.delete(f'payroll_param_{code}')
