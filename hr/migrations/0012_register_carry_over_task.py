"""
Data migration : enregistrement de la tache periodique carry_over_annual_leave.
- hr.tasks.carry_over_annual_leave : le 1er janvier a 01h00 UTC

Idempotent : update_or_create sur le nom de la tache.
Resistant au reset -v : rejoue a chaque `migrate` sur base vierge.
"""

import json

from django.db import migrations


def register_carry_over_task(apps, schema_editor):
    CrontabSchedule = apps.get_model('django_celery_beat', 'CrontabSchedule')
    PeriodicTask = apps.get_model('django_celery_beat', 'PeriodicTask')

    # 1er janvier a 01h00 UTC
    annual_schedule, _ = CrontabSchedule.objects.get_or_create(
        minute='0',
        hour='1',
        day_of_week='*',
        day_of_month='1',
        month_of_year='1',
        defaults={'timezone': 'UTC'},
    )

    PeriodicTask.objects.update_or_create(
        name='Report annuel des conges (1er janvier)',
        defaults={
            'task': 'hr.tasks.carry_over_annual_leave',
            'crontab': annual_schedule,
            'enabled': True,
            'args': json.dumps([]),
            'kwargs': json.dumps({}),
            'description': (
                'Reporte les soldes de conges annuels non consommes au 1er janvier '
                'selon LEAVE_MAX_CARRY_DAYS du pack actif (pack-independant).'
            ),
        },
    )


def unregister_carry_over_task(apps, schema_editor):
    PeriodicTask = apps.get_model('django_celery_beat', 'PeriodicTask')
    PeriodicTask.objects.filter(name='Report annuel des conges (1er janvier)').delete()


class Migration(migrations.Migration):
    dependencies = [
        ('hr', '0011_add_publicholiday_model'),
        ('django_celery_beat', '__first__'),
    ]

    operations = [
        migrations.RunPython(
            register_carry_over_task,
            reverse_code=unregister_carry_over_task,
        ),
    ]
