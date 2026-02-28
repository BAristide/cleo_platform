import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('inventory', '0001_initial'),
        ('catalog', '0001_initial'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                # Rediriger les FK vers catalog.Product
                migrations.AlterField(
                    model_name='stockmove',
                    name='product',
                    field=models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='stock_moves',
                        to='catalog.product',
                        verbose_name='Produit',
                    ),
                ),
                migrations.AlterField(
                    model_name='stocklevel',
                    name='product',
                    field=models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='stock_levels',
                        to='catalog.product',
                        verbose_name='Produit',
                    ),
                ),
                migrations.AlterField(
                    model_name='stockinventoryline',
                    name='product',
                    field=models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to='catalog.product',
                        verbose_name='Produit',
                    ),
                ),
                # Puis supprimer ProductCategory de l'état inventory
                migrations.DeleteModel(name='ProductCategory'),
            ],
            database_operations=[],
        ),
    ]
