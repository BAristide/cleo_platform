"""
Payroll Fixtures : Burkina Faso (BF)
CNSS, IUTS (barème progressif, abattement 25%).
Référence : CGI BF 2024, CNSS-BF, DGI Burkina Faso.
Note : l'abattement 25% sur le brut imposable sera implémenté en Phase 3.
"""

from decimal import Decimal

CONTRACT_TYPES = [
    {
        'code': 'STAGE',
        'name': 'Contrat de stage',
        'description': 'Convention de stage en entreprise',
        'requires_end_date': True,
    }
]

PAYROLL_PARAMETERS = [
    {
        'code': 'CNSS_CEILING',
        'name': 'Plafond caisse sociale',
        'value': Decimal('800000.00'),
        'description': 'Plafond CNSS mensuel BF (XOF) — rehaussé en 2022',
    },
    {
        'code': 'CNSS_EMPLOYEE_RATE',
        'name': 'Taux salarial caisse sociale',
        'value': Decimal('5.50'),
        'description': 'Taux salarial CNSS retraite (5.5%)',
    },
    {
        'code': 'CNSS_EMPLOYER_RATE',
        'name': 'Taux patronal caisse sociale',
        'value': Decimal('16.00'),
        'description': 'Taux patronal CNSS global (PF 7% + AT 3.5% + retraite 5.5%)',
    },
    {
        'code': 'AMO_EMPLOYEE_RATE',
        'name': 'Taux salarial santé',
        'value': Decimal('0.00'),
        'description': 'Pas de caisse santé dédiée obligatoire',
    },
    {
        'code': 'AMO_EMPLOYER_RATE',
        'name': 'Taux patronal santé',
        'value': Decimal('0.00'),
        'description': 'Pas de caisse santé dédiée obligatoire',
    },
    {
        'code': 'SMIG',
        'name': 'SMIG',
        'value': Decimal('34664.00'),
        'description': 'SMIG mensuel Burkina Faso (XOF)',
    },
    {
        'code': 'WORKING_DAYS_MONTH',
        'name': 'Jours ouvrés par mois',
        'value': Decimal('26.00'),
        'description': 'Nombre de jours ouvrés par mois',
    },
    {
        'code': 'WORKING_HOURS_MONTH',
        'name': 'Heures standard par mois',
        'value': Decimal('173.33'),
        'description': 'Nombre d heures standard par mois (40h/sem x 52/12)',
    },
    {
        'code': 'SENIORITY_2Y_RATE',
        'name': 'Ancienneté 2-5 ans',
        'value': Decimal('3.00'),
        'description': 'Taux prime ancienneté après 2 ans (%)',
    },
    {
        'code': 'SENIORITY_5Y_RATE',
        'name': 'Ancienneté 5-12 ans',
        'value': Decimal('5.00'),
        'description': 'Taux prime ancienneté après 5 ans (%)',
    },
    {
        'code': 'SENIORITY_12Y_RATE',
        'name': 'Ancienneté 12-20 ans',
        'value': Decimal('10.00'),
        'description': 'Taux prime ancienneté après 12 ans (%)',
    },
    {
        'code': 'SENIORITY_20Y_RATE',
        'name': 'Ancienneté 20-25 ans',
        'value': Decimal('15.00'),
        'description': 'Taux prime ancienneté après 20 ans (%)',
    },
    {
        'code': 'SENIORITY_25Y_RATE',
        'name': 'Ancienneté 25+ ans',
        'value': Decimal('15.00'),
        'description': 'Taux prime ancienneté après 25 ans (%)',
    },
    {
        'code': 'SPOUSE_DEDUCTION',
        'name': 'Déduction conjoint',
        'value': Decimal('0.00'),
        'description': 'Déduction annuelle pour conjoint (0 si quotient familial)',
    },
    {
        'code': 'CHILD_DEDUCTION',
        'name': 'Déduction enfant',
        'value': Decimal('0.00'),
        'description': 'Déduction annuelle par enfant (0 si quotient familial)',
    },
    {
        'code': 'MAX_DEPENDENT_CHILDREN',
        'name': 'Maximum enfants à charge',
        'value': Decimal('0.00'),
        'description': 'Max enfants pour déduction (0 si quotient familial)',
    },
    {
        'code': 'TAX_CALCULATION_METHOD',
        'name': 'Méthode de calcul fiscal',
        'value': Decimal('2'),
        'description': '0=progressif, 1=quotient familial, 2=abattement',
    },
    {
        'code': 'TAX_GROSS_ABATEMENT_RATE',
        'name': 'Taux abattement brut imposable',
        'value': Decimal('25.00'),
        'description': 'Abattement 25% sur le brut avant barème IUTS (CGI BF)',
    },
    {
        'code': 'TAX_FAMILY_REDUCTION_RATE',
        'name': 'Réduction charges famille - marié',
        'value': Decimal('8.00'),
        'description': 'Réduction IUTS pour contribuable marié (8%)',
    },
    {
        'code': 'TAX_FAMILY_CHILD_RATE',
        'name': 'Réduction charges famille - par enfant',
        'value': Decimal('2.00'),
        'description': 'Réduction IUTS par enfant à charge (2%)',
    },
    {
        'code': 'TAX_FAMILY_REDUCTION_CAP',
        'name': 'Plafond réduction familiale',
        'value': Decimal('20.00'),
        'description': 'Plafond de la réduction familiale en % (20% max = 7 personnes)',
    },
]

