import logging

from django.core.cache import cache
from django.utils.translation import gettext_lazy as _

logger = logging.getLogger(__name__)


class AccountResolver:
    """
    Service centralisé de résolution des comptes comptables par rôle fonctionnel.
    Le code applicatif ne référence jamais un code de compte directement —
    il référence un rôle (ex: 'salary_expense') que ce service résout vers
    le compte réel du plan comptable actif.
    Utilise le cache Django pour éviter les requêtes répétées.
    """

    CACHE_PREFIX = 'account_mapping_'
    CACHE_TTL = 3600  # 1 heure

    @classmethod
    def get_account(cls, role):
        """
        Résout un rôle fonctionnel vers un objet Account.

        Args:
            role (str): Identifiant du rôle (ex: 'salary_expense')

        Returns:
            Account: L'objet compte associé

        Raises:
            ValueError: Si le rôle n'est pas configuré dans AccountMapping
        """
        from accounting.models import AccountMapping

        cache_key = f'{cls.CACHE_PREFIX}{role}'
        account = cache.get(cache_key)

        if account is None:
            try:
                mapping = AccountMapping.objects.select_related('account').get(
                    role=role
                )
                account = mapping.account
                cache.set(cache_key, account, cls.CACHE_TTL)
            except AccountMapping.DoesNotExist:
                raise ValueError(
                    _(
                        "Rôle comptable '{}' non configuré. "
                        'Vérifiez la table AccountMapping.'
                    ).format(role)
                )

        return account

    @classmethod
    def get_code(cls, role):
        """
        Raccourci : retourne directement le code du compte associé au rôle.

        Args:
            role (str): Identifiant du rôle

        Returns:
            str: Code du compte (ex: '661', '6171', '641')
        """
        return cls.get_account(role).code

    @classmethod
    def clear_cache(cls):
        """
        Invalide le cache pour tous les rôles connus.
        À appeler après toute modification des AccountMapping.
        """
        from accounting.models import AccountMapping

        for role, _label in AccountMapping.ROLE_CHOICES:
            cache.delete(f'{cls.CACHE_PREFIX}{role}')
        logger.info('AccountResolver: cache invalidé')

    @classmethod
    def validate_all_roles(cls, required_roles=None):
        """
        Vérifie que tous les rôles requis sont configurés en base.
        Utilisé au setup et dans les health checks API.

        Args:
            required_roles (list|None): Liste de rôles à vérifier.
                Si None, vérifie uniquement les rôles opérationnels critiques.

        Returns:
            dict: {
                'valid': bool,
                'missing': [rôles manquants],
                'configured': [rôles configurés],
                'total_configured': int
            }
        """
        from accounting.models import AccountMapping

        if required_roles is None:
            # Rôles critiques pour les opérations courantes
            required_roles = [
                'client_receivable',
                'sales_revenue',
                'vat_collected',
                'supplier_payable',
                'purchase_expense',
                'vat_deductible',
                'bank',
                'cash',
                'salary_expense',
                'social_charges_expense',
                'salary_payable',
                'social_charges_payable',
            ]

        configured = set(AccountMapping.objects.values_list('role', flat=True))
        missing = [r for r in required_roles if r not in configured]

        return {
            'valid': len(missing) == 0,
            'missing': missing,
            'configured': list(configured),
            'total_configured': len(configured),
        }
