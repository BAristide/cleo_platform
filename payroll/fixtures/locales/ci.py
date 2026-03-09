"""
Payroll Fixtures : Cote d'Ivoire (CI).
CNPS (Caisse Nationale de Prevoyance Sociale), ITS (Impot sur Traitements et Salaires).
Reference : Code du travail CI, CNPS.ci, DGI Cote d'Ivoire, cleiss.fr.

v3.27.0 — PAIE-08a : enrichissement cotisations detaillees.
- Retraite salariale/patronale separee des PF et AT.
- Contribution Nationale (CN) 1,20% salariale.
- Taxe d'Apprentissage + Formation Prof. Continue patronales.
- Plafond retraite CNPS = 45 x SMIG = 3 375 000 XOF.
- Plafond PF/AT = 70 000 XOF.
"""

from decimal import Decimal

# -- Types de contrat specifiques OHADA --
CONTRACT_TYPES = [
    {
        'code': 'STAGE',
        'name': 'Contrat de stage',
        'description': 'Convention de stage en entreprise',
        'requires_end_date': True,
    },
]

# -- Parametres de paie --
PAYROLL_PARAMETERS = [
    # ── Plafonds ──
    {
        'code': 'CNSS_CEILING',
        'name': 'Plafond CNPS Retraite',
        'value': Decimal('3375000.00'),
        'description': 'Plafond mensuel cotisations retraite CNPS (45 x SMIG, XOF)',
    },
    {
        'code': 'CNPS_PF_CEILING',
        'name': 'Plafond CNPS PF/AT',
        'value': Decimal('70000.00'),
        'description': 'Plafond mensuel Prestations Familiales et Accident du Travail (XOF)',
    },
    # ── Taux salariaux ──
    {
        'code': 'CNSS_EMPLOYEE_RATE',
        'name': 'Taux CNPS Retraite Employe',
        'value': Decimal('6.30'),
        'description': 'Cotisation salariale retraite CNPS (6,30%)',
    },
    {
        'code': 'CN_EMPLOYEE_RATE',
        'name': 'Taux Contribution Nationale',
        'value': Decimal('1.20'),
        'description': 'Contribution Nationale salariale (1,20% du brut, sans plafond)',
    },
    {
        'code': 'AMO_EMPLOYEE_RATE',
        'name': 'Taux CMU Employe',
        'value': Decimal('0.00'),
        'description': 'CMU financee par impot — pas de cotisation salariale',
    },
    # ── Taux patronaux ──
    {
        'code': 'CNSS_EMPLOYER_RATE',
        'name': 'Taux CNPS Retraite Employeur',
        'value': Decimal('7.70'),
        'description': 'Cotisation patronale retraite CNPS (7,70%)',
    },
    {
        'code': 'CNPS_PF_EMPLOYER_RATE',
        'name': 'Taux Prestations Familiales',
        'value': Decimal('5.75'),
        'description': 'Prestations Familiales patronales (5,75%, plafond PF)',
    },
    {
        'code': 'CNPS_AT_EMPLOYER_RATE',
        'name': 'Taux Accident du Travail',
        'value': Decimal('2.00'),
        'description': 'Accident du Travail patronal (2% a 5%, defaut 2%, plafond PF)',
    },
    {
        'code': 'AMO_EMPLOYER_RATE',
        'name': 'Taux CMU Employeur',
        'value': Decimal('0.00'),
        'description': 'CMU financee par impot — pas de cotisation patronale',
    },
    {
        'code': 'TAXE_APPRENTISSAGE_EMPLOYER_RATE',
        'name': "Taux Taxe d'Apprentissage",
        'value': Decimal('0.40'),
        'description': "Taxe d'Apprentissage patronale (0,40% du brut, sans plafond)",
    },
    {
        'code': 'FPC_EMPLOYER_RATE',
        'name': 'Taux Formation Prof. Continue',
        'value': Decimal('0.60'),
        'description': 'Formation Professionnelle Continue patronale (0,60% du brut, sans plafond)',
    },
    # ── Salaire minimum ──
    {
        'code': 'SMIG',
        'name': 'SMIG',
        'value': Decimal('75000.00'),
        'description': 'Salaire minimum interprofessionnel garanti mensuel (XOF)',
    },
    # ── Horaires ──
    {
        'code': 'WORKING_DAYS_MONTH',
        'name': 'Jours ouvres par mois',
        'value': Decimal('26.00'),
        'description': 'Nombre de jours ouvres par mois (Code du travail OHADA)',
    },
    {
        'code': 'WORKING_HOURS_MONTH',
        'name': 'Heures standard par mois',
        'value': Decimal('173.33'),
        'description': "Nombre d'heures standard par mois (40h/sem x 52/12)",
    },
    # ── Anciennete ──
    {
        'code': 'SENIORITY_2Y_RATE',
        'name': 'Anciennete 2-5 ans',
        'value': Decimal('5.00'),
        'description': 'Taux prime anciennete apres 2 ans (%)',
    },
    {
        'code': 'SENIORITY_5Y_RATE',
        'name': 'Anciennete 5-12 ans',
        'value': Decimal('10.00'),
        'description': 'Taux prime anciennete apres 5 ans (%)',
    },
    {
        'code': 'SENIORITY_12Y_RATE',
        'name': 'Anciennete 12-20 ans',
        'value': Decimal('15.00'),
        'description': 'Taux prime anciennete apres 12 ans (%)',
    },
    {
        'code': 'SENIORITY_20Y_RATE',
        'name': 'Anciennete 20-25 ans',
        'value': Decimal('20.00'),
        'description': 'Taux prime anciennete apres 20 ans (%)',
    },
    {
        'code': 'SENIORITY_25Y_RATE',
        'name': 'Anciennete 25+ ans',
        'value': Decimal('25.00'),
        'description': 'Taux prime anciennete apres 25 ans (%)',
    },
    # ── Deductions fiscales (non applicable en CI — ITS progressif) ──
    {
        'code': 'SPOUSE_DEDUCTION',
        'name': 'Deduction ITS conjoint',
        'value': Decimal('0.00'),
        'description': 'Non applicable — ITS CI bareme progressif',
    },
    {
        'code': 'CHILD_DEDUCTION',
        'name': 'Deduction ITS enfant',
        'value': Decimal('0.00'),
        'description': 'Non applicable — ITS CI bareme progressif',
    },
    {
        'code': 'MAX_DEPENDENT_CHILDREN',
        'name': 'Maximum enfants a charge',
        'value': Decimal('0.00'),
        'description': 'Non applicable en CI',
    },
]

