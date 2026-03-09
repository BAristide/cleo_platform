"""
Payroll Fixtures : France (FR)
URSSAF, CSG/CRDS, PAS (Prélèvement à la Source).
Référence : URSSAF.fr, impots.gouv.fr, Code de la Sécurité Sociale.
"""

from decimal import Decimal

# ── Types de contrat spécifiques France ──────────────────────────────
CONTRACT_TYPES = [
    {
        'code': 'ALTERNANCE',
        'name': "Contrat d'alternance",
        'description': "Contrat d'apprentissage ou de professionnalisation",
        'requires_end_date': True,
    },
]


# ── Paramètres de paie ───────────────────────────────────────────────
PAYROLL_PARAMETERS = [
    {
        'code': 'CNSS_CEILING',
        'name': 'Plafond Sécurité Sociale (PMSS)',
        'value': Decimal('3864.00'),
        'description': 'Plafond mensuel de la Sécurité Sociale 2025 (EUR)',
    },
    {
        'code': 'CNSS_EMPLOYEE_RATE',
        'name': 'Taux cotisations salariales globales',
        'value': Decimal('22.00'),
        'description': 'Taux global approximatif des cotisations salariales (SS + retraite + chômage)',
    },
    {
        'code': 'CNSS_EMPLOYER_RATE',
        'name': 'Taux cotisations patronales globales',
        'value': Decimal('45.00'),
        'description': 'Taux global approximatif des cotisations patronales',
    },
    {
        'code': 'AMO_EMPLOYEE_RATE',
        'name': 'Taux CSG/CRDS',
        'value': Decimal('9.70'),
        'description': 'CSG 9.2% + CRDS 0.5% sur 98.25% du brut',
    },
    {
        'code': 'AMO_EMPLOYER_RATE',
        'name': 'Taux Assurance Maladie Employeur',
        'value': Decimal('13.00'),
        'description': 'Part patronale assurance maladie (incluse dans le taux global)',
    },
    {
        'code': 'SMIG',
        'name': 'SMIC',
        'value': Decimal('1766.92'),
        'description': 'Salaire minimum interprofessionnel de croissance mensuel brut (EUR)',
    },
    {
        'code': 'WORKING_DAYS_MONTH',
        'name': 'Jours ouvrés par mois',
        'value': Decimal('21.67'),
        'description': 'Nombre de jours ouvrés par mois (5j/sem × 52/12)',
    },
    {
        'code': 'WORKING_HOURS_MONTH',
        'name': 'Heures standard par mois',
        'value': Decimal('151.67'),
        'description': "Nombre d'heures standard par mois (35h/sem × 52/12)",
    },
    {
        'code': 'SENIORITY_2Y_RATE',
        'name': 'Ancienneté 2-5 ans',
        'value': Decimal('0.00'),
        'description': 'Non applicable — ancienneté FR régie par conventions collectives',
    },
    {
        'code': 'SENIORITY_5Y_RATE',
        'name': 'Ancienneté 5-12 ans',
        'value': Decimal('0.00'),
        'description': 'Non applicable — ancienneté FR régie par conventions collectives',
    },
    {
        'code': 'SENIORITY_12Y_RATE',
        'name': 'Ancienneté 12-20 ans',
        'value': Decimal('0.00'),
        'description': 'Non applicable — ancienneté FR régie par conventions collectives',
    },
    {
        'code': 'SENIORITY_20Y_RATE',
        'name': 'Ancienneté 20-25 ans',
        'value': Decimal('0.00'),
        'description': 'Non applicable — ancienneté FR régie par conventions collectives',
    },
    {
        'code': 'SENIORITY_25Y_RATE',
        'name': 'Ancienneté 25+ ans',
        'value': Decimal('0.00'),
        'description': 'Non applicable — ancienneté FR régie par conventions collectives',
    },
    {
        'code': 'SPOUSE_DEDUCTION',
        'name': 'Déduction PAS conjoint',
        'value': Decimal('0.00'),
        'description': 'Non applicable — PAS France utilise le quotient familial',
    },
    {
        'code': 'CHILD_DEDUCTION',
        'name': 'Déduction PAS enfant',
        'value': Decimal('0.00'),
        'description': 'Non applicable — PAS France utilise le quotient familial',
    },
    {
        'code': 'MAX_DEPENDENT_CHILDREN',
        'name': 'Maximum enfants à charge',
        'value': Decimal('0.00'),
        'description': 'Non applicable — PAS France utilise le quotient familial',
    },
]

