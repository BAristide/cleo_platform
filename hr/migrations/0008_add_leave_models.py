import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('hr', '0007_add_reward_models'),
    ]

    operations = [
        migrations.CreateModel(
            name='LeaveType',
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
                (
                    'code',
                    models.CharField(
                        help_text='Identifiant stable : ANNUAL, SICK, MATERNITY, PATERNITY, UNPAID, BEREAVEMENT.',
                        max_length=20,
                        unique=True,
                        verbose_name='Code',
                    ),
                ),
                (
                    'description',
                    models.TextField(blank=True, verbose_name='Description'),
                ),
                (
                    'is_paid',
                    models.BooleanField(
                        default=True,
                        help_text='Si False, les jours sont déduits du brut dans SalaryCalculator via MONTHLY_HOURS du pack.',
                        verbose_name='Congé payé',
                    ),
                ),
                (
                    'accrual_method',
                    models.CharField(
                        choices=[
                            ('monthly', 'Acquisition mensuelle automatique'),
                            ('annual', 'Crédit annuel unique au 1er janvier'),
                            (
                                'none',
                                'Sans acquisition — contingent fixe par paramètre',
                            ),
                        ],
                        default='monthly',
                        max_length=20,
                        verbose_name="Mode d'acquisition",
                    ),
                ),
                (
                    'max_days_carry',
                    models.PositiveSmallIntegerField(
                        default=0,
                        help_text='Surchargé par LEAVE_MAX_CARRY_DAYS du pack lors du report annuel.',
                        verbose_name='Report maximum (jours)',
                    ),
                ),
                (
                    'requires_document',
                    models.BooleanField(
                        default=False, verbose_name='Justificatif obligatoire'
                    ),
                ),
                ('is_active', models.BooleanField(default=True, verbose_name='Actif')),
                (
                    'color',
                    models.CharField(
                        default='#1890ff',
                        help_text='Affichée dans le calendrier équipe.',
                        max_length=7,
                        verbose_name='Couleur (hex)',
                    ),
                ),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Type de congé',
                'verbose_name_plural': 'Types de congés',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='LeaveAllocation',
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
                ('year', models.PositiveSmallIntegerField(verbose_name='Année')),
                (
                    'total_days',
                    models.DecimalField(
                        decimal_places=1,
                        default=0,
                        max_digits=6,
                        verbose_name='Jours alloués',
                    ),
                ),
                (
                    'used_days',
                    models.DecimalField(
                        decimal_places=1,
                        default=0,
                        max_digits=6,
                        verbose_name='Jours utilisés',
                    ),
                ),
                (
                    'pending_days',
                    models.DecimalField(
                        decimal_places=1,
                        default=0,
                        max_digits=6,
                        verbose_name='Jours en attente',
                    ),
                ),
                (
                    'carried_days',
                    models.DecimalField(
                        decimal_places=1,
                        default=0,
                        max_digits=6,
                        verbose_name='Jours reportés N-1',
                    ),
                ),
                (
                    'employee',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='leave_allocations',
                        to='hr.employee',
                    ),
                ),
                (
                    'leave_type',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name='allocations',
                        to='hr.leavetype',
                    ),
                ),
            ],
            options={
                'verbose_name': 'Solde de congés',
                'verbose_name_plural': 'Soldes de congés',
                'ordering': ['-year', 'employee__last_name'],
                'unique_together': {('employee', 'leave_type', 'year')},
            },
        ),
        migrations.CreateModel(
            name='LeaveRequest',
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
                ('start_date', models.DateField(verbose_name='Date de début')),
                ('end_date', models.DateField(verbose_name='Date de fin')),
                (
                    'nb_days',
                    models.DecimalField(
                        decimal_places=1,
                        max_digits=4,
                        help_text='Calculé automatiquement (hors weekends). Modifiable pour les demi-journées.',
                        verbose_name='Nombre de jours ouvrés',
                    ),
                ),
                ('reason', models.TextField(blank=True, verbose_name='Motif')),
                (
                    'document',
                    models.FileField(
                        blank=True,
                        null=True,
                        upload_to='hr/leave_documents/',
                        verbose_name='Justificatif',
                    ),
                ),
                (
                    'status',
                    models.CharField(
                        choices=[
                            ('draft', 'Brouillon'),
                            ('submitted', 'Soumise'),
                            ('approved_manager', 'Approuvée par N+1'),
                            ('approved_hr', 'Approuvée par RH'),
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
                    'approved_by_hr',
                    models.BooleanField(default=False, verbose_name='Approuvé par RH'),
                ),
                (
                    'manager_notes',
                    models.TextField(blank=True, verbose_name='Notes du manager'),
                ),
                ('hr_notes', models.TextField(blank=True, verbose_name='Notes RH')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                (
                    'employee',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='leave_requests',
                        to='hr.employee',
                    ),
                ),
                (
                    'leave_type',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name='requests',
                        to='hr.leavetype',
                    ),
                ),
                (
                    'allocation',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name='requests',
                        to='hr.leaveallocation',
                        help_text='Alimenté automatiquement à la soumission.',
                    ),
                ),
            ],
            options={
                'verbose_name': 'Demande de congé',
                'verbose_name_plural': 'Demandes de congés',
                'ordering': ['-start_date'],
            },
        ),
    ]
