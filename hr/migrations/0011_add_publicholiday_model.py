from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('hr', '0010_add_expense_models'),
    ]

    operations = [
        migrations.CreateModel(
            name='PublicHoliday',
            fields=[
                (
                    'id',
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name='ID',
                    ),
                ),
                ('name', models.CharField(max_length=100, verbose_name='Nom')),
                ('date', models.DateField(verbose_name='Date')),
                (
                    'is_recurring',
                    models.BooleanField(
                        default=True,
                        help_text='Si True, s applique chaque année à la même date (mois/jour).',
                        verbose_name='Récurrent annuellement',
                    ),
                ),
                (
                    'country_code',
                    models.CharField(
                        blank=True,
                        help_text='Code du pack de localisation. Vide = universel.',
                        max_length=10,
                        verbose_name='Code pack',
                    ),
                ),
            ],
            options={
                'verbose_name': 'Jour férié',
                'verbose_name_plural': 'Jours fériés',
                'ordering': ['date'],
            },
        ),
    ]
