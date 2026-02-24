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
