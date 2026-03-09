# payroll/migrations/0007_employee_classification.py
"""
PAIE-06 — Classification professionnelle.
Ajoute 6 champs optionnels sur EmployeePayroll :
professional_category, coefficient, echelon, indice, collective_agreement, monthly_hours.
"""

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('payroll', '0006_enrich_salary_component'),
    ]

    operations = [
        migrations.AddField(
            model_name='employeepayroll',
            name='professional_category',
            field=models.CharField(
                blank=True,
                help_text='Ex: P.18, C3, Cadre, Agent de maitrise',
                max_length=50,
                verbose_name='Categorie professionnelle',
            ),
        ),
        migrations.AddField(
            model_name='employeepayroll',
            name='coefficient',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=8,
                null=True,
                verbose_name='Coefficient',
            ),
        ),
        migrations.AddField(
            model_name='employeepayroll',
            name='echelon',
            field=models.CharField(
                blank=True,
                max_length=20,
                verbose_name='Echelon',
            ),
        ),
        migrations.AddField(
            model_name='employeepayroll',
            name='indice',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=8,
                null=True,
                verbose_name='Indice',
            ),
        ),
        migrations.AddField(
            model_name='employeepayroll',
            name='collective_agreement',
            field=models.CharField(
                blank=True,
                help_text='Ex: Convention Collective Interprofessionnelle de CI',
                max_length=200,
                verbose_name='Convention collective',
            ),
        ),
        migrations.AddField(
            model_name='employeepayroll',
            name='monthly_hours',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Ex: 173.33 pour 40h/semaine',
                max_digits=6,
                null=True,
                verbose_name='Horaire mensuel',
            ),
        ),
    ]
