"""
Data migration : enregistrement des tâches périodiques Celery Beat.
- hr.tasks.check_contract_expirations : quotidien à 07h00 UTC
- hr.tasks.accrue_monthly_leave       : le 1er de chaque mois à 02h00 UTC

Idempotent : update_or_create sur le nom de la tâche.
Résistant au reset -v : rejoué à chaque `migrate` sur base vierge.
"""

import json

from django.db import migrations


def register_periodic_tasks(apps, schema_editor):
    CrontabSchedule = apps.get_model('django_celery_beat', 'CrontabSchedule')
    PeriodicTask = apps.get_model('django_celery_beat', 'PeriodicTask')

    # ── Schedule 1 : quotidien 07h00 UTC ────────────────────────────
    daily_schedule, _ = CrontabSchedule.objects.get_or_create(
        minute='0',
        hour='7',
        day_of_week='*',
        day_of_month='*',
        month_of_year='*',
        defaults={'timezone': 'UTC'},
    )

    PeriodicTask.objects.update_or_create(
        name='Vérification échéances contrats (quotidien)',
        defaults={
            'task': 'hr.tasks.check_contract_expirations',
            'crontab': daily_schedule,
            'enabled': True,
            'args': json.dumps([]),
            'kwargs': json.dumps({}),
            'description': 'Désactive les employés dont le contrat a expiré et envoie des alertes J-30 et J-7.',
        },
    )

    # ── Schedule 2 : 1er du mois à 02h00 UTC ────────────────────────
    monthly_schedule, _ = CrontabSchedule.objects.get_or_create(
        minute='0',
        hour='2',
        day_of_week='*',
        day_of_month='1',
        month_of_year='*',
        defaults={'timezone': 'UTC'},
    )

    PeriodicTask.objects.update_or_create(
        name='Acquisition mensuelle des congés',
        defaults={
            'task': 'hr.tasks.accrue_monthly_leave',
            'crontab': monthly_schedule,
            'enabled': True,
            'args': json.dumps([]),
            'kwargs': json.dumps({}),
            'description': 'Crédite les jours de congés acquis chaque mois selon ancienneté (pack-indépendant).',
        },
    )


def unregister_periodic_tasks(apps, schema_editor):
    PeriodicTask = apps.get_model('django_celery_beat', 'PeriodicTask')
    PeriodicTask.objects.filter(
        name__in=[
            'Vérification échéances contrats (quotidien)',
            'Acquisition mensuelle des congés',
        ]
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('hr', '0008_add_leave_models'),
        ('django_celery_beat', '__first__'),
    ]

    operations = [
        migrations.RunPython(
            register_periodic_tasks,
            reverse_code=unregister_periodic_tasks,
        ),
    ]
