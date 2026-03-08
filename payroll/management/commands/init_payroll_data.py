"""
Commande d'initialisation des données de paie.
Charge les fixtures génériques + les fixtures spécifiques au pays (payroll_fixture).
"""

import importlib

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from payroll.models import ContractType, PayrollParameter, SalaryComponent, TaxBracket


class Command(BaseCommand):
    help = 'Initialise les données de base pour le module Paie'

    def add_arguments(self, parser):
        parser.add_argument(
            '--locale',
            type=str,
            default=None,
            help='Code du pack de localisation (MA, OHADA, FR). Auto-détecté si non spécifié.',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Forcer la réinitialisation même si des données existent.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        locale_pack = options['locale'] or self._detect_locale()
        force = options['force']

        # Vérifier si des données existent déjà
        if not force and PayrollParameter.objects.exists():
            self.stdout.write(
                self.style.WARNING(
                    'Données de paie déjà initialisées. Utilisez --force pour réinitialiser.'
                )
            )
            return

        if force:
            self.stdout.write('[RESET] Réinitialisation forcée des données de paie...')
            PayrollParameter.objects.all().delete()
            SalaryComponent.objects.all().delete()
            ContractType.objects.all().delete()
            TaxBracket.objects.all().delete()

        self.stdout.write(
            f'[INIT] Initialisation des données de paie — Pack : {locale_pack}'
        )

        # 1. Charger les fixtures génériques
        generic = self._load_module('generic')
        self._create_contract_types(generic.CONTRACT_TYPES)
        self._create_salary_components(generic.SALARY_COMPONENTS)

        # 2. Charger les fixtures spécifiques au pack
        pack = self._load_module(locale_pack.lower())
        if hasattr(pack, 'CONTRACT_TYPES'):
            self._create_contract_types(pack.CONTRACT_TYPES)
        self._create_payroll_parameters(pack.PAYROLL_PARAMETERS)
        self._create_salary_components(pack.SALARY_COMPONENTS)
        self._create_tax_brackets(pack.TAX_BRACKETS)

        self.stdout.write(
            self.style.SUCCESS(
                f'[OK] Initialisation de la paie terminée — Pack {locale_pack}'
            )
        )

    def _detect_locale(self):
        """Détecte le locale_pack depuis CompanySetup."""
        try:
            from core.models import CompanySetup

            setup = CompanySetup.objects.first()
            if setup and setup.accounting_pack:
                # Rétrocompatibilité : retourner le payroll_fixture depuis COUNTRY_PACKS
                try:
                    from core.views import COUNTRY_PACKS

                    country = setup.country_code or setup.accounting_pack
                    info = COUNTRY_PACKS.get(country)
                    if info:
                        return info['payroll_fixture']
                except Exception:
                    pass
                # Alias historiques
                _legacy = {'OHADA': 'ci', 'MA': 'ma', 'FR': 'fr'}
                return _legacy.get(setup.accounting_pack, setup.accounting_pack.lower())
        except Exception:
            pass
        self.stdout.write(
            self.style.WARNING('[WARN] CompanySetup non trouvé — défaut : MA')
        )
        return 'MA'

    def _load_module(self, name):
        """Charge un module de fixtures payroll."""
        module_path = f'payroll.fixtures.locales.{name}'
        try:
            return importlib.import_module(module_path)
        except ImportError as e:
            raise ImportError(f'Module de fixtures non trouvé : {module_path}') from e

    def _create_contract_types(self, items):
        """Crée les types de contrat."""
        for item in items:
            obj, created = ContractType.objects.get_or_create(
                code=item['code'], defaults=item
            )
            status = '✨' if created else '⏭️ '
            self.stdout.write(
                f'  {status} Type de contrat : {item["code"]} — {item["name"]}'
            )

    def _create_payroll_parameters(self, items):
        """Crée les paramètres de paie."""
        today = timezone.now().date()
        for item in items:
            data = {**item, 'effective_date': today}
            obj, created = PayrollParameter.objects.get_or_create(
                code=data['code'], defaults=data
            )
            status = '✨' if created else '⏭️ '
            self.stdout.write(
                f'  {status} Paramètre : {item["code"]} = {item["value"]}'
            )

    def _create_salary_components(self, items):
        """Crée les composants de salaire."""
        for item in items:
            obj, created = SalaryComponent.objects.get_or_create(
                code=item['code'], defaults=item
            )
            status = '✨' if created else '⏭️ '
            self.stdout.write(f'  {status} Composant : {item["code"]} — {item["name"]}')

    def _create_tax_brackets(self, items):
        """Crée les tranches d'imposition."""
        today = timezone.now().date()
        for item in items:
            data = {**item, 'effective_date': today}
            obj, created = TaxBracket.objects.get_or_create(
                min_amount=data['min_amount'],
                max_amount=data['max_amount'],
                defaults=data,
            )
            status = '✨' if created else '⏭️ '
            max_display = item['max_amount'] or '∞'
            self.stdout.write(
                f'  {status} Tranche : {item["min_amount"]} → {max_display} @ {item["rate"]}%'
            )