# ── Composants de cotisation (mêmes codes internes) ─────────────────
SALARY_COMPONENTS = [
    {
        'code': 'CNSS_EMP',
        'name': 'Cotisations Sécurité Sociale',
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
        'name': 'CSG / CRDS',
        'component_type': 'cotisation',
        'is_taxable': False,
        'is_cnss_eligible': False,
        'formula': 'gross_salary * 0.9825 * (amo_employee_rate / 100)',
        'category': 'health_employee',
        'rate_parameter_code': 'AMO_EMPLOYEE_RATE',
        'base_rule': 'gross',
        'cap_parameter_code': '',
        'default_display_order': 51,
    },
    {
        'code': 'IR',
        'name': 'PAS (Prélèvement À la Source)',
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

# ── Barème PAS France (tranches mensuelles, taux neutre 2025) ───────
TAX_BRACKETS = [
    {
        'min_amount': Decimal('0.00'),
        'max_amount': Decimal('16820.00'),
        'rate': Decimal('0.00'),
        'deduction': Decimal('0.00'),
    },
    {
        'min_amount': Decimal('16821.00'),
        'max_amount': Decimal('17820.00'),
        'rate': Decimal('0.50'),
        'deduction': Decimal('84.10'),
    },
    {
        'min_amount': Decimal('17821.00'),
        'max_amount': Decimal('19440.00'),
        'rate': Decimal('1.30'),
        'deduction': Decimal('226.66'),
    },
    {
        'min_amount': Decimal('19441.00'),
        'max_amount': Decimal('21420.00'),
        'rate': Decimal('2.10'),
        'deduction': Decimal('382.18'),
    },
    {
        'min_amount': Decimal('21421.00'),
        'max_amount': Decimal('23340.00'),
        'rate': Decimal('2.90'),
        'deduction': Decimal('553.54'),
    },
    {
        'min_amount': Decimal('23341.00'),
        'max_amount': Decimal('25080.00'),
        'rate': Decimal('3.50'),
        'deduction': Decimal('693.58'),
    },
    {
        'min_amount': Decimal('25081.00'),
        'max_amount': Decimal('26820.00'),
        'rate': Decimal('4.10'),
        'deduction': Decimal('844.06'),
    },
    {
        'min_amount': Decimal('26821.00'),
        'max_amount': Decimal('29160.00'),
        'rate': Decimal('5.30'),
        'deduction': Decimal('1165.90'),
    },
    {
        'min_amount': Decimal('29161.00'),
        'max_amount': Decimal('32400.00'),
        'rate': Decimal('7.50'),
        'deduction': Decimal('1806.42'),
    },
    {
        'min_amount': Decimal('32401.00'),
        'max_amount': Decimal('38640.00'),
        'rate': Decimal('9.90'),
        'deduction': Decimal('2584.02'),
    },
    {
        'min_amount': Decimal('38641.00'),
        'max_amount': Decimal('48360.00'),
        'rate': Decimal('11.90'),
        'deduction': Decimal('3356.82'),
    },
    {
        'min_amount': Decimal('48361.00'),
        'max_amount': Decimal('57900.00'),
        'rate': Decimal('13.80'),
        'deduction': Decimal('4275.66'),
    },
    {
        'min_amount': Decimal('57901.00'),
        'max_amount': Decimal('74580.00'),
        'rate': Decimal('15.80'),
        'deduction': Decimal('5433.66'),
    },
    {
        'min_amount': Decimal('74581.00'),
        'max_amount': Decimal('99180.00'),
        'rate': Decimal('17.90'),
        'deduction': Decimal('6999.78'),
    },
    {
        'min_amount': Decimal('99181.00'),
        'max_amount': Decimal('148740.00'),
        'rate': Decimal('20.00'),
        'deduction': Decimal('9082.56'),
    },
    {
        'min_amount': Decimal('148741.00'),
        'max_amount': None,
        'rate': Decimal('43.00'),
        'deduction': Decimal('43273.56'),
    },
]
