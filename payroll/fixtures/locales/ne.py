"""
Payroll Fixtures : Niger (NE)
CNSS, IUTS (barème progressif).
Référence : CGI Niger, CNSS Niger, DGI Niger.
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
        'description': 'Plafond CNSS mensuel Niger (XOF)',
    },
    {
        'code': 'CNSS_EMPLOYEE_RATE',
        'name': 'Taux salarial caisse sociale',
        'value': Decimal('5.25'),
        'description': 'Taux salarial CNSS retraite (5.25%)',
    },
    {
        'code': 'CNSS_EMPLOYER_RATE',
        'name': 'Taux patronal caisse sociale',
        'value': Decimal('16.50'),
        'description': 'Taux patronal CNSS global (PF 11% + AT 1.75% + retraite 5.25%)',
    },
    {
        'code': 'AMO_EMPLOYEE_RATE',
        'name': 'Taux salarial santé',
        'value': Decimal('0.00'),
        'description': 'Pas de cotisation santé dédiée obligatoire',
    },
    {
        'code': 'AMO_EMPLOYER_RATE',
        'name': 'Taux patronal santé',
        'value': Decimal('0.00'),
        'description': 'Pas de cotisation santé dédiée obligatoire',
    },
    {
        'code': 'SMIG',
        'name': 'SMIG',
        'value': Decimal('30047.00'),
        'description': 'SMIG mensuel Niger (XOF)',
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
        'max_amount': Decimal('300000'),
        'rate': Decimal('0'),
        'deduction': Decimal('0'),
    },
    {
        'min_amount': Decimal('300001'),
        'max_amount': Decimal('600000'),
        'rate': Decimal('2.00'),
        'deduction': Decimal('6000'),
    },
    {
        'min_amount': Decimal('600001'),
        'max_amount': Decimal('960000'),
        'rate': Decimal('7.00'),
        'deduction': Decimal('36000'),
    },
    {
        'min_amount': Decimal('960001'),
        'max_amount': Decimal('1560000'),
        'rate': Decimal('12.00'),
        'deduction': Decimal('84000'),
    },
    {
        'min_amount': Decimal('1560001'),
        'max_amount': Decimal('2400000'),
        'rate': Decimal('19.00'),
        'deduction': Decimal('193200'),
    },
    {
        'min_amount': Decimal('2400001'),
        'max_amount': Decimal('3600000'),
        'rate': Decimal('25.00'),
        'deduction': Decimal('337201'),
    },
    {
        'min_amount': Decimal('3600001'),
        'max_amount': None,
        'rate': Decimal('35.00'),
        'deduction': Decimal('697201'),
    },
]
