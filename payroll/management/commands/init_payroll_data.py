# payroll/management/commands/init_payroll_data.py
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from payroll.models import ContractType, PayrollParameter, SalaryComponent, TaxBracket


class Command(BaseCommand):
    help = 'Initialise les données de base pour le module Paie'

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write('Initialisation des données de paie...')

        # Créer les paramètres de paie
        parameters = [
            {
                'code': 'CNSS_CEILING',
                'name': 'Plafond CNSS',
                'value': Decimal('6000.00'),
                'effective_date': timezone.now().date(),
                'description': 'Plafond mensuel des cotisations CNSS',
            },
            {
                'code': 'CNSS_EMPLOYEE_RATE',
                'name': 'Taux CNSS Employé',
                'value': Decimal('4.29'),
                'effective_date': timezone.now().date(),
                'description': 'Taux de cotisation salariale CNSS',
            },
            {
                'code': 'CNSS_EMPLOYER_RATE',
                'name': 'Taux CNSS Employeur',
                'value': Decimal('8.60'),
                'effective_date': timezone.now().date(),
                'description': 'Taux de cotisation patronale CNSS',
            },
            {
                'code': 'AMO_EMPLOYEE_RATE',
                'name': 'Taux AMO Employé',
                'value': Decimal('2.00'),
                'effective_date': timezone.now().date(),
                'description': 'Taux de cotisation salariale AMO',
            },
            {
                'code': 'AMO_EMPLOYER_RATE',
                'name': 'Taux AMO Employeur',
                'value': Decimal('2.00'),
                'effective_date': timezone.now().date(),
                'description': 'Taux de cotisation patronale AMO',
            },
            {
                'code': 'SMIG',
                'name': 'SMIG',
                'value': Decimal('2828.71'),
                'effective_date': timezone.now().date(),
                'description': 'Salaire minimum interprofessionnel garanti mensuel',
            },
        ]

        for param in parameters:
            PayrollParameter.objects.get_or_create(code=param['code'], defaults=param)
            self.stdout.write(f'  - Paramètre {param["code"]} créé')

        # Créer les types de contrat
        contract_types = [
            {
                'code': 'CDI',
                'name': 'Contrat à Durée Indéterminée',
                'description': 'Contrat de travail sans limitation de durée',
            },
            {
                'code': 'CDD',
                'name': 'Contrat à Durée Déterminée',
                'description': 'Contrat de travail à durée limitée',
            },
            {
                'code': 'ANAPEC',
                'name': 'Contrat ANAPEC',
                'description': 'Contrat de travail par insertion',
            },
        ]

        for ct in contract_types:
            ContractType.objects.get_or_create(code=ct['code'], defaults=ct)
            self.stdout.write(f'  - Type de contrat {ct["code"]} créé')

        # Créer les composants de salaire
        components = [
            {
                'code': 'SALBASE',
                'name': 'Salaire de base',
                'component_type': 'brut',
                'is_taxable': True,
                'is_cnss_eligible': True,
                'formula': '',
            },
            {
                'code': 'HS25',
                'name': 'Heures supplémentaires 25%',
                'component_type': 'brut',
                'is_taxable': True,
                'is_cnss_eligible': True,
                'formula': 'hourly_rate * overtime_25_hours * 1.25',
            },
            {
                'code': 'HS50',
                'name': 'Heures supplémentaires 50%',
                'component_type': 'brut',
                'is_taxable': True,
                'is_cnss_eligible': True,
                'formula': 'hourly_rate * overtime_50_hours * 1.50',
            },
            {
                'code': 'HS100',
                'name': 'Heures supplémentaires 100%',
                'component_type': 'brut',
                'is_taxable': True,
                'is_cnss_eligible': True,
                'formula': 'hourly_rate * overtime_100_hours * 2.00',
            },
            {
                'code': 'ANCIENNETE',
                'name': "Prime d'ancienneté",
                'component_type': 'brut',
                'is_taxable': True,
                'is_cnss_eligible': True,
                'formula': 'calculate_seniority_bonus()',
            },
            {
                'code': 'TRANSPORT',
                'name': 'Indemnité de transport',
                'component_type': 'non_soumise',
                'is_taxable': False,
                'is_cnss_eligible': False,
                'formula': '',
            },
            {
                'code': 'REPAS',
                'name': 'Prime de panier',
                'component_type': 'non_soumise',
                'is_taxable': False,
                'is_cnss_eligible': False,
                'formula': '',
            },
            {
                'code': 'CNSS_EMP',
                'name': 'Cotisation CNSS',
                'component_type': 'cotisation',
                'is_taxable': False,
                'is_cnss_eligible': False,
                'formula': 'cnss_base * (cnss_employee_rate / 100)',
            },
            {
                'code': 'AMO_EMP',
                'name': 'Cotisation AMO',
                'component_type': 'cotisation',
                'is_taxable': False,
                'is_cnss_eligible': False,
                'formula': 'gross_salary * (amo_employee_rate / 100)',
            },
            {
                'code': 'IR',
                'name': 'Impôt sur le revenu',
                'component_type': 'cotisation',
                'is_taxable': False,
                'is_cnss_eligible': False,
                'formula': 'calculate_income_tax()',
            },
            {
                'code': 'ACOMPTE',
                'name': 'Acompte sur salaire',
                'component_type': 'cotisation',
                'is_taxable': False,
                'is_cnss_eligible': False,
                'formula': '',
            },
        ]

        for comp in components:
            SalaryComponent.objects.get_or_create(code=comp['code'], defaults=comp)
            self.stdout.write(f'  - Composant {comp["code"]} créé')

        # Créer les tranches d'imposition IR
        tax_brackets = [
            {
                'min_amount': Decimal('0.00'),
                'max_amount': Decimal('30000.00'),
                'rate': Decimal('0.00'),
                'deduction': Decimal('0.00'),
                'effective_date': timezone.now().date(),
            },
            {
                'min_amount': Decimal('30001.00'),
                'max_amount': Decimal('50000.00'),
                'rate': Decimal('10.00'),
                'deduction': Decimal('3000.00'),
                'effective_date': timezone.now().date(),
            },
            {
                'min_amount': Decimal('50001.00'),
                'max_amount': Decimal('60000.00'),
                'rate': Decimal('20.00'),
                'deduction': Decimal('8000.00'),
                'effective_date': timezone.now().date(),
            },
            {
                'min_amount': Decimal('60001.00'),
                'max_amount': Decimal('80000.00'),
                'rate': Decimal('30.00'),
                'deduction': Decimal('14000.00'),
                'effective_date': timezone.now().date(),
            },
            {
                'min_amount': Decimal('80001.00'),
                'max_amount': Decimal('180000.00'),
                'rate': Decimal('34.00'),
                'deduction': Decimal('17200.00'),
                'effective_date': timezone.now().date(),
            },
            {
                'min_amount': Decimal('180001.00'),
                'max_amount': None,
                'rate': Decimal('38.00'),
                'deduction': Decimal('24400.00'),
                'effective_date': timezone.now().date(),
            },
        ]

        for bracket in tax_brackets:
            TaxBracket.objects.get_or_create(
                min_amount=bracket['min_amount'],
                max_amount=bracket['max_amount'],
                defaults=bracket,
            )
            if bracket['max_amount']:
                self.stdout.write(
                    f"  - Tranche d'imposition {bracket['min_amount']} à {bracket['max_amount']} créée"
                )
            else:
                self.stdout.write(
                    f"  - Tranche d'imposition supérieure à {bracket['min_amount']} créée"
                )

        self.stdout.write(
            self.style.SUCCESS('Initialisation des données de paie terminée!')
        )
