from django.core.management.base import BaseCommand
from django.utils.translation import gettext_lazy as _

from ...services.init_accounting_service import InitAccountingService

class Command(BaseCommand):
    help = _('Initialiser les données comptables (plan comptable, journaux, etc.)')

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help=_('Forcer la recréation des données, même si existantes')
        )
        parser.add_argument(
            '--accounts',
            action='store_true',
            help=_('Initialiser le plan comptable')
        )
        parser.add_argument(
            '--journals',
            action='store_true',
            help=_('Initialiser les journaux')
        )
        parser.add_argument(
            '--fiscal-year',
            action='store_true',
            help=_('Initialiser l\'exercice fiscal')
        )
        parser.add_argument(
            '--taxes',
            action='store_true',
            help=_('Initialiser les taxes')
        )
        parser.add_argument(
            '--analytic',
            action='store_true',
            help=_('Initialiser les comptes analytiques')
        )

    def handle(self, *args, **options):
        force = options['force']
        init_service = InitAccountingService(force=force)
        
        # Si aucune option spécifique n'est fournie, initialiser tout
        specific_options = ['accounts', 'journals', 'fiscal_year', 'taxes', 'analytic']
        if not any(options[opt] for opt in specific_options):
            self.stdout.write(self.style.NOTICE(_('Initialisation de toutes les données comptables...')))
            init_service.init_all()
            self.stdout.write(self.style.SUCCESS(_('Initialisation complète des données comptables.')))
            return
        
        # Initialiser seulement les données spécifiées
        if options['accounts']:
            self.stdout.write(self.style.NOTICE(_('Initialisation des types de comptes...')))
            init_service.create_account_types()
            self.stdout.write(self.style.NOTICE(_('Initialisation du plan comptable...')))
            init_service.create_accounts()
            self.stdout.write(self.style.SUCCESS(_('Plan comptable initialisé.')))
        
        if options['journals']:
            self.stdout.write(self.style.NOTICE(_('Initialisation des journaux...')))
            init_service.create_journals()
            self.stdout.write(self.style.SUCCESS(_('Journaux initialisés.')))
        
        if options['fiscal_year']:
            self.stdout.write(self.style.NOTICE(_('Initialisation de l\'exercice fiscal...')))
            init_service.create_fiscal_year()
            self.stdout.write(self.style.SUCCESS(_('Exercice fiscal initialisé.')))
        
        if options['taxes']:
            self.stdout.write(self.style.NOTICE(_('Initialisation des taxes...')))
            init_service.create_taxes()
            self.stdout.write(self.style.SUCCESS(_('Taxes initialisées.')))
        
        if options['analytic']:
            self.stdout.write(self.style.NOTICE(_('Initialisation des comptes analytiques...')))
            init_service.create_analytic_accounts()
            self.stdout.write(self.style.SUCCESS(_('Comptes analytiques initialisés.')))
        
        self.stdout.write(self.style.SUCCESS(_('Initialisation des données comptables terminée.')))
