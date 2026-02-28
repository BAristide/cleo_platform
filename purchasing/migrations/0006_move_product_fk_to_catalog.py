import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('purchasing', '0005_alter_purchaseorderitem_tax_rate_and_more'),
        ('catalog', '0001_initial'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name='purchaseorderitem',
                    name='product',
                    field=models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to='catalog.product',
                        verbose_name='Produit',
                    ),
                ),
                migrations.AlterField(
                    model_name='receptionitem',
                    name='product',
                    field=models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to='catalog.product',
                        verbose_name='Produit',
                    ),
                ),
                migrations.AlterField(
                    model_name='supplierinvoiceitem',
                    name='product',
                    field=models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to='catalog.product',
                        verbose_name='Produit',
                    ),
                ),
            ],
            database_operations=[],
        ),
    ]
