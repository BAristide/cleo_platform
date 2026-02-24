from django.db import migrations, models


def fix_currency_separators(apps, schema_editor):
    """
    Corrige les séparateurs de milliers et décimaux pour les devises standard.

    Contexte :
    - Sur les installs existantes (VM dev), les séparateurs ont pu être modifiés
      manuellement à '.' comme workaround au bug de validation.
    - Sur les clean installs (VM test), les valeurs sont correctes (créées par
      init_accounting via ORM, sans passer par le serializer DRF).
    - Cette migration applique les valeurs de référence dans tous les cas.
    """
    Currency = apps.get_model('core', 'Currency')

    reference_values = {
        'MAD': {'thousand_separator': ',', 'decimal_separator': '.'},
        'EUR': {'thousand_separator': ' ', 'decimal_separator': ','},
        'USD': {'thousand_separator': ',', 'decimal_separator': '.'},
        'XOF': {'thousand_separator': ' ', 'decimal_separator': '.'},
    }

    for code, values in reference_values.items():
        Currency.objects.filter(code=code).update(**values)


def reverse_fix(apps, schema_editor):
    """Rollback — ne fait rien."""
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='currency',
            name='thousand_separator',
            field=models.CharField(
                blank=True,
                default=',',
                max_length=1,
                verbose_name='Séparateur de milliers',
            ),
        ),
        migrations.RunPython(fix_currency_separators, reverse_fix),
    ]
