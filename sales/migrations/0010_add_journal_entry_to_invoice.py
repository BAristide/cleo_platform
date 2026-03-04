from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('accounting', '0001_initial'),
        ('sales', '0009_move_product_to_catalog'),
    ]

    operations = [
        migrations.AddField(
            model_name='invoice',
            name='journal_entry',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='sales_invoices',
                to='accounting.journalentry',
                verbose_name='Écriture comptable',
            ),
        ),
    ]
