from datetime import date

from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from ..models import (
    Account,
    AccountType,
    AnalyticAccount,
    FiscalYear,
    Journal,
    Tax,
)


class InitAccountingService:
    """Service d'initialisation des données comptables."""

    def __init__(self, force=False):
        """
        Initialise le service.

        Args:
            force (bool, optional): Forcer la recréation des données, même si existantes. Defaults to False.
        """
        self.force = force

    def init_all(self):
        """Initialise toutes les données comptables."""
        self.create_account_types()
        self.create_accounts()
        self.create_journals()
        self.create_fiscal_year()
        self.create_taxes()
        self.create_analytic_accounts()

    def create_account_types(self):
        """Crée les types de comptes comptables."""
        # Supprimer les types existants si force=True
        if self.force and AccountType.objects.exists():
            AccountType.objects.all().delete()

        if AccountType.objects.exists():
            return

        # Créer les types de comptes
        account_types = [
            {'code': 'ASSET', 'name': _('Actif'), 'is_debit': True, 'sequence': 1},
            {
                'code': 'LIABILITY',
                'name': _('Passif'),
                'is_debit': False,
                'sequence': 2,
            },
            {
                'code': 'EQUITY',
                'name': _('Capitaux propres'),
                'is_debit': False,
                'sequence': 3,
            },
            {'code': 'INCOME', 'name': _('Produits'), 'is_debit': False, 'sequence': 4},
            {'code': 'EXPENSE', 'name': _('Charges'), 'is_debit': True, 'sequence': 5},
            {'code': 'VIEW', 'name': _('Vue'), 'is_debit': True, 'sequence': 10},
        ]

        for data in account_types:
            AccountType.objects.create(**data)

    def create_accounts(self):
        """Crée le plan comptable marocain."""
        # Supprimer les comptes existants si force=True
        if self.force and Account.objects.exists():
            Account.objects.all().delete()

        if Account.objects.exists():
            return

        # Récupérer les types de comptes
        asset_type = AccountType.objects.get(code='ASSET')
        liability_type = AccountType.objects.get(code='LIABILITY')
        equity_type = AccountType.objects.get(code='EQUITY')
        income_type = AccountType.objects.get(code='INCOME')
        expense_type = AccountType.objects.get(code='EXPENSE')
        view_type = AccountType.objects.get(code='VIEW')

        # Créer les classes de comptes
        class1 = Account.objects.create(
            code='1', name='FINANCEMENT PERMANENT', type_id=view_type, parent_id=None
        )
        class2 = Account.objects.create(
            code='2', name='ACTIF IMMOBILISÉ', type_id=view_type, parent_id=None
        )
        class3 = Account.objects.create(
            code='3', name='ACTIF CIRCULANT', type_id=view_type, parent_id=None
        )
        class4 = Account.objects.create(
            code='4', name='PASSIF CIRCULANT', type_id=view_type, parent_id=None
        )
        class5 = Account.objects.create(
            code='5', name='TRÉSORERIE', type_id=view_type, parent_id=None
        )
        class6 = Account.objects.create(
            code='6', name='CHARGES', type_id=view_type, parent_id=None
        )
        class7 = Account.objects.create(
            code='7', name='PRODUITS', type_id=view_type, parent_id=None
        )

        # Créer les comptes de financement permanent (classe 1)
        c11 = Account.objects.create(
            code='11', name='CAPITAUX PROPRES', type_id=equity_type, parent_id=class1
        )
        Account.objects.create(
            code='111',
            name='Capital social ou personnel',
            type_id=equity_type,
            parent_id=c11,
        )
        Account.objects.create(
            code='112',
            name="Primes d'émission, de fusion et d'apport",
            type_id=equity_type,
            parent_id=c11,
        )
        Account.objects.create(
            code='113',
            name='Écarts de réévaluation',
            type_id=equity_type,
            parent_id=c11,
        )
        Account.objects.create(
            code='114', name='Réserve légale', type_id=equity_type, parent_id=c11
        )
        Account.objects.create(
            code='115', name='Autres réserves', type_id=equity_type, parent_id=c11
        )
        Account.objects.create(
            code='116', name='Report à nouveau', type_id=equity_type, parent_id=c11
        )
        Account.objects.create(
            code='119',
            name="Résultat net de l'exercice",
            type_id=equity_type,
            parent_id=c11,
        )

        c13 = Account.objects.create(
            code='13',
            name='CAPITAUX PROPRES ASSIMILÉS',
            type_id=equity_type,
            parent_id=class1,
        )
        Account.objects.create(
            code='131',
            name="Subventions d'investissement",
            type_id=equity_type,
            parent_id=c13,
        )
        Account.objects.create(
            code='135',
            name='Provisions réglementées',
            type_id=equity_type,
            parent_id=c13,
        )

        c14 = Account.objects.create(
            code='14',
            name='DETTES DE FINANCEMENT',
            type_id=liability_type,
            parent_id=class1,
        )
        Account.objects.create(
            code='141',
            name='Emprunts obligataires',
            type_id=liability_type,
            parent_id=c14,
        )
        Account.objects.create(
            code='148',
            name='Autres dettes de financement',
            type_id=liability_type,
            parent_id=c14,
        )

        c15 = Account.objects.create(
            code='15',
            name='PROVISIONS DURABLES POUR RISQUES ET CHARGES',
            type_id=liability_type,
            parent_id=class1,
        )
        Account.objects.create(
            code='151',
            name='Provisions pour risques',
            type_id=liability_type,
            parent_id=c15,
        )
        Account.objects.create(
            code='155',
            name='Provisions pour charges',
            type_id=liability_type,
            parent_id=c15,
        )

        # Créer les comptes d'actif immobilisé (classe 2)
        c21 = Account.objects.create(
            code='21',
            name='IMMOBILISATIONS EN NON-VALEURS',
            type_id=asset_type,
            parent_id=class2,
        )
        Account.objects.create(
            code='211', name='Frais préliminaires', type_id=asset_type, parent_id=c21
        )
        Account.objects.create(
            code='212',
            name='Charges à répartir sur plusieurs exercices',
            type_id=asset_type,
            parent_id=c21,
        )

        c22 = Account.objects.create(
            code='22',
            name='IMMOBILISATIONS INCORPORELLES',
            type_id=asset_type,
            parent_id=class2,
        )
        Account.objects.create(
            code='221',
            name='Immobilisation en recherche et développement',
            type_id=asset_type,
            parent_id=c22,
        )
        Account.objects.create(
            code='222',
            name='Brevets, marques, droits et valeurs similaires',
            type_id=asset_type,
            parent_id=c22,
        )
        Account.objects.create(
            code='223', name='Fonds commercial', type_id=asset_type, parent_id=c22
        )

        c23 = Account.objects.create(
            code='23',
            name='IMMOBILISATIONS CORPORELLES',
            type_id=asset_type,
            parent_id=class2,
        )
        Account.objects.create(
            code='231', name='Terrains', type_id=asset_type, parent_id=c23
        )
        Account.objects.create(
            code='232', name='Constructions', type_id=asset_type, parent_id=c23
        )
        Account.objects.create(
            code='233',
            name='Installations techniques, matériel et outillage',
            type_id=asset_type,
            parent_id=c23,
        )
        Account.objects.create(
            code='234', name='Matériel de transport', type_id=asset_type, parent_id=c23
        )
        Account.objects.create(
            code='235',
            name='Mobilier, matériel de bureau et aménagements divers',
            type_id=asset_type,
            parent_id=c23,
        )
        Account.objects.create(
            code='238',
            name='Autres immobilisations corporelles',
            type_id=asset_type,
            parent_id=c23,
        )
        Account.objects.create(
            code='239',
            name='Immobilisations corporelles en cours',
            type_id=asset_type,
            parent_id=c23,
        )

        c24 = Account.objects.create(
            code='24',
            name='IMMOBILISATIONS FINANCIÈRES',
            type_id=asset_type,
            parent_id=class2,
        )
        Account.objects.create(
            code='241', name='Prêts immobilisés', type_id=asset_type, parent_id=c24
        )
        Account.objects.create(
            code='248',
            name='Autres créances financières',
            type_id=asset_type,
            parent_id=c24,
        )
        Account.objects.create(
            code='251',
            name='Titres de participation',
            type_id=asset_type,
            parent_id=c24,
        )

        c28 = Account.objects.create(
            code='28',
            name='AMORTISSEMENTS DES IMMOBILISATIONS',
            type_id=asset_type,
            parent_id=class2,
            is_active=True,
        )
        Account.objects.create(
            code='281',
            name='Amortissements des immobilisations en non-valeurs',
            type_id=asset_type,
            parent_id=c28,
        )
        Account.objects.create(
            code='282',
            name='Amortissements des immobilisations incorporelles',
            type_id=asset_type,
            parent_id=c28,
        )
        Account.objects.create(
            code='283',
            name='Amortissements des immobilisations corporelles',
            type_id=asset_type,
            parent_id=c28,
        )

        # Créer les comptes d'actif circulant (classe 3)
        c31 = Account.objects.create(
            code='31', name='STOCKS', type_id=asset_type, parent_id=class3
        )
        Account.objects.create(
            code='311', name='Marchandises', type_id=asset_type, parent_id=c31
        )
        Account.objects.create(
            code='312',
            name='Matières et fournitures consommables',
            type_id=asset_type,
            parent_id=c31,
        )

        c34 = Account.objects.create(
            code='34',
            name="CRÉANCES DE L'ACTIF CIRCULANT",
            type_id=asset_type,
            parent_id=class3,
        )
        Account.objects.create(
            code='341',
            name='Fournisseurs débiteurs, avances et acomptes',
            type_id=asset_type,
            parent_id=c34,
        )
        Account.objects.create(
            code='342',
            name='Clients et comptes rattachés',
            type_id=asset_type,
            parent_id=c34,
        )
        Account.objects.create(
            code='343', name='Personnel débiteur', type_id=asset_type, parent_id=c34
        )
        Account.objects.create(
            code='345', name='État débiteur', type_id=asset_type, parent_id=c34
        )
        Account.objects.create(
            code='3455',
            name='État - TVA récupérable',
            type_id=asset_type,
            parent_id=c34,
            is_tax_account=True,
            tax_type='vat_deductible',
        )
        Account.objects.create(
            code='3456', name='État - Crédit de TVA', type_id=asset_type, parent_id=c34
        )
        Account.objects.create(
            code='348', name='Autres débiteurs', type_id=asset_type, parent_id=c34
        )
        Account.objects.create(
            code='349',
            name='Comptes de régularisation - actif',
            type_id=asset_type,
            parent_id=c34,
        )

        c35 = Account.objects.create(
            code='35',
            name='TITRES ET VALEURS DE PLACEMENT',
            type_id=asset_type,
            parent_id=class3,
        )
        Account.objects.create(
            code='350',
            name='Titres et valeurs de placement',
            type_id=asset_type,
            parent_id=c35,
        )

        # Créer les comptes de passif circulant (classe 4)
        c44 = Account.objects.create(
            code='44',
            name='DETTES DU PASSIF CIRCULANT',
            type_id=liability_type,
            parent_id=class4,
        )
        Account.objects.create(
            code='441',
            name='Fournisseurs et comptes rattachés',
            type_id=liability_type,
            parent_id=c44,
        )
        Account.objects.create(
            code='401',
            name='Fournisseurs',
            type_id=liability_type,
            parent_id=c44,
            is_reconcilable=True,
        )
        Account.objects.create(
            code='442',
            name='Clients créditeurs, avances et acomptes',
            type_id=liability_type,
            parent_id=c44,
        )
        Account.objects.create(
            code='411',
            name='Clients',
            type_id=asset_type,
            parent_id=c34,
            is_reconcilable=True,
        )
        Account.objects.create(
            code='443',
            name='Personnel créditeur',
            type_id=liability_type,
            parent_id=c44,
        )
        Account.objects.create(
            code='444', name='Organismes sociaux', type_id=liability_type, parent_id=c44
        )
        Account.objects.create(
            code='445', name='État créditeur', type_id=liability_type, parent_id=c44
        )
        Account.objects.create(
            code='4455',
            name='État - TVA facturée',
            type_id=liability_type,
            parent_id=c44,
            is_tax_account=True,
            tax_type='vat_collected',
        )
        Account.objects.create(
            code='4456', name='État - TVA due', type_id=liability_type, parent_id=c44
        )
        Account.objects.create(
            code='446',
            name="Comptes d'associés créditeurs",
            type_id=liability_type,
            parent_id=c44,
        )
        Account.objects.create(
            code='448', name='Autres créanciers', type_id=liability_type, parent_id=c44
        )
        Account.objects.create(
            code='449',
            name='Comptes de régularisation - passif',
            type_id=liability_type,
            parent_id=c44,
        )
        Account.objects.create(
            code='421', name='Salaires à payer', type_id=liability_type, parent_id=c44
        )
        Account.objects.create(
            code='431', name='Organismes sociaux', type_id=liability_type, parent_id=c44
        )

        # Créer les comptes de trésorerie (classe 5)
        c51 = Account.objects.create(
            code='51', name='TRÉSORERIE - ACTIF', type_id=asset_type, parent_id=class5
        )
        Account.objects.create(
            code='514',
            name='Banques',
            type_id=asset_type,
            parent_id=c51,
            is_reconcilable=True,
        )
        Account.objects.create(
            code='516',
            name='Caisse',
            type_id=asset_type,
            parent_id=c51,
            is_reconcilable=True,
        )

        c55 = Account.objects.create(
            code='55',
            name='TRÉSORERIE - PASSIF',
            type_id=liability_type,
            parent_id=class5,
        )
        Account.objects.create(
            code='552', name="Crédits d'escompte", type_id=liability_type, parent_id=c55
        )
        Account.objects.create(
            code='553',
            name='Crédits de trésorerie',
            type_id=liability_type,
            parent_id=c55,
        )

        # Créer les sous-comptes de la classe 6
        c61 = Account.objects.create(
            code='61',
            name="CHARGES D'EXPLOITATION",
            type_id=expense_type,
            parent_id=class6,
        )
        Account.objects.create(
            code='611',
            name='Achats revendus de marchandises',
            type_id=expense_type,
            parent_id=c61,
        )
        Account.objects.create(
            code='612',
            name='Achats consommés de matières et fournitures',
            type_id=expense_type,
            parent_id=c61,
        )
        c61a = Account.objects.create(
            code='613-614',
            name='AUTRES CHARGES EXTERNES',
            type_id=expense_type,
            parent_id=class6,
        )
        Account.objects.create(
            code='6131',
            name='Locations et charges locatives',
            type_id=expense_type,
            parent_id=c61a,
        )
        Account.objects.create(
            code='6133',
            name='Entretien et réparations',
            type_id=expense_type,
            parent_id=c61a,
        )
        Account.objects.create(
            code='6134',
            name="Primes d'assurances",
            type_id=expense_type,
            parent_id=c61a,
        )
        Account.objects.create(
            code='6141',
            name='Études, recherches et documentation',
            type_id=expense_type,
            parent_id=c61a,
        )
        Account.objects.create(
            code='6142', name='Transport', type_id=expense_type, parent_id=c61a
        )
        Account.objects.create(
            code='6143',
            name='Déplacements, missions et réceptions',
            type_id=expense_type,
            parent_id=c61a,
        )
        Account.objects.create(
            code='6144',
            name='Publicité, publications et relations publiques',
            type_id=expense_type,
            parent_id=c61a,
        )
        Account.objects.create(
            code='6145',
            name='Frais postaux et frais de télécommunications',
            type_id=expense_type,
            parent_id=c61a,
        )
        Account.objects.create(
            code='6147', name='Services bancaires', type_id=expense_type, parent_id=c61a
        )
        c616 = Account.objects.create(
            code='616', name='IMPÔTS ET TAXES', type_id=expense_type, parent_id=class6
        )
        Account.objects.create(
            code='6161',
            name='Impôts et taxes directs',
            type_id=expense_type,
            parent_id=c616,
        )
        Account.objects.create(
            code='6165',
            name='Impôts et taxes indirects',
            type_id=expense_type,
            parent_id=c616,
        )
        Account.objects.create(
            code='6167',
            name='Impôts, taxes et droits assimilés',
            type_id=expense_type,
            parent_id=c616,
        )
        c617 = Account.objects.create(
            code='617',
            name='CHARGES DE PERSONNEL',
            type_id=expense_type,
            parent_id=class6,
        )
        Account.objects.create(
            code='6171',
            name='Rémunérations du personnel',
            type_id=expense_type,
            parent_id=c617,
        )
        Account.objects.create(
            code='6174', name='Charges sociales', type_id=expense_type, parent_id=c617
        )
        Account.objects.create(
            code='6176',
            name='Charges sociales diverses',
            type_id=expense_type,
            parent_id=c617,
        )
        c618 = Account.objects.create(
            code='618',
            name="AUTRES CHARGES D'EXPLOITATION",
            type_id=expense_type,
            parent_id=class6,
        )
        Account.objects.create(
            code='6181', name='Jetons de présence', type_id=expense_type, parent_id=c618
        )
        Account.objects.create(
            code='6182',
            name='Pertes sur créances irrécouvrables',
            type_id=expense_type,
            parent_id=c618,
        )
        c619 = Account.objects.create(
            code='619',
            name="DOTATIONS D'EXPLOITATION",
            type_id=expense_type,
            parent_id=class6,
        )
        Account.objects.create(
            code='6191',
            name="D.E. aux amortissements de l'immobilisation en non-valeurs",
            type_id=expense_type,
            parent_id=c619,
        )
        Account.objects.create(
            code='6192',
            name='D.E. aux amortissements des immobilisations incorporelles',
            type_id=expense_type,
            parent_id=c619,
        )
        Account.objects.create(
            code='6193',
            name='D.E. aux amortissements des immobilisations corporelles',
            type_id=expense_type,
            parent_id=c619,
        )
        Account.objects.create(
            code='6194',
            name='D.E. aux provisions pour dépréciation des immobilisations',
            type_id=expense_type,
            parent_id=c619,
        )
        Account.objects.create(
            code='6195',
            name='D.E. aux provisions pour risques et charges',
            type_id=expense_type,
            parent_id=c619,
        )
        Account.objects.create(
            code='6196',
            name="D.E. aux provisions pour dépréciation de l'actif circulant",
            type_id=expense_type,
            parent_id=c619,
        )
        c63 = Account.objects.create(
            code='63',
            name='CHARGES FINANCIÈRES',
            type_id=expense_type,
            parent_id=class6,
        )
        Account.objects.create(
            code='631', name="Charges d'intérêts", type_id=expense_type, parent_id=c63
        )
        Account.objects.create(
            code='633', name='Pertes de change', type_id=expense_type, parent_id=c63
        )
        Account.objects.create(
            code='638',
            name='Autres charges financières',
            type_id=expense_type,
            parent_id=c63,
        )
        c65 = Account.objects.create(
            code='65',
            name='CHARGES NON COURANTES',
            type_id=expense_type,
            parent_id=class6,
        )
        Account.objects.create(
            code='651',
            name="Valeurs nettes d'amortissements des immobilisations cédées",
            type_id=expense_type,
            parent_id=c65,
        )
        Account.objects.create(
            code='656',
            name='Subventions accordées',
            type_id=expense_type,
            parent_id=c65,
        )
        Account.objects.create(
            code='658',
            name='Autres charges non courantes',
            type_id=expense_type,
            parent_id=c65,
        )
        Account.objects.create(
            code='67',
            name='IMPÔTS SUR LES RÉSULTATS',
            type_id=expense_type,
            parent_id=class6,
        )

        # Créer les sous-comptes de la classe 7
        c71 = Account.objects.create(
            code='71',
            name="PRODUITS D'EXPLOITATION",
            type_id=income_type,
            parent_id=class7,
        )
        Account.objects.create(
            code='711',
            name='Ventes de marchandises',
            type_id=income_type,
            parent_id=c71,
        )
        Account.objects.create(
            code='712',
            name='Ventes de biens et services produits',
            type_id=income_type,
            parent_id=c71,
        )
        Account.objects.create(
            code='7121',
            name='Ventes de biens produits au Maroc',
            type_id=income_type,
            parent_id=c71,
        )
        Account.objects.create(
            code='7122',
            name="Ventes de biens produits à l'étranger",
            type_id=income_type,
            parent_id=c71,
        )
        Account.objects.create(
            code='7124',
            name='Ventes de services produits au Maroc',
            type_id=income_type,
            parent_id=c71,
        )
        Account.objects.create(
            code='7125',
            name="Ventes de services produits à l'étranger",
            type_id=income_type,
            parent_id=c71,
        )
        Account.objects.create(
            code='713',
            name='Variation des stocks de produits',
            type_id=income_type,
            parent_id=c71,
        )
        Account.objects.create(
            code='714',
            name="Immobilisations produites par l'entreprise pour elle-même",
            type_id=income_type,
            parent_id=c71,
        )
        Account.objects.create(
            code='716',
            name="Subventions d'exploitation",
            type_id=income_type,
            parent_id=c71,
        )
        Account.objects.create(
            code='718',
            name="Autres produits d'exploitation",
            type_id=income_type,
            parent_id=c71,
        )
        Account.objects.create(
            code='719',
            name="Reprises d'exploitation; transferts de charges",
            type_id=income_type,
            parent_id=c71,
        )
        c73 = Account.objects.create(
            code='73', name='PRODUITS FINANCIERS', type_id=income_type, parent_id=class7
        )
        Account.objects.create(
            code='732',
            name='Produits des titres de participation et des autres titres immobilisés',
            type_id=income_type,
            parent_id=c73,
        )
        Account.objects.create(
            code='733', name='Gains de change', type_id=income_type, parent_id=c73
        )
        Account.objects.create(
            code='738',
            name='Intérêts et autres produits financiers',
            type_id=income_type,
            parent_id=c73,
        )
        Account.objects.create(
            code='739',
            name='Reprises financières; transferts de charges',
            type_id=income_type,
            parent_id=c73,
        )
        c75 = Account.objects.create(
            code='75',
            name='PRODUITS NON COURANTS',
            type_id=income_type,
            parent_id=class7,
        )
        Account.objects.create(
            code='751',
            name="Produits des cessions d'immobilisations",
            type_id=income_type,
            parent_id=c75,
        )
        Account.objects.create(
            code='756',
            name="Subventions d'équilibre",
            type_id=income_type,
            parent_id=c75,
        )
        Account.objects.create(
            code='757',
            name="Reprises sur subventions d'investissement",
            type_id=income_type,
            parent_id=c75,
        )
        Account.objects.create(
            code='758',
            name='Autres produits non courants',
            type_id=income_type,
            parent_id=c75,
        )
        Account.objects.create(
            code='759',
            name='Reprises non courantes; transferts de charges',
            type_id=income_type,
            parent_id=c75,
        )

    def create_journals(self):
        """Crée les journaux comptables de base."""
        # Supprimer les journaux existants si force=True
        if self.force and Journal.objects.exists():
            Journal.objects.all().delete()

        if Journal.objects.exists():
            return

        # Récupérer les comptes par défaut
        try:
            bank_account = Account.objects.get(code='514')
            cash_account = Account.objects.get(code='516')
            customer_account = Account.objects.get(code='411')
            supplier_account = Account.objects.get(code='401')
            sale_account = Account.objects.get(code='711')
            purchase_account = Account.objects.get(code='611')
        except Account.DoesNotExist:
            bank_account = None
            cash_account = None
            customer_account = None
            supplier_account = None
            sale_account = None
            purchase_account = None

        # Créer les journaux
        journals = [
            {
                'code': 'VEN',
                'name': 'Journal des ventes',
                'type': 'sale',
                'default_debit_account_id': customer_account,
                'default_credit_account_id': sale_account,
                'sequence_id': 'VEN/YYYY/####',
            },
            {
                'code': 'ACH',
                'name': 'Journal des achats',
                'type': 'purchase',
                'default_debit_account_id': purchase_account,
                'default_credit_account_id': supplier_account,
                'sequence_id': 'ACH/YYYY/####',
            },
            {
                'code': 'BNK',
                'name': 'Journal de banque',
                'type': 'bank',
                'default_debit_account_id': bank_account,
                'sequence_id': 'BNK/YYYY/####',
            },
            {
                'code': 'CSH',
                'name': 'Journal de caisse',
                'type': 'cash',
                'default_debit_account_id': cash_account,
                'sequence_id': 'CSH/YYYY/####',
            },
            {
                'code': 'OD',
                'name': 'Journal des opérations diverses',
                'type': 'general',
                'sequence_id': 'OD/YYYY/####',
            },
            {
                'code': 'SAL',
                'name': 'Journal des salaires',
                'type': 'general',
                'sequence_id': 'SAL/YYYY/####',
            },
        ]

        for data in journals:
            Journal.objects.create(**data)

    def create_fiscal_year(self):
        """Crée l'exercice fiscal courant."""
        # Supprimer les exercices existants si force=True
        if self.force and FiscalYear.objects.exists():
            FiscalYear.objects.all().delete()

        if FiscalYear.objects.exists():
            return

        # Créer l'exercice courant
        current_year = timezone.now().year
        fiscal_year = FiscalYear.objects.create(
            name=f'Exercice {current_year}',
            start_date=date(current_year, 1, 1),
            end_date=date(current_year, 12, 31),
            state='open',
        )

        # Créer les périodes fiscales (mois)
        fiscal_year.create_periods()

    def create_taxes(self):
        """Crée les taxes (TVA)."""
        # Supprimer les taxes existantes si force=True
        if self.force and Tax.objects.exists():
            Tax.objects.all().delete()

        if Tax.objects.exists():
            return

        # Récupérer les comptes de TVA
        try:
            vat_collected_account = Account.objects.get(code='4455')
            vat_deductible_account = Account.objects.get(code='3455')
        except Account.DoesNotExist:
            vat_collected_account = None
            vat_deductible_account = None

        # Créer les taxes
        taxes = [
            {
                'name': 'TVA 20%',
                'description': 'Taxe sur la Valeur Ajoutée au taux normal',
                'amount': 20.0,
                'type': 'percent',
                'account_id': vat_collected_account,
                'tax_category': 'vat',
                'is_deductible': False,
            },
            {
                'name': 'TVA 14%',
                'description': 'Taxe sur la Valeur Ajoutée au taux intermédiaire',
                'amount': 14.0,
                'type': 'percent',
                'account_id': vat_collected_account,
                'tax_category': 'vat',
                'is_deductible': False,
            },
            {
                'name': 'TVA 10%',
                'description': 'Taxe sur la Valeur Ajoutée au taux réduit',
                'amount': 10.0,
                'type': 'percent',
                'account_id': vat_collected_account,
                'tax_category': 'vat',
                'is_deductible': False,
            },
            {
                'name': 'TVA 7%',
                'description': 'Taxe sur la Valeur Ajoutée au taux super-réduit',
                'amount': 7.0,
                'type': 'percent',
                'account_id': vat_collected_account,
                'tax_category': 'vat',
                'is_deductible': False,
            },
            {
                'name': 'TVA 0%',
                'description': 'Taxe sur la Valeur Ajoutée à taux zéro (exportations)',
                'amount': 0.0,
                'type': 'percent',
                'account_id': vat_collected_account,
                'tax_category': 'vat',
                'is_deductible': False,
            },
            {
                'name': 'TVA déductible 20%',
                'description': 'TVA déductible au taux normal',
                'amount': 20.0,
                'type': 'percent',
                'account_id': vat_deductible_account,
                'tax_category': 'vat',
                'is_deductible': True,
            },
        ]

        for data in taxes:
            Tax.objects.create(**data)

    def create_analytic_accounts(self):
        """Crée les comptes analytiques de base."""
        # Supprimer les comptes analytiques existants si force=True
        if self.force and AnalyticAccount.objects.exists():
            AnalyticAccount.objects.all().delete()

        if AnalyticAccount.objects.exists():
            return

        # Créer les comptes analytiques
        admin = AnalyticAccount.objects.create(code='ADMIN', name='Administration')
        AnalyticAccount.objects.create(
            code='ADMIN-DIR', name='Direction générale', parent_id=admin
        )
        AnalyticAccount.objects.create(
            code='ADMIN-FIN', name='Finances', parent_id=admin
        )
        AnalyticAccount.objects.create(
            code='ADMIN-RH', name='Ressources humaines', parent_id=admin
        )

        com = AnalyticAccount.objects.create(code='COM', name='Commercial')
        AnalyticAccount.objects.create(code='COM-VENTE', name='Ventes', parent_id=com)
        AnalyticAccount.objects.create(code='COM-MKT', name='Marketing', parent_id=com)

        prod = AnalyticAccount.objects.create(code='PROD', name='Production')
        AnalyticAccount.objects.create(
            code='PROD-DEV', name='Développement', parent_id=prod
        )
        AnalyticAccount.objects.create(code='PROD-SUPP', name='Support', parent_id=prod)
