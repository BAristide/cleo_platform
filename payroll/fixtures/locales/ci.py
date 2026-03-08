"""
Payroll Fixtures : Côte d'Ivoire (CI).
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
        'requires_end_date': True,
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
    {
        'code': 'WORKING_DAYS_MONTH',
        'name': 'Jours ouvrés par mois',
        'value': Decimal('26.00'),
        'description': 'Nombre de jours ouvrés par mois (Code du travail OHADA)',
    },
    {
        'code': 'WORKING_HOURS_MONTH',
        'name': 'Heures standard par mois',
        'value': Decimal('173.33'),
        'description': "Nombre d'heures standard par mois (40h/sem × 52/12)",
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
        'name': 'Déduction ITS conjoint',
        'value': Decimal('0.00'),
        'description': 'Déduction annuelle ITS pour conjoint (non applicable en CI)',
    },
    {
        'code': 'CHILD_DEDUCTION',
        'name': 'Déduction ITS enfant',
        'value': Decimal('0.00'),
        'description': 'Déduction annuelle ITS par enfant (non applicable en CI)',
    },
    {
        'code': 'MAX_DEPENDENT_CHILDREN',
        'name': 'Maximum enfants à charge',
        'value': Decimal('0.00'),
        'description': 'Non applicable — ITS CI utilise un quotient familial différent',
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
