import django.db.models.deletion
from django.db import migrations, models


def rename_tables(apps, schema_editor):
    """Renomme les tables et met à jour les content_types."""
    schema_editor.execute('ALTER TABLE sales_product RENAME TO catalog_product;')
    schema_editor.execute(
        'ALTER TABLE inventory_productcategory RENAME TO catalog_productcategory;'
    )
    schema_editor.execute(
        "UPDATE django_content_type SET app_label='catalog' "
        "WHERE app_label='sales' AND model='product';"
    )
    schema_editor.execute(
        "UPDATE django_content_type SET app_label='catalog' "
        "WHERE app_label='inventory' AND model='productcategory';"
    )


def rollback_tables(apps, schema_editor):
    schema_editor.execute('ALTER TABLE catalog_product RENAME TO sales_product;')
    schema_editor.execute(
        'ALTER TABLE catalog_productcategory RENAME TO inventory_productcategory;'
    )
    schema_editor.execute(
        "UPDATE django_content_type SET app_label='sales' "
        "WHERE app_label='catalog' AND model='product';"
    )
    schema_editor.execute(
        "UPDATE django_content_type SET app_label='inventory' "
        "WHERE app_label='catalog' AND model='productcategory';"
    )


class Migration(migrations.Migration):
    initial = True
    dependencies = [
        ('sales', '0008_alter_invoiceitem_tax_rate_alter_orderitem_tax_rate_and_more'),
        ('inventory', '0001_initial'),
        ('core', '0006_delete_company'),
        ('contenttypes', '0002_remove_content_type_name'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name='ProductCategory',
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
                        ('name', models.CharField(max_length=200, verbose_name='Nom')),
                        (
                            'code',
                            models.CharField(
                                max_length=20, unique=True, verbose_name='Code'
                            ),
                        ),
                        (
                            'parent',
                            models.ForeignKey(
                                blank=True,
                                null=True,
                                on_delete=django.db.models.deletion.SET_NULL,
                                related_name='children',
                                to='catalog.productcategory',
                                verbose_name='Catégorie parente',
                            ),
                        ),
                        (
                            'accounting_account',
                            models.ForeignKey(
                                blank=True,
                                help_text='Compte comptable de stock associé (classe 3)',
                                null=True,
                                on_delete=django.db.models.deletion.SET_NULL,
                                to='accounting.account',
                                verbose_name='Compte comptable de stock',
                            ),
                        ),
                    ],
                    options={
                        'verbose_name': 'Catégorie de produit',
                        'verbose_name_plural': 'Catégories de produits',
                        'ordering': ['code'],
                    },
                ),
                migrations.CreateModel(
                    name='Product',
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
                        ('name', models.CharField(max_length=200, verbose_name='Nom')),
                        (
                            'reference',
                            models.CharField(
                                max_length=30, unique=True, verbose_name='Référence'
                            ),
                        ),
                        (
                            'description',
                            models.TextField(blank=True, verbose_name='Description'),
                        ),
                        (
                            'unit_price',
                            models.DecimalField(
                                decimal_places=2,
                                max_digits=15,
                                verbose_name='Prix unitaire',
                            ),
                        ),
                        (
                            'tax_rate',
                            models.DecimalField(
                                decimal_places=2,
                                default=0,
                                max_digits=5,
                                verbose_name='Taux de TVA (%)',
                            ),
                        ),
                        (
                            'is_active',
                            models.BooleanField(default=True, verbose_name='Actif'),
                        ),
                        (
                            'product_type',
                            models.CharField(
                                choices=[
                                    ('stockable', 'Stockable'),
                                    ('service', 'Service'),
                                    ('consumable', 'Consommable'),
                                ],
                                default='stockable',
                                max_length=20,
                                verbose_name='Type de produit',
                            ),
                        ),
                        (
                            'unit_of_measure',
                            models.CharField(
                                default='unité',
                                max_length=20,
                                verbose_name='Unité de mesure',
                            ),
                        ),
                        (
                            'stock_alert_threshold',
                            models.DecimalField(
                                decimal_places=3,
                                default=0,
                                help_text='Seuil minimum déclenchant une alerte de réapprovisionnement',
                                max_digits=15,
                                verbose_name='Seuil alerte stock',
                            ),
                        ),
                        (
                            'weight',
                            models.DecimalField(
                                blank=True,
                                decimal_places=3,
                                max_digits=10,
                                null=True,
                                verbose_name='Poids (kg)',
                            ),
                        ),
                        (
                            'barcode',
                            models.CharField(
                                blank=True,
                                max_length=50,
                                null=True,
                                unique=True,
                                verbose_name='Code-barres',
                            ),
                        ),
                        (
                            'category',
                            models.ForeignKey(
                                blank=True,
                                null=True,
                                on_delete=django.db.models.deletion.SET_NULL,
                                to='catalog.productcategory',
                                verbose_name='Catégorie',
                            ),
                        ),
                        (
                            'currency',
                            models.ForeignKey(
                                on_delete=django.db.models.deletion.PROTECT,
                                to='core.currency',
                                verbose_name='Devise',
                            ),
                        ),
                    ],
                    options={
                        'verbose_name': 'Produit',
                        'verbose_name_plural': 'Produits',
                    },
                ),
                migrations.AddConstraint(
                    model_name='product',
                    constraint=models.CheckConstraint(
                        check=models.Q(('tax_rate__gte', 0), ('tax_rate__lte', 100)),
                        name='sales_product_tax_rate_range',
                    ),
                ),
            ],
            database_operations=[
                migrations.RunSQL(
                    sql=[
                        'ALTER TABLE sales_product RENAME TO catalog_product;',
                        'ALTER TABLE inventory_productcategory RENAME TO catalog_productcategory;',
                        "UPDATE django_content_type SET app_label='catalog' WHERE app_label='sales' AND model='product';",
                        "UPDATE django_content_type SET app_label='catalog' WHERE app_label='inventory' AND model='productcategory';",
                    ],
                    reverse_sql=[
                        'ALTER TABLE catalog_product RENAME TO sales_product;',
                        'ALTER TABLE catalog_productcategory RENAME TO inventory_productcategory;',
                        "UPDATE django_content_type SET app_label='sales' WHERE app_label='catalog' AND model='product';",
                        "UPDATE django_content_type SET app_label='inventory' WHERE app_label='catalog' AND model='productcategory';",
                    ],
                ),
            ],
        ),
    ]
