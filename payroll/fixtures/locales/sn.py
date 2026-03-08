"""
Payroll Fixtures : Sénégal (SN)
IPRES (RG + RC), CSS, IR (quotient familial — Phase 3).
Référence : CGI Sénégal 2023, CSS.sn, DGID.
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
        'value': Decimal('432000.00'),
        'description': 'Plafond IPRES RG mensuel (XOF)',
    },
    {
        'code': 'CNSS_EMPLOYEE_RATE',
        'name': 'Taux salarial caisse sociale',
        'value': Decimal('5.60'),
        'description': 'Taux salarial IPRES RG retraite (5.6%)',
    },
    {
        'code': 'CNSS_EMPLOYER_RATE',
        'name': 'Taux patronal caisse sociale',
        'value': Decimal('8.40'),
        'description': 'Taux patronal IPRES RG (8.4%) + PF 7% + AT 1-5% = ~18-22%',
    },
    {
        'code': 'AMO_EMPLOYEE_RATE',
        'name': 'Taux salarial santé',
        'value': Decimal('0.00'),
        'description': 'IPM non obligatoire — 0% par défaut',
    },
    {
        'code': 'AMO_EMPLOYER_RATE',
        'name': 'Taux patronal santé',
        'value': Decimal('0.00'),
        'description': 'IPM non obligatoire — 0% par défaut',
    },
    {
        'code': 'SMIG',
        'name': 'SMIG',
        'value': Decimal('58900.00'),
        'description': 'SMIG mensuel Sénégal (XOF)',
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
    {
        'code': 'TAX_CALCULATION_METHOD',
        'name': 'Méthode de calcul fiscal',
        'value': Decimal('1'),
        'description': '0=progressif, 1=quotient familial, 2=abattement',
    },
    {
        'code': 'TAX_PARTS_SINGLE',
        'name': 'Parts fiscales - célibataire',
        'value': Decimal('1.0'),
        'description': 'Nombre de parts pour un célibataire sans enfant',
    },
    {
        'code': 'TAX_PARTS_MARRIED',
        'name': 'Parts fiscales - marié',
        'value': Decimal('2.0'),
        'description': 'Nombre de parts pour un couple marié',
    },
    {
        'code': 'TAX_PARTS_PER_CHILD',
        'name': 'Parts fiscales - par enfant',
        'value': Decimal('0.5'),
        'description': 'Nombre de parts supplémentaires par enfant à charge',
    },
    {
        'code': 'TAX_MAX_PARTS',
        'name': 'Maximum de parts fiscales',
        'value': Decimal('5.0'),
        'description': 'Nombre maximum de parts fiscales autorisé',
    },
    {
        'code': 'TAX_GROSS_ABATEMENT_RATE',
        'name': 'Taux abattement revenu brut',
        'value': Decimal('30.00'),
        'description': 'Abattement 30% frais professionnels (CGI SN art. 57)',
    },
    {
        'code': 'TAX_ABATEMENT_CAP',
        'name': 'Plafond abattement',
        'value': Decimal('900000.00'),
        'description': 'Plafond annuel abattement 30% (900 000 XOF)',
    },
    {
        'code': 'TAX_FAMILY_REDUCTION_RATE',
        'name': 'Taux réduction familiale',
        'value': Decimal('10.00'),
        'description': 'Taux réduction IR par demi-part supplémentaire (%)',
    },
    {
        'code': 'TAX_FAMILY_REDUCTION_CAP',
        'name': 'Plafond réduction familiale',
        'value': Decimal('0.00'),
        'description': 'Plafond global (0 = pas de plafond)',
    },
]

SALARY_COMPONENTS = [
    {
        'code': 'CNSS_EMP',
        'name': 'Cotisation IPRES',
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
        'name': 'IR (Impôt sur le Revenu)',
        'component_type': 'cotisation',
        'is_taxable': False,
        'is_cnss_eligible': False,
        'formula': 'calculate_income_tax()',
    },
]

TAX_BRACKETS = [
    {
        'min_amount': Decimal('0'),
        'max_amount': Decimal('630000'),
        'rate': Decimal('0'),
        'deduction': Decimal('0'),
    },
    {
        'min_amount': Decimal('630001'),
        'max_amount': Decimal('1500000'),
        'rate': Decimal('20.00'),
        'deduction': Decimal('126000'),
    },
    {
        'min_amount': Decimal('1500001'),
        'max_amount': Decimal('4000000'),
        'rate': Decimal('30.00'),
        'deduction': Decimal('276000'),
    },
    {
        'min_amount': Decimal('4000001'),
        'max_amount': Decimal('8000000'),
        'rate': Decimal('35.00'),
        'deduction': Decimal('476001'),
    },
    {
        'min_amount': Decimal('8000001'),
        'max_amount': Decimal('13500000'),
        'rate': Decimal('37.00'),
        'deduction': Decimal('636001'),
    },
    {
        'min_amount': Decimal('13500001'),
        'max_amount': Decimal('50000000'),
        'rate': Decimal('40.00'),
        'deduction': Decimal('1041002'),
    },
    {
        'min_amount': Decimal('50000001'),
        'max_amount': None,
        'rate': Decimal('43.00'),
        'deduction': Decimal('2541002'),
    },
]
