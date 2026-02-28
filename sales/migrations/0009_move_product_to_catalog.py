import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('sales', '0008_alter_invoiceitem_tax_rate_alter_orderitem_tax_rate_and_more'),
        ('catalog', '0001_initial'),
        ('inventory', '0002_move_productcategory_to_catalog'),
        ('purchasing', '0006_move_product_fk_to_catalog'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                # D'abord rediriger les FK vers catalog.Product
                migrations.AlterField(
                    model_name='quoteitem',
                    name='product',
                    field=models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to='catalog.product',
                        verbose_name='Produit',
                    ),
                ),
                migrations.AlterField(
                    model_name='orderitem',
                    name='product',
                    field=models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to='catalog.product',
                        verbose_name='Produit',
                    ),
                ),
                migrations.AlterField(
                    model_name='invoiceitem',
                    name='product',
                    field=models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to='catalog.product',
                        verbose_name='Produit',
                    ),
                ),
                # Puis supprimer Product de l'état sales
                migrations.DeleteModel(name='Product'),
            ],
            database_operations=[],
        ),
    ]