SALARY_COMPONENTS = [
    {
        'code': 'CNSS_EMP',
        'name': 'Cotisation CNSS',
        'component_type': 'cotisation',
        'is_taxable': False,
        'is_cnss_eligible': False,
        'formula': 'cnss_base * (cnss_employee_rate / 100)',
        'category': 'social_employee',
        'rate_parameter_code': 'CNSS_EMPLOYEE_RATE',
        'base_rule': 'capped',
        'cap_parameter_code': 'CNSS_CEILING',
        'default_display_order': 50,
    },
    {
        'code': 'AMO_EMP',
        'name': 'Cotisation complémentaire santé',
        'component_type': 'cotisation',
        'is_taxable': False,
        'is_cnss_eligible': False,
        'formula': 'gross_salary * (amo_employee_rate / 100)',
        'category': 'health_employee',
        'rate_parameter_code': 'AMO_EMPLOYEE_RATE',
        'base_rule': 'gross',
        'cap_parameter_code': '',
        'default_display_order': 51,
    },
    {
        'code': 'IR',
        'name': 'IUTS (Impôt Unique sur Traitements et Salaires)',
        'component_type': 'cotisation',
        'is_taxable': False,
        'is_cnss_eligible': False,
        'formula': 'calculate_income_tax()',
        'category': 'tax',
        'rate_parameter_code': '',
        'base_rule': 'fixed',
        'cap_parameter_code': '',
        'default_display_order': 60,
    },
]

TAX_BRACKETS = [
    {
        'min_amount': Decimal('0'),
        'max_amount': Decimal('360000'),
        'rate': Decimal('0'),
        'deduction': Decimal('0'),
    },
    {
        'min_amount': Decimal('360001'),
        'max_amount': Decimal('600000'),
        'rate': Decimal('2.00'),
        'deduction': Decimal('7200'),
    },
    {
        'min_amount': Decimal('600001'),
        'max_amount': Decimal('960000'),
        'rate': Decimal('5.50'),
        'deduction': Decimal('28200'),
    },
    {
        'min_amount': Decimal('960001'),
        'max_amount': Decimal('1440000'),
        'rate': Decimal('9.50'),
        'deduction': Decimal('66600'),
    },
    {
        'min_amount': Decimal('1440001'),
        'max_amount': Decimal('2040000'),
        'rate': Decimal('13.50'),
        'deduction': Decimal('124200'),
    },
    {
        'min_amount': Decimal('2040001'),
        'max_amount': Decimal('3000000'),
        'rate': Decimal('18.50'),
        'deduction': Decimal('226200'),
    },
    {
        'min_amount': Decimal('3000001'),
        'max_amount': Decimal('4800000'),
        'rate': Decimal('22.50'),
        'deduction': Decimal('346201'),
    },
    {
        'min_amount': Decimal('4800001'),
        'max_amount': None,
        'rate': Decimal('27.50'),
        'deduction': Decimal('586201'),
    },
]
