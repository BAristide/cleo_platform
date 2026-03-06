from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('hr', '0009_register_celery_beat_tasks'),
        ('core', '0006_delete_company'),
    ]

    operations = [
        migrations.CreateModel(
            name='ExpenseCategory',
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
                (
                    'code',
                    models.CharField(max_length=20, unique=True, verbose_name='Code'),
                ),
                ('name', models.CharField(max_length=100, verbose_name='Nom')),
                (
                    'description',
                    models.TextField(blank=True, verbose_name='Description'),
                ),
                ('is_active', models.BooleanField(default=True, verbose_name='Active')),
                (
                    'created_at',
                    models.DateTimeField(auto_now_add=True, verbose_name='Créée le'),
                ),
            ],
            options={
                'verbose_name': 'Catégorie de frais',
                'verbose_name_plural': 'Catégories de frais',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='ExpenseReport',
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
                ('title', models.CharField(max_length=200, verbose_name='Titre')),
                (
                    'period_month',
                    models.CharField(
                        help_text='Format : YYYY-MM',
                        max_length=7,
                        verbose_name='Période (YYYY-MM)',
                    ),
                ),
                (
                    'description',
                    models.TextField(blank=True, verbose_name='Description'),
                ),
                (
                    'status',
                    models.CharField(
                        choices=[
                            ('draft', 'Brouillon'),
                            ('submitted', 'Soumise'),
                            ('approved_manager', 'Approuvée par N+1'),
                            ('approved_finance', 'Approuvée par Finance'),
                            ('reimbursed', 'Remboursée'),
                            ('rejected', 'Rejetée'),
                            ('cancelled', 'Annulée'),
                        ],
                        default='draft',
                        max_length=20,
                        verbose_name='Statut',
                    ),
                ),
                (
                    'approved_by_manager',
                    models.BooleanField(default=False, verbose_name='Approuvé par N+1'),
                ),
                (
                    'approved_by_finance',
                    models.BooleanField(
                        default=False, verbose_name='Approuvé par Finance'
                    ),
                ),
                (
                    'manager_notes',
                    models.TextField(blank=True, verbose_name='Notes du manager'),
                ),
                (
                    'finance_notes',
                    models.TextField(blank=True, verbose_name='Notes Finance'),
                ),
                (
                    'created_at',
                    models.DateTimeField(auto_now_add=True, verbose_name='Créée le'),
                ),
                (
                    'updated_at',
                    models.DateTimeField(auto_now=True, verbose_name='Modifiée le'),
                ),
                (
                    'employee',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='expense_reports',
                        to='hr.employee',
                        verbose_name='Employé',
                    ),
                ),
            ],
            options={
                'verbose_name': 'Note de frais',
                'verbose_name_plural': 'Notes de frais',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='ExpenseItem',
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
                ('date', models.DateField(verbose_name='Date')),
                (
                    'description',
                    models.CharField(max_length=200, verbose_name='Description'),
                ),
                (
                    'amount',
                    models.DecimalField(
                        decimal_places=2, max_digits=10, verbose_name='Montant'
                    ),
                ),
                (
                    'receipt',
                    models.FileField(
                        blank=True,
                        null=True,
                        upload_to='hr/expense_receipts/',
                        verbose_name='Justificatif',
                    ),
                ),
                (
                    'created_at',
                    models.DateTimeField(auto_now_add=True, verbose_name='Créé le'),
                ),
                (
                    'updated_at',
                    models.DateTimeField(auto_now=True, verbose_name='Modifié le'),
                ),
                (
                    'category',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name='items',
                        to='hr.expensecategory',
                        verbose_name='Catégorie',
                    ),
                ),
                (
                    'currency',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        to='core.currency',
                        verbose_name='Devise',
                    ),
                ),
                (
                    'expense_report',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='items',
                        to='hr.expensereport',
                        verbose_name='Note de frais',
                    ),
                ),
            ],
            options={
                'verbose_name': 'Ligne de frais',
                'verbose_name_plural': 'Lignes de frais',
                'ordering': ['date'],
            },
        ),
    ]
