"""
Payroll Fixtures : Maroc (MA)
CNSS, AMO, IR (6 tranches), SMIG, contrat ANAPEC.
Référence : Code du travail marocain, CNSS.ma, DGI.
"""

from decimal import Decimal

# ── Types de contrat spécifiques Maroc ───────────────────────────────
CONTRACT_TYPES = [
    {
        'code': 'ANAPEC',
        'name': 'Contrat ANAPEC',
        'description': "Contrat d'insertion professionnelle (exonéré CNSS 24 mois)",
    },
]

# ── Paramètres de paie ───────────────────────────────────────────────
PAYROLL_PARAMETERS = [
    {
        'code': 'CNSS_CEILING',
        'name': 'Plafond CNSS',
        'value': Decimal('6000.00'),
        'description': 'Plafond mensuel des cotisations CNSS',
    },
    {
        'code': 'CNSS_EMPLOYEE_RATE',
        'name': 'Taux CNSS Employé',
        'value': Decimal('4.29'),
        'description': 'Taux de cotisation salariale CNSS',
    },
    {
        'code': 'CNSS_EMPLOYER_RATE',
        'name': 'Taux CNSS Employeur',
        'value': Decimal('8.60'),
        'description': 'Taux de cotisation patronale CNSS',
    },
    {
        'code': 'AMO_EMPLOYEE_RATE',
        'name': 'Taux AMO Employé',
        'value': Decimal('2.00'),
        'description': 'Taux de cotisation salariale AMO',
    },
    {
        'code': 'AMO_EMPLOYER_RATE',
        'name': 'Taux AMO Employeur',
        'value': Decimal('2.00'),
        'description': 'Taux de cotisation patronale AMO',
    },
    {
        'code': 'SMIG',
        'name': 'SMIG',
        'value': Decimal('2828.71'),
        'description': 'Salaire minimum interprofessionnel garanti mensuel (MAD)',
    },
    {
        'code': 'WORKING_DAYS_MONTH',
        'name': 'Jours ouvrés par mois',
        'value': Decimal('26.00'),
        'description': 'Nombre de jours ouvrés par mois (Code du travail marocain)',
    },
    {
        'code': 'WORKING_HOURS_MONTH',
        'name': 'Heures standard par mois',
        'value': Decimal('191.00'),
        'description': "Nombre d'heures standard par mois (2288h/an ÷ 12)",
    },
    {
        'code': 'SENIORITY_2Y_RATE',
        'name': 'Ancienneté 2-5 ans',
        'value': Decimal('5.00'),
        'description': 'Taux prime ancienneté après 2 ans (%)',
    },
    {
        'code': 'SENIORITY_5Y_RATE',
        'name': 'Ancienneté 5-12 ans',
        'value': Decimal('10.00'),
        'description': 'Taux prime ancienneté après 5 ans (%)',
    },
    {
        'code': 'SENIORITY_12Y_RATE',
        'name': 'Ancienneté 12-20 ans',
        'value': Decimal('15.00'),
        'description': 'Taux prime ancienneté après 12 ans (%)',
    },
    {
        'code': 'SENIORITY_20Y_RATE',
        'name': 'Ancienneté 20-25 ans',
        'value': Decimal('20.00'),
        'description': 'Taux prime ancienneté après 20 ans (%)',
    },
    {
        'code': 'SENIORITY_25Y_RATE',
        'name': 'Ancienneté 25+ ans',
        'value': Decimal('25.00'),
        'description': 'Taux prime ancienneté après 25 ans (%)',
    },
    {
        'code': 'SPOUSE_DEDUCTION',
        'name': 'Déduction IR conjoint',
        'value': Decimal('360.00'),
        'description': 'Déduction annuelle IR pour conjoint (DH)',
    },
    {
        'code': 'CHILD_DEDUCTION',
        'name': 'Déduction IR enfant',
        'value': Decimal('360.00'),
        'description': 'Déduction annuelle IR par enfant à charge (DH)',
    },
    {
        'code': 'MAX_DEPENDENT_CHILDREN',
        'name': 'Maximum enfants à charge',
        'value': Decimal('6.00'),
        'description': "Nombre maximum d'enfants à charge pour déduction IR",
    },
]

# ── Composants de cotisation spécifiques Maroc ───────────────────────
SALARY_COMPONENTS = [
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
]

# ── Tranches d'imposition IR (barème annuel progressif) ──────────────
TAX_BRACKETS = [
    {
        'min_amount': Decimal('0.00'),
        'max_amount': Decimal('30000.00'),
        'rate': Decimal('0.00'),
        'deduction': Decimal('0.00'),
    },
    {
        'min_amount': Decimal('30001.00'),
        'max_amount': Decimal('50000.00'),
        'rate': Decimal('10.00'),
        'deduction': Decimal('3000.00'),
    },
    {
        'min_amount': Decimal('50001.00'),
        'max_amount': Decimal('60000.00'),
        'rate': Decimal('20.00'),
        'deduction': Decimal('8000.00'),
    },
    {
        'min_amount': Decimal('60001.00'),
        'max_amount': Decimal('80000.00'),
        'rate': Decimal('30.00'),
        'deduction': Decimal('14000.00'),
    },
    {
        'min_amount': Decimal('80001.00'),
        'max_amount': Decimal('180000.00'),
        'rate': Decimal('34.00'),
        'deduction': Decimal('17200.00'),
    },
    {
        'min_amount': Decimal('180001.00'),
        'max_amount': None,
        'rate': Decimal('38.00'),
        'deduction': Decimal('24400.00'),
    },
]
