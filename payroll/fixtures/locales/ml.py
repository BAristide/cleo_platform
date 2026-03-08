"""
Payroll Fixtures : Mali (ML)
INPS, AMO, ITS (barème progressif).
Référence : CGI Mali, INPS.ml, DGI Mali.
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
        'value': Decimal('1500000.00'),
        'description': 'Plafond INPS mensuel (XOF) — pas de plafond pour retraite',
    },
    {
        'code': 'CNSS_EMPLOYEE_RATE',
        'name': 'Taux salarial caisse sociale',
        'value': Decimal('3.60'),
        'description': 'Taux salarial INPS retraite (3.6%)',
    },
    {
        'code': 'CNSS_EMPLOYER_RATE',
        'name': 'Taux patronal caisse sociale',
        'value': Decimal('20.40'),
        'description': 'Taux patronal INPS global (PF 8% + AT ~4% + retraite 5.4% + logement 3%)',
    },
    {
        'code': 'AMO_EMPLOYEE_RATE',
        'name': 'Taux salarial santé',
        'value': Decimal('3.06'),
        'description': 'Taux salarial AMO Mali (3.06%)',
    },
    {
        'code': 'AMO_EMPLOYER_RATE',
        'name': 'Taux patronal santé',
        'value': Decimal('3.50'),
        'description': 'Taux patronal AMO Mali (3.50%)',
    },
    {
        'code': 'SMIG',
        'name': 'SMIG',
        'value': Decimal('40000.00'),
        'description': 'SMIG mensuel Mali (XOF)',
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
        'name': 'Cotisation INPS',
        'component_type': 'cotisation',
        'is_taxable': False,
        'is_cnss_eligible': False,
        'formula': 'cnss_base * (cnss_employee_rate / 100)',
    },
    {
        'code': 'AMO_EMP',
        'name': 'Cotisation complémentaire santé',
        'component_type': 'cotisation',
        'is_taxable': False,
        'is_cnss_eligible': False,
        'formula': 'gross_salary * (amo_employee_rate / 100)',
    },
    {
        'code': 'IR',
        'name': 'ITS (Impôt sur Traitements et Salaires)',
        'component_type': 'cotisation',
        'is_taxable': False,
        'is_cnss_eligible': False,
        'formula': 'calculate_income_tax()',
    },
]

TAX_BRACKETS = [
    {
        'min_amount': Decimal('0'),
        'max_amount': Decimal('330000'),
        'rate': Decimal('0'),
        'deduction': Decimal('0'),
    },
    {
        'min_amount': Decimal('330001'),
        'max_amount': Decimal('578400'),
        'rate': Decimal('5.00'),
        'deduction': Decimal('16500'),
    },
    {
        'min_amount': Decimal('578401'),
        'max_amount': Decimal('1176400'),
        'rate': Decimal('12.00'),
        'deduction': Decimal('56988'),
    },
    {
        'min_amount': Decimal('1176401'),
        'max_amount': Decimal('1764400'),
        'rate': Decimal('18.00'),
        'deduction': Decimal('127572'),
    },
    {
        'min_amount': Decimal('1764401'),
        'max_amount': Decimal('2940000'),
        'rate': Decimal('28.00'),
        'deduction': Decimal('304013'),
    },
    {
        'min_amount': Decimal('2940001'),
        'max_amount': Decimal('4800000'),
        'rate': Decimal('36.00'),
        'deduction': Decimal('539213'),
    },
    {
        'min_amount': Decimal('4800001'),
        'max_amount': None,
        'rate': Decimal('40.00'),
        'deduction': Decimal('731213'),
    },
]
