"""
Migration : renomme locale_pack → accounting_pack dans CompanySetup.
Peuple country_code pour les installations existantes.
"""

from django.db import migrations, models


def populate_country_code(apps, schema_editor):
    CompanySetup = apps.get_model('core', 'CompanySetup')
    mapping = {'MA': 'MA', 'FR': 'FR', 'OHADA': 'CI'}
    for setup in CompanySetup.objects.all():
        if not setup.country_code or setup.country_code == setup.accounting_pack:
            setup.country_code = mapping.get(
                setup.accounting_pack, setup.accounting_pack
            )
            setup.save(update_fields=['country_code'])


def reverse_country_code(apps, schema_editor):
    pass  # Pas de retour arrière nécessaire pour country_code


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0006_delete_company'),
    ]

    operations = [
        migrations.RenameField(
            model_name='companysetup',
            old_name='locale_pack',
            new_name='accounting_pack',
        ),
        migrations.AlterField(
            model_name='companysetup',
            name='accounting_pack',
            field=models.CharField(
                help_text='Pack comptable (OHADA, MA, FR)',
                max_length=10,
                verbose_name='Pack comptable',
            ),
        ),
        migrations.AlterField(
            model_name='companysetup',
            name='country_code',
            field=models.CharField(
                help_text='Code ISO du pays — détermine la paie, les congés et les jours fériés',
                max_length=5,
                verbose_name='Code pays',
            ),
        ),
        migrations.RunPython(populate_country_code, reverse_country_code),
    ]
