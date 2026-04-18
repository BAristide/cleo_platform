"""
Service d'initialisation comptable — v2.0 (Localization Packs).
Charge les données depuis les fixtures locales au lieu du code hardcodé.
"""

import importlib
import logging
from datetime import date

from django.utils import timezone

from core.models import Currency

from ..models import (
    Account,
    AccountMapping,
    AccountType,
    AnalyticAccount,
    FiscalYear,
    Journal,
    Tax,
)

logger = logging.getLogger(__name__)

# Mapping pack → module de fixtures
PACK_MODULES = {
    'MA': 'accounting.fixtures.locales.ma',
    'OHADA': 'accounting.fixtures.locales.ohada',
    'FR': 'accounting.fixtures.locales.fr',
}


class InitAccountingService:
    """Service d'initialisation des données comptables depuis les fixtures."""

    def __init__(self, locale_pack='MA', force=False):
        self.locale_pack = locale_pack.upper() if locale_pack else 'MA'
        self.force = force

        # Charger le module de fixtures
        module_path = PACK_MODULES.get(self.locale_pack)
        if not module_path:
            raise ValueError(
                f'Pack inconnu : {self.locale_pack}. Disponibles : {list(PACK_MODULES.keys())}'
            )

        self.fixtures = importlib.import_module(module_path)
        self.base = importlib.import_module('accounting.fixtures.locales.base')

    def init_all(self, default_currency_code=None):
        """Initialise toutes les données comptables depuis les fixtures."""
        if default_currency_code is None:
            default_currency_code = getattr(self.fixtures, 'DEFAULT_CURRENCY', 'MAD')

        self.create_currencies(default_currency_code=default_currency_code)
        self.create_account_types()
        self.create_accounts()
        self.create_journals()
        self.create_fiscal_year()
        self.create_taxes()
        self.create_analytic_accounts()
        self.create_account_mappings()

    def create_currencies(self, default_currency_code='MAD'):
        """Crée les devises depuis les fixtures du pack."""
        if self.force and Currency.objects.exists():
            Currency.objects.all().delete()

        if Currency.objects.exists():
            return

        for data in self.fixtures.CURRENCIES:
            Currency.objects.create(
                code=data['code'],
                name=data['name'],
                symbol=data['symbol'],
                is_default=(data['code'] == default_currency_code),
                exchange_rate=data['exchange_rate'],
                decimal_places=data['decimal_places'],
                decimal_separator=data['decimal_separator'],
                thousand_separator=data['thousand_separator'],
                symbol_position=data['symbol_position'],
            )

        logger.info(
            f'  {Currency.objects.count()} devises créées (défaut: {default_currency_code})'
        )

    def create_account_types(self):
        """Crée les types de comptes depuis base.py."""
        if self.force and AccountType.objects.exists():
            AccountType.objects.all().delete()

        if AccountType.objects.exists():
            return

        for data in self.base.ACCOUNT_TYPES:
            AccountType.objects.create(**data)

        logger.info(f'  {AccountType.objects.count()} types de comptes créés')

    def create_accounts(self):
        """Crée le plan comptable depuis les fixtures du pack."""
        if self.force and Account.objects.exists():
            Account.objects.all().delete()

        if Account.objects.exists():
            return

        # Pré-charger les types de comptes
        types = {at.code: at for at in AccountType.objects.all()}

        # Index des comptes créés (code → instance)
        accounts = {}

        for data in self.fixtures.CHART_OF_ACCOUNTS:
            account_type = types.get(data['type'])
            if not account_type:
                logger.warning(
                    f'  Type inconnu {data["type"]} pour compte {data["code"]}'
                )
                continue

            parent = accounts.get(data.get('parent'))

            kwargs = {
                'code': data['code'],
                'name': data['name'],
                'type_id': account_type,
                'parent_id': parent,
            }

            # Attributs optionnels
            for attr in ('is_tax_account', 'tax_type', 'is_reconcilable', 'is_active'):
                if attr in data:
                    kwargs[attr] = data[attr]

            account = Account.objects.create(**kwargs)
            accounts[data['code']] = account

        logger.info(
            f'  {Account.objects.count()} comptes créés (pack {self.locale_pack})'
        )

    def create_journals(self):
        """Crée les journaux comptables depuis les fixtures du pack."""
        if self.force and Journal.objects.exists():
            Journal.objects.all().delete()

        if Journal.objects.exists():
            return

        for data in self.fixtures.JOURNALS:
            debit_account = None
            credit_account = None

            if data.get('debit_account'):
                try:
                    debit_account = Account.objects.get(code=data['debit_account'])
                except Account.DoesNotExist:
                    logger.warning(
                        f'  Compte débit {data["debit_account"]} non trouvé pour journal {data["code"]}'
                    )

            if data.get('credit_account'):
                try:
                    credit_account = Account.objects.get(code=data['credit_account'])
                except Account.DoesNotExist:
                    logger.warning(
                        f'  Compte crédit {data["credit_account"]} non trouvé pour journal {data["code"]}'
                    )

            Journal.objects.create(
                code=data['code'],
                name=data['name'],
                type=data['type'],
                default_debit_account_id=debit_account,
                default_credit_account_id=credit_account,
                sequence_id=data['sequence'],
            )

        logger.info(f'  {Journal.objects.count()} journaux créés')

    def create_fiscal_year(self):
        """Crée l'exercice fiscal courant."""
        if self.force and FiscalYear.objects.exists():
            FiscalYear.objects.all().delete()

        if FiscalYear.objects.exists():
            return

        current_year = timezone.now().year
        fiscal_year = FiscalYear.objects.create(
            name=f'Exercice {current_year}',
            start_date=date(current_year, 1, 1),
            end_date=date(current_year, 12, 31),
            state='open',
        )
        fiscal_year.create_periods()

        logger.info(f'  Exercice fiscal {current_year} créé avec périodes')

    def create_taxes(self):
        """Crée les taxes depuis les fixtures du pack."""
        if self.force and Tax.objects.exists():
            Tax.objects.all().delete()

        if Tax.objects.exists():
            return

        for data in self.fixtures.TAXES:
            account = None
            if data.get('account_code'):
                try:
                    account = Account.objects.get(code=data['account_code'])
                except Account.DoesNotExist:
                    logger.warning(
                        f'  Compte {data["account_code"]} non trouvé pour taxe {data["name"]}'
                    )

            Tax.objects.create(
                name=data['name'],
                description=data.get('description', ''),
                amount=data['amount'],
                type=data['type'],
                account_id=account,
                tax_category=data.get('tax_category', 'vat'),
                is_deductible=data.get('is_deductible', False),
            )

        logger.info(f'  {Tax.objects.count()} taxes créées')

    def create_analytic_accounts(self):
        """Crée les comptes analytiques depuis base.py."""
        if self.force and AnalyticAccount.objects.exists():
            AnalyticAccount.objects.all().delete()

        if AnalyticAccount.objects.exists():
            return

        accounts = {}
        for data in self.base.ANALYTIC_ACCOUNTS:
            parent = accounts.get(data['parent'])
            account = AnalyticAccount.objects.create(
                code=data['code'],
                name=data['name'],
                parent_id=parent,
            )
            accounts[data['code']] = account

        logger.info(f'  {AnalyticAccount.objects.count()} comptes analytiques créés')

    def create_account_mappings(self):
        """
        Charge les rôles comptables (AccountMapping) depuis le fichier fixture du pack.
        Appelé automatiquement par init_all() — couvre les deux paths :
        provisionnement headless (init_setup) et wizard web (SetupCreateView).
        """
        import json
        import os

        from django.conf import settings as django_settings

        fixture_path = os.path.join(
            django_settings.BASE_DIR,
            'accounting',
            'fixtures',
            f'mappings_{self.locale_pack}.json',
        )
        if not os.path.exists(fixture_path):
            logger.warning(
                f'Aucun fichier de mappings trouvé pour le pack {self.locale_pack}: {fixture_path}'
            )
            return

        with open(fixture_path, encoding='utf-8') as f:
            mappings = json.load(f)

        created = 0
        for item in mappings:
            account = Account.objects.filter(code=item['account_code']).first()
            if account:
                _, is_new = AccountMapping.objects.update_or_create(
                    role=item['role'],
                    defaults={
                        'account': account,
                        'description': item.get('description', ''),
                    },
                )
                if is_new:
                    created += 1

        logger.info(
            f'  {created} rôles AccountMapping créés pour le pack {self.locale_pack}'
        )