# -- Composants de cotisation --
SALARY_COMPONENTS = [
    # ── Salariales ──
    {
        'code': 'CNSS_EMP',
        'name': 'Cotisation CNPS Retraite',
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
        'code': 'CN_EMP',
        'name': 'Contribution Nationale',
        'component_type': 'cotisation',
        'is_taxable': False,
        'is_cnss_eligible': False,
        'formula': 'gross * (cn_rate / 100)',
        'category': 'social_employee',
        'rate_parameter_code': 'CN_EMPLOYEE_RATE',
        'base_rule': 'gross',
        'cap_parameter_code': '',
        'default_display_order': 52,
    },
    {
        'code': 'AMO_EMP',
        'name': 'Cotisation CMU',
        'component_type': 'cotisation',
        'is_taxable': False,
        'is_cnss_eligible': False,
        'formula': 'gross_salary * (amo_employee_rate / 100)',
        'category': 'health_employee',
        'rate_parameter_code': 'AMO_EMPLOYEE_RATE',
        'base_rule': 'gross',
        'cap_parameter_code': '',
        'default_display_order': 53,
    },
    {
        'code': 'IR',
        'name': 'ITS (Impot sur Traitements et Salaires)',
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
    # ── Patronales ──
    {
        'code': 'CNSS_PAT',
        'name': 'CNPS Retraite (patronale)',
        'component_type': 'cotisation',
        'is_taxable': False,
        'is_cnss_eligible': False,
        'formula': '',
        'category': 'social_employer',
        'rate_parameter_code': 'CNSS_EMPLOYER_RATE',
        'base_rule': 'capped',
        'cap_parameter_code': 'CNSS_CEILING',
        'default_display_order': 80,
    },
    {
        'code': 'CNPS_PF_PAT',
        'name': 'Prestations Familiales',
        'component_type': 'cotisation',
        'is_taxable': False,
        'is_cnss_eligible': False,
        'formula': '',
        'category': 'social_employer',
        'rate_parameter_code': 'CNPS_PF_EMPLOYER_RATE',
        'base_rule': 'capped',
        'cap_parameter_code': 'CNPS_PF_CEILING',
        'default_display_order': 82,
    },
    {
        'code': 'CNPS_AT_PAT',
        'name': 'Accident du Travail',
        'component_type': 'cotisation',
        'is_taxable': False,
        'is_cnss_eligible': False,
        'formula': '',
        'category': 'social_employer',
        'rate_parameter_code': 'CNPS_AT_EMPLOYER_RATE',
        'base_rule': 'capped',
        'cap_parameter_code': 'CNPS_PF_CEILING',
        'default_display_order': 83,
    },
    {
        'code': 'AMO_PAT',
        'name': 'CMU (patronale)',
        'component_type': 'cotisation',
        'is_taxable': False,
        'is_cnss_eligible': False,
        'formula': '',
        'category': 'health_employer',
        'rate_parameter_code': 'AMO_EMPLOYER_RATE',
        'base_rule': 'gross',
        'cap_parameter_code': '',
        'default_display_order': 84,
    },
    {
        'code': 'TAXE_APPRENT_PAT',
        'name': "Taxe d'Apprentissage",
        'component_type': 'cotisation',
        'is_taxable': False,
        'is_cnss_eligible': False,
        'formula': '',
        'category': 'other_employer',
        'rate_parameter_code': 'TAXE_APPRENTISSAGE_EMPLOYER_RATE',
        'base_rule': 'gross',
        'cap_parameter_code': '',
        'default_display_order': 85,
    },
    {
        'code': 'FPC_PAT',
        'name': 'Formation Prof. Continue',
        'component_type': 'cotisation',
        'is_taxable': False,
        'is_cnss_eligible': False,
        'formula': '',
        'category': 'other_employer',
        'rate_parameter_code': 'FPC_EMPLOYER_RATE',
        'base_rule': 'gross',
        'cap_parameter_code': '',
        'default_display_order': 86,
    },
]

# -- Tranches ITS Cote d'Ivoire (bareme annuel progressif) --
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
