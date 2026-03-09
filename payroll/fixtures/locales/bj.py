"""
Payroll Fixtures : Bénin (BJ)
CNSS, ITS (barème progressif).
Référence : CGI Bénin, CNSS Bénin, DGI Bénin.
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
        'value': Decimal('500000.00'),
        'description': 'Plafond CNSS mensuel Bénin (XOF)',
    },
    {
        'code': 'CNSS_EMPLOYEE_RATE',
        'name': 'Taux salarial caisse sociale',
        'value': Decimal('3.60'),
        'description': 'Taux salarial CNSS (3.6%)',
    },
    {
        'code': 'CNSS_EMPLOYER_RATE',
        'name': 'Taux patronal caisse sociale',
        'value': Decimal('15.40'),
        'description': 'Taux patronal CNSS global (PF 9% + AT ~1-4% + retraite 6.4%)',
    },
    {
        'code': 'AMO_EMPLOYEE_RATE',
        'name': 'Taux salarial santé',
        'value': Decimal('0.00'),
        'description': 'Pas de cotisation salariale santé obligatoire',
    },
    {
        'code': 'AMO_EMPLOYER_RATE',
        'name': 'Taux patronal santé',
        'value': Decimal('0.00'),
        'description': 'Pas de cotisation patronale santé obligatoire',
    },
    {
        'code': 'SMIG',
        'name': 'SMIG',
        'value': Decimal('52000.00'),
        'description': 'SMIG mensuel Bénin (XOF)',
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
        'name': 'ITS (Impôt sur Traitements et Salaires)',
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
        'max_amount': Decimal('60000'),
        'rate': Decimal('0'),
        'deduction': Decimal('0'),
    },
    {
        'min_amount': Decimal('60001'),
        'max_amount': Decimal('150000'),
        'rate': Decimal('10.00'),
        'deduction': Decimal('6000'),
    },
    {
        'min_amount': Decimal('150001'),
        'max_amount': Decimal('250000'),
        'rate': Decimal('15.00'),
        'deduction': Decimal('13500'),
    },
    {
        'min_amount': Decimal('250001'),
        'max_amount': Decimal('500000'),
        'rate': Decimal('19.00'),
        'deduction': Decimal('23500'),
    },
    {
        'min_amount': Decimal('500001'),
        'max_amount': Decimal('750000'),
        'rate': Decimal('24.00'),
        'deduction': Decimal('48501'),
    },
    {
        'min_amount': Decimal('750001'),
        'max_amount': Decimal('1000000'),
        'rate': Decimal('29.00'),
        'deduction': Decimal('86001'),
    },
    {
        'min_amount': Decimal('1000001'),
        'max_amount': None,
        'rate': Decimal('36.00'),
        'deduction': Decimal('156001'),
    },
]
