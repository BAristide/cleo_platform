from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('accounting', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='AccountMapping',
            fields=[
                (
                    'id',
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name='ID',
                    ),
                ),
                (
                    'role',
                    models.CharField(
                        choices=[
                            ('client_receivable', 'Créances clients'),
                            ('sales_revenue', 'Produits des ventes'),
                            ('vat_collected', 'TVA collectée sur ventes'),
                            ('supplier_payable', 'Dettes fournisseurs'),
                            ('purchase_expense', 'Charges des achats'),
                            ('vat_deductible', 'TVA déductible sur achats'),
                            ('bank', 'Banque'),
                            ('cash', 'Caisse'),
                            ('salary_expense', 'Charges de personnel — salaires bruts'),
                            ('social_charges_expense', 'Charges sociales patronales'),
                            ('salary_payable', 'Personnel — rémunérations dues'),
                            ('social_charges_payable', 'Organismes sociaux'),
                            ('inventory_asset', 'Stocks de marchandises'),
                            ('inventory_variation', 'Variation de stocks'),
                            (
                                'goods_received_not_invoiced',
                                'Marchandises reçues non facturées',
                            ),
                            ('fixed_asset', 'Immobilisations'),
                            ('depreciation_expense', 'Dotations aux amortissements'),
                            ('accumulated_depreciation', 'Amortissements cumulés'),
                        ],
                        max_length=50,
                        unique=True,
                        verbose_name='Rôle fonctionnel',
                    ),
                ),
                (
                    'account',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name='role_mappings',
                        to='accounting.account',
                        verbose_name='Compte comptable',
                    ),
                ),
                (
                    'description',
                    models.CharField(
                        blank=True,
                        help_text='Explication du rôle pour les administrateurs',
                        max_length=200,
                        verbose_name='Description',
                    ),
                ),
            ],
            options={
                'verbose_name': 'Mapping de compte',
                'verbose_name_plural': 'Mappings de comptes',
                'ordering': ['role'],
            },
        ),
    ]
