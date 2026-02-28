from django.db import migrations, models
import django.db.models.deletion


def convert_currency_code_to_fk(apps, schema_editor):
    """Convertit les codes devise (CharField) en FK vers Currency."""
    Opportunity = apps.get_model('crm', 'Opportunity')
    Currency = apps.get_model('core', 'Currency')

    for opp in Opportunity.objects.all():
        if opp.currency_code:
            try:
                currency = Currency.objects.get(code=opp.currency_code)
                opp.currency_new = currency
                opp.save(update_fields=['currency_new'])
            except Currency.DoesNotExist:
                pass


class Migration(migrations.Migration):
    dependencies = [
        ('crm', '0002_alter_contact_source'),
        ('core', '0001_initial'),
    ]

    operations = [
        # 1. Renommer l'ancien champ
        migrations.RenameField(
            model_name='opportunity',
            old_name='currency',
            new_name='currency_code',
        ),
        # 2. Ajouter le nouveau champ FK
        migrations.AddField(
            model_name='opportunity',
            name='currency_new',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='crm_opportunities_new',
                to='core.currency',
                verbose_name='Devise',
            ),
        ),
        # 3. Migrer les données
        migrations.RunPython(convert_currency_code_to_fk, migrations.RunPython.noop),
        # 4. Supprimer l'ancien champ
        migrations.RemoveField(
            model_name='opportunity',
            name='currency_code',
        ),
        # 5. Renommer le nouveau champ
        migrations.RenameField(
            model_name='opportunity',
            old_name='currency_new',
            new_name='currency',
        ),
        # 6. Corriger le related_name
        migrations.AlterField(
            model_name='opportunity',
            name='currency',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='crm_opportunities',
                to='core.currency',
                verbose_name='Devise',
            ),
        ),
    ]
