"""
Payroll Fixtures : OHADA — Côte d'Ivoire (CI) comme référence.
CNPS (Caisse Nationale de Prévoyance Sociale), ITS (Impôt sur Traitements et Salaires).
Référence : Code du travail CI, CNPS.ci, DGI Côte d'Ivoire.
"""

from decimal import Decimal

# ── Types de contrat spécifiques OHADA ───────────────────────────────
CONTRACT_TYPES = [
    {
        'code': 'STAGE',
        'name': 'Contrat de stage',
        'description': 'Convention de stage en entreprise',
    },
]

# ── Paramètres de paie ───────────────────────────────────────────────
PAYROLL_PARAMETERS = [
    {
        'code': 'CNSS_CEILING',
        'name': 'Plafond CNPS',
        'value': Decimal('70000.00'),
        'description': 'Plafond mensuel des cotisations CNPS (XOF)',
    },
    {
        'code': 'CNSS_EMPLOYEE_RATE',
        'name': 'Taux CNPS Employé',
        'value': Decimal('6.30'),
        'description': 'Taux de cotisation salariale CNPS (retraite 6.3%)',
    },
    {
        'code': 'CNSS_EMPLOYER_RATE',
        'name': 'Taux CNPS Employeur',
        'value': Decimal('15.75'),
        'description': 'Taux de cotisation patronale CNPS (PF 5.75% + AT 2-5% + retraite 7.7%)',
    },
    {
        'code': 'AMO_EMPLOYEE_RATE',
        'name': 'Taux CMU Employé',
        'value': Decimal('0.00'),
        'description': 'Couverture Maladie Universelle (financée par impôt, pas de cotisation salariale)',
    },
    {
        'code': 'AMO_EMPLOYER_RATE',
        'name': 'Taux CMU Employeur',
        'value': Decimal('0.00'),
        'description': 'Couverture Maladie Universelle (financée par impôt)',
    },
    {
        'code': 'SMIG',
        'name': 'SMIG',
        'value': Decimal('75000.00'),
        'description': 'Salaire minimum interprofessionnel garanti mensuel (XOF)',
    },
]

# ── Composants de cotisation (mêmes codes internes) ─────────────────
SALARY_COMPONENTS = [
    {
        'code': 'CNSS_EMP',
        'name': 'Cotisation CNPS',
        'component_type': 'cotisation',
        'is_taxable': False,
        'is_cnss_eligible': False,
        'formula': 'cnss_base * (cnss_employee_rate / 100)',
    },
    {
        'code': 'AMO_EMP',
        'name': 'Cotisation CMU',
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

# ── Tranches ITS Côte d'Ivoire (barème annuel progressif) ───────────
TAX_BRACKETS = [
    {
        'min_amount': Decimal('0.00'),
        'max_amount': Decimal('300000.00'),
        'rate': Decimal('0.00'),
        'deduction': Decimal('0.00'),
    },
    {
        'min_amount': Decimal('300001.00'),
        'max_amount': Decimal('526000.00'),
        'rate': Decimal('10.00'),
        'deduction': Decimal('30000.00'),
    },
    {
        'min_amount': Decimal('526001.00'),
        'max_amount': Decimal('1056000.00'),
        'rate': Decimal('15.00'),
        'deduction': Decimal('56300.00'),
    },
    {
        'min_amount': Decimal('1056001.00'),
        'max_amount': Decimal('1584000.00'),
        'rate': Decimal('20.00'),
        'deduction': Decimal('109100.00'),
    },
    {
        'min_amount': Decimal('1584001.00'),
        'max_amount': Decimal('2376000.00'),
        'rate': Decimal('25.00'),
        'deduction': Decimal('188300.00'),
    },
    {
        'min_amount': Decimal('2376001.00'),
        'max_amount': Decimal('3168000.00'),
        'rate': Decimal('35.00'),
        'deduction': Decimal('425900.00'),
    },
    {
        'min_amount': Decimal('3168001.00'),
        'max_amount': None,
        'rate': Decimal('40.00'),
        'deduction': Decimal('584300.00'),
    },
]
