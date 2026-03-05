"""
Payroll Fixtures : Composants universels (tous pays).
Salaire de base, heures supplémentaires, primes non soumises, acompte.
"""

# ── Types de contrat universels ──────────────────────────────────────
CONTRACT_TYPES = [
    {
        'code': 'CDI',
        'name': 'Contrat a Duree Indeterminee',
        'description': 'Contrat de travail sans limitation de duree',
        'requires_end_date': False,
    },
    {
        'code': 'CDD',
        'name': 'Contrat a Duree Determinee',
        'description': 'Contrat de travail a duree limitee',
        'requires_end_date': True,
    },
]
# ── Composants de salaire universels ─────────────────────────────────
SALARY_COMPONENTS = [
    {
        'code': 'SALBASE',
        'name': 'Salaire de base',
        'component_type': 'brut',
        'is_taxable': True,
        'is_cnss_eligible': True,
        'formula': '',
    },
    {
        'code': 'HS25',
        'name': 'Heures supplémentaires 25%',
        'component_type': 'brut',
        'is_taxable': True,
        'is_cnss_eligible': True,
        'formula': 'hourly_rate * overtime_25_hours * 1.25',
    },
    {
        'code': 'HS50',
        'name': 'Heures supplémentaires 50%',
        'component_type': 'brut',
        'is_taxable': True,
        'is_cnss_eligible': True,
        'formula': 'hourly_rate * overtime_50_hours * 1.50',
    },
    {
        'code': 'HS100',
        'name': 'Heures supplémentaires 100%',
        'component_type': 'brut',
        'is_taxable': True,
        'is_cnss_eligible': True,
        'formula': 'hourly_rate * overtime_100_hours * 2.00',
    },
    {
        'code': 'ANCIENNETE',
        'name': "Prime d'ancienneté",
        'component_type': 'brut',
        'is_taxable': True,
        'is_cnss_eligible': True,
        'formula': 'calculate_seniority_bonus()',
    },
    {
        'code': 'TRANSPORT',
        'name': 'Indemnité de transport',
        'component_type': 'non_soumise',
        'is_taxable': False,
        'is_cnss_eligible': False,
        'formula': '',
    },
    {
        'code': 'REPAS',
        'name': 'Prime de panier',
        'component_type': 'non_soumise',
        'is_taxable': False,
        'is_cnss_eligible': False,
        'formula': '',
    },
    {
        'code': 'ACOMPTE',
        'name': 'Acompte sur salaire',
        'component_type': 'cotisation',
        'is_taxable': False,
        'is_cnss_eligible': False,
        'formula': '',
    },
]
