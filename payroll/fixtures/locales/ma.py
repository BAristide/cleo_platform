"""
Payroll Fixtures : Maroc (MA)
CNSS, AMO, IR (6 tranches), SMIG, contrat ANAPEC.
Reference : Code du travail marocain, cnss.ma, cleiss.fr, DGI.

v3.27.0 — PAIE-08b + PAIE-11 :
- Taux CNSS/AMO mis a jour (source cleiss.fr 2024, cnss.ma 2025).
- IPE (Indemnite Perte d'Emploi) en composant separe.
- Prestations Familiales patronales (6,40%).
- Taxe Formation Professionnelle (1,60%).
- SMIG 2026 : 17,92 MAD/h x 191h = 3 422,72 MAD.
"""

from decimal import Decimal

# -- Types de contrat specifiques Maroc --
CONTRACT_TYPES = [
    {
        'code': 'ANAPEC',
        'name': 'Contrat ANAPEC',
        'description': "Contrat d'insertion professionnelle (exonere CNSS 24 mois)",
        'requires_end_date': True,
    },
]

# -- Parametres de paie --
PAYROLL_PARAMETERS = [
    # ── Plafond ──
    {
        'code': 'CNSS_CEILING',
        'name': 'Plafond CNSS',
        'value': Decimal('6000.00'),
        'description': 'Plafond mensuel cotisations CNSS court/long terme (MAD)',
    },
    # ── Taux salariaux (plafonnes a CNSS_CEILING) ──
    {
        'code': 'CNSS_EMPLOYEE_RATE',
        'name': 'Taux CNSS Employe (hors IPE)',
        'value': Decimal('4.29'),
        'description': 'Pension 3,96% + Maladie-maternite 0,33% — hors IPE 0,19%',
    },
    {
        'code': 'IPE_EMPLOYEE_RATE',
        'name': 'Taux IPE Employe',
        'value': Decimal('0.19'),
        'description': 'Indemnite pour Perte d Emploi salariale (0,19%, plafonne CNSS)',
    },
    # ── Taux patronaux (plafonnes a CNSS_CEILING) ──
    {
        'code': 'CNSS_EMPLOYER_RATE',
        'name': 'Taux CNSS Employeur (hors IPE)',
        'value': Decimal('8.60'),
        'description': 'Pension 7,93% + Maladie-maternite 0,67% — hors IPE 0,38%',
    },
    {
        'code': 'IPE_EMPLOYER_RATE',
        'name': 'Taux IPE Employeur',
        'value': Decimal('0.38'),
        'description': 'Indemnite pour Perte d Emploi patronale (0,38%, plafonne CNSS)',
    },
    # ── AMO (sans plafond) ──
    {
        'code': 'AMO_EMPLOYEE_RATE',
        'name': 'Taux AMO Employe',
        'value': Decimal('2.26'),
        'description': 'AMO Solidarite salariale (2,26% du brut, sans plafond)',
    },
    {
        'code': 'AMO_EMPLOYER_RATE',
        'name': 'Taux AMO Employeur',
        'value': Decimal('4.11'),
        'description': 'AMO base 2,26% + Solidarite 1,85% (sans plafond)',
    },
    # ── Charges patronales non plafonnees ──
    {
        'code': 'CNSS_PF_EMPLOYER_RATE',
        'name': 'Taux Prestations Familiales',
        'value': Decimal('6.40'),
        'description': 'Prestations familiales patronales (6,40% du brut, sans plafond)',
    },
    {
        'code': 'TFP_EMPLOYER_RATE',
        'name': 'Taux Taxe Formation Prof.',
        'value': Decimal('1.60'),
        'description': 'Taxe de Formation Professionnelle patronale (1,60% du brut, sans plafond)',
    },
    # ── Salaire minimum (janvier 2026) ──
    {
        'code': 'SMIG',
        'name': 'SMIG',
        'value': Decimal('3422.72'),
        'description': 'SMIG mensuel 2026 (17,92 MAD/h x 191h)',
    },
    # ── Horaires ──
    {
        'code': 'WORKING_DAYS_MONTH',
        'name': 'Jours ouvres par mois',
        'value': Decimal('26.00'),
        'description': 'Nombre de jours ouvres par mois (Code du travail marocain)',
    },
    {
        'code': 'WORKING_HOURS_MONTH',
        'name': 'Heures standard par mois',
        'value': Decimal('191.00'),
        'description': "Nombre d'heures standard par mois (2288h/an / 12)",
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
    # ── Deductions fiscales (bareme progressif + deductions familiales) ──
    {
        'code': 'SPOUSE_DEDUCTION',
        'name': 'Deduction IR conjoint',
        'value': Decimal('360.00'),
        'description': 'Deduction annuelle IR pour conjoint (MAD)',
    },
    {
        'code': 'CHILD_DEDUCTION',
        'name': 'Deduction IR enfant',
        'value': Decimal('360.00'),
        'description': 'Deduction annuelle IR par enfant a charge (MAD)',
    },
    {
        'code': 'MAX_DEPENDENT_CHILDREN',
        'name': 'Maximum enfants a charge',
        'value': Decimal('6.00'),
        'description': "Nombre maximum d'enfants a charge pour deduction IR",
    },
]

# -- Composants de cotisation specifiques Maroc --
SALARY_COMPONENTS = [
    # ── Salariales ──
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
        'code': 'IPE_EMP',
        'name': 'Indemnite Perte d Emploi',
        'component_type': 'cotisation',
        'is_taxable': False,
        'is_cnss_eligible': False,
        'formula': 'cnss_base * (ipe_employee_rate / 100)',
        'category': 'social_employee',
        'rate_parameter_code': 'IPE_EMPLOYEE_RATE',
        'base_rule': 'capped',
        'cap_parameter_code': 'CNSS_CEILING',
        'default_display_order': 52,
    },
    {
        'code': 'AMO_EMP',
        'name': 'Cotisation AMO',
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
        'name': 'Impot sur le revenu',
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
        'name': 'Cotisation CNSS (patronale)',
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
        'code': 'IPE_PAT',
        'name': 'IPE (patronale)',
        'component_type': 'cotisation',
        'is_taxable': False,
        'is_cnss_eligible': False,
        'formula': '',
        'category': 'social_employer',
        'rate_parameter_code': 'IPE_EMPLOYER_RATE',
        'base_rule': 'capped',
        'cap_parameter_code': 'CNSS_CEILING',
        'default_display_order': 82,
    },
    {
        'code': 'CNSS_PF_PAT',
        'name': 'Prestations Familiales',
        'component_type': 'cotisation',
        'is_taxable': False,
        'is_cnss_eligible': False,
        'formula': '',
        'category': 'social_employer',
        'rate_parameter_code': 'CNSS_PF_EMPLOYER_RATE',
        'base_rule': 'gross',
        'cap_parameter_code': '',
        'default_display_order': 83,
    },
    {
        'code': 'AMO_PAT',
        'name': 'AMO (patronale)',
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
        'code': 'TFP_PAT',
        'name': 'Taxe Formation Professionnelle',
        'component_type': 'cotisation',
        'is_taxable': False,
        'is_cnss_eligible': False,
        'formula': '',
        'category': 'other_employer',
        'rate_parameter_code': 'TFP_EMPLOYER_RATE',
        'base_rule': 'gross',
        'cap_parameter_code': '',
        'default_display_order': 85,
    },
]

# -- Tranches d'imposition IR (bareme annuel progressif) --
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
