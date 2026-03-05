from django.db import migrations

# Codes de contrats a duree determinee (independants du pack)
FIXED_TERM_CODES = {'CDD', 'STAGE', 'ANAPEC', 'ALTERNANCE'}


def set_requires_end_date(apps, schema_editor):
    ContractType = apps.get_model('payroll', 'ContractType')
    ContractType.objects.filter(code__in=FIXED_TERM_CODES).update(
        requires_end_date=True
    )
    ContractType.objects.exclude(code__in=FIXED_TERM_CODES).update(
        requires_end_date=False
    )


def reverse_set_requires_end_date(apps, schema_editor):
    ContractType = apps.get_model('payroll', 'ContractType')
    ContractType.objects.all().update(requires_end_date=False)


class Migration(migrations.Migration):
    dependencies = [
        ('payroll', '0003_employee_contract_fields'),
    ]

    operations = [
        migrations.RunPython(
            set_requires_end_date,
            reverse_code=reverse_set_requires_end_date,
        ),
    ]
