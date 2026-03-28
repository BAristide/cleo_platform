from django.db import migrations


def forwards(apps, schema_editor):
    PeriodicTask = apps.get_model('django_celery_beat', 'PeriodicTask')
    CrontabSchedule = apps.get_model('django_celery_beat', 'CrontabSchedule')

    schedule, _ = CrontabSchedule.objects.update_or_create(
        minute='0',
        hour='9',
        day_of_week='1-5',
        defaults={'day_of_month': '*', 'month_of_year': '*'},
    )
    PeriodicTask.objects.update_or_create(
        name='Relance approbations en attente',
        defaults={
            'task': 'hr.tasks.remind_pending_approvals',
            'crontab': schedule,
            'enabled': True,
        },
    )


def backwards(apps, schema_editor):
    PeriodicTask = apps.get_model('django_celery_beat', 'PeriodicTask')
    PeriodicTask.objects.filter(name='Relance approbations en attente').delete()


class Migration(migrations.Migration):
    dependencies = [
        ('hr', '0013_add_expensereport_pdf_file'),
        ('django_celery_beat', '__latest__'),
    ]
    operations = [migrations.RunPython(forwards, backwards)]
