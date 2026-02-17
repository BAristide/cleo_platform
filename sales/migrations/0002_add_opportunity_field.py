from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('crm', '0001_initial'),
        ('sales', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='opportunity',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                to='crm.opportunity',
                verbose_name='Opportunité',
            ),
        ),
        migrations.AddField(
            model_name='invoice',
            name='opportunity',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                to='crm.opportunity',
                verbose_name='Opportunité',
            ),
        ),
    ]
