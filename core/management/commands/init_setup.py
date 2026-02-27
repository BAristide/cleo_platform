"""
Management command: init_setup
Remplace init_accounting comme point d'entrée dans entrypoint.sh.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from core.models import CompanySetup, Currency


class Command(BaseCommand):
    help = _('Initialiser Cleo ERP avec un Localization Pack')

    def add_arguments(self, parser):
        parser.add_argument(
            '--country',
            type=str,
            help=_('Code du pack (MA, OHADA, FR)'),
        )
        parser.add_argument(
            '--company-name',
            type=str,
            default='Mon Entreprise',
            help=_("Nom de l'entreprise"),
        )
        parser.add_argument(
            '--demo',
            action='store_true',
            help=_('Installer les données de démonstration'),
        )
        parser.add_argument(
            '--check-only',
            action='store_true',
            help=_("Vérifier l'état du setup sans charger de données"),
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help=_('Forcer la recréation'),
        )

    @transaction.atomic
    def handle(self, *args, **options):
        check_only = options['check_only']
        country = options.get('country')
        company_name = options['company_name']
        install_demo = options['demo']
        force = options['force']

        if check_only:
            setup = CompanySetup.objects.first()
            if setup and setup.setup_completed:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Setup déjà effectué : {setup.company_name} ({setup.locale_pack})'
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        'Setup non effectué — en attente de configuration via wizard'
                    )
                )
            return

        if not country:
            self.stdout.write(
                self.style.WARNING(
                    'Aucun pays spécifié. Utilisez --country MA|OHADA|FR ou --check-only'
                )
            )
            return

        existing = CompanySetup.objects.first()
        if existing and existing.setup_completed and not force:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Setup déjà effectué : {existing.company_name} ({existing.locale_pack}). '
                    'Utilisez --force pour recréer.'
                )
            )
            return

        from core.views import AVAILABLE_PACKS

        country = country.upper()
        if country not in AVAILABLE_PACKS:
            self.stderr.write(
                self.style.ERROR(
                    f'Pack inconnu : {country}. Disponibles : {list(AVAILABLE_PACKS.keys())}'
                )
            )
            return

        pack_info = AVAILABLE_PACKS[country]
        self.stdout.write(
            self.style.NOTICE(f'[SETUP] Chargement du pack {pack_info["name"]}...')
        )

        if force and existing:
            self._clean_all_data()
            self.stdout.write(
                self.style.WARNING('  Données existantes supprimées (--force)')
            )

        setup = CompanySetup(
            company_name=company_name,
            country_code=country if country != 'OHADA' else 'CI',
            locale_pack=country,
        )
        labels = pack_info['legal_id_labels']
        for i, label in enumerate(labels, start=1):
            setattr(setup, f'legal_id_{i}_label', label)
        setup.save()

        try:
            from accounting.services.init_accounting_service import (
                InitAccountingService,
            )

            init_service = InitAccountingService(locale_pack=country, force=False)
            init_service.init_all()
            self.stdout.write(self.style.SUCCESS('  [OK] Comptabilité initialisée'))

            try:
                import importlib

                payroll_module = importlib.import_module(
                    f'payroll.fixtures.locales.{country.lower()}'
                )
                if hasattr(payroll_module, 'load_payroll_data'):
                    payroll_module.load_payroll_data()
                    self.stdout.write(self.style.SUCCESS('  [OK] Paie initialisée'))
            except (ImportError, ModuleNotFoundError):
                try:
                    from django.core.management import call_command

                    call_command('init_payroll_data')
                    self.stdout.write(
                        self.style.SUCCESS('  [OK] Paie initialisée (legacy)')
                    )
                except Exception:
                    self.stdout.write(
                        self.style.WARNING('  [WARN]  Paie : non disponible')
                    )

            if install_demo:
                try:
                    import importlib

                    demo_module = importlib.import_module(
                        f'accounting.fixtures.demo.{country.lower()}'
                    )
                    if hasattr(demo_module, 'load_demo_data'):
                        demo_module.load_demo_data()
                        self.stdout.write(
                            self.style.SUCCESS('  [OK] Données de démo installées')
                        )
                except (ImportError, ModuleNotFoundError):
                    self.stdout.write(
                        self.style.WARNING(
                            '  [WARN]  Données de démo : non disponibles'
                        )
                    )

        except Exception as e:
            setup.delete()
            self.stderr.write(self.style.ERROR(f'[ERROR] Erreur : {e}'))
            raise

        setup.setup_completed = True
        setup.setup_date = timezone.now()
        setup.save()

        from django.core.management import call_command

        try:
            call_command('create_custom_permissions')
            self.stdout.write(self.style.SUCCESS('  [OK] Permissions créées'))
        except Exception:
            self.stdout.write(
                self.style.WARNING('  [WARN]  Permissions : non disponibles')
            )

        try:
            call_command('create_default_roles')
            self.stdout.write(self.style.SUCCESS('  [OK] Rôles créés'))
        except Exception:
            self.stdout.write(self.style.WARNING('  [WARN]  Rôles : non disponibles'))

        from accounting.models import Account, Journal, Tax

        self.stdout.write('')
        self.stdout.write(
            self.style.SUCCESS(f'[DONE] Cleo ERP configuré — Pack {pack_info["name"]}')
        )
        self.stdout.write(f'   Entreprise : {company_name}')
        self.stdout.write(f'   Comptes    : {Account.objects.count()}')
        self.stdout.write(f'   Taxes      : {Tax.objects.count()}')
        self.stdout.write(f'   Journaux   : {Journal.objects.count()}')
        self.stdout.write(f'   Devises    : {Currency.objects.count()}')

    def _clean_all_data(self):
        from accounting.models import (
            Account,
            AccountType,
            AnalyticAccount,
            FiscalPeriod,
            FiscalYear,
            Journal,
            JournalEntry,
            JournalEntryLine,
            Tax,
        )

        JournalEntryLine.objects.all().delete()
        JournalEntry.objects.all().delete()
        Journal.objects.all().delete()
        Tax.objects.all().delete()
        Account.objects.all().delete()
        AccountType.objects.all().delete()
        AnalyticAccount.objects.all().delete()
        FiscalPeriod.objects.all().delete()
        FiscalYear.objects.all().delete()
        Currency.objects.all().delete()
        CompanySetup.objects.all().delete()
