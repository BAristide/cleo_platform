"""IC-010 — Ajout des 10 paramètres de paie internationalisés."""

from decimal import Decimal

from django.db import migrations
from django.utils import timezone


NEW_PARAMETERS = [
    {
        'code': 'WORKING_DAYS_MONTH',
        'name': 'Jours ouvres par mois',
        'value': Decimal('26.00'),
        'description': 'Nombre de jours ouvres par mois',
    },
    {
        'code': 'WORKING_HOURS_MONTH',
        'name': 'Heures standard par mois',
        'value': Decimal('191.00'),
        'description': 'Nombre d heures standard par mois',
    },
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
    {
        'code': 'SPOUSE_DEDUCTION',
        'name': 'Deduction IR conjoint',
        'value': Decimal('360.00'),
        'description': 'Deduction annuelle IR pour conjoint',
    },
    {
        'code': 'CHILD_DEDUCTION',
        'name': 'Deduction IR enfant',
        'value': Decimal('360.00'),
        'description': 'Deduction annuelle IR par enfant a charge',
    },
    {
        'code': 'MAX_DEPENDENT_CHILDREN',
        'name': 'Maximum enfants a charge',
        'value': Decimal('6.00'),
        'description': 'Nombre maximum d enfants pour deduction IR',
    },
]


def add_parameters(apps, schema_editor):
    PayrollParameter = apps.get_model('payroll', 'PayrollParameter')
    today = timezone.now().date()
    created = 0

    for param in NEW_PARAMETERS:
        _, was_created = PayrollParameter.objects.get_or_create(
            code=param['code'],
            defaults={**param, 'effective_date': today, 'is_active': True},
        )
        if was_created:
            created += 1

    print(f'\n  IC-010 data migration: {created} parametres crees')


def remove_parameters(apps, schema_editor):
    PayrollParameter = apps.get_model('payroll', 'PayrollParameter')
    codes = [p['code'] for p in NEW_PARAMETERS]
    PayrollParameter.objects.filter(code__in=codes).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('payroll', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(add_parameters, remove_parameters),
    ]
