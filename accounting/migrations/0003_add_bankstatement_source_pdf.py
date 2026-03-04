from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('accounting', '0002_add_account_mapping'),
    ]

    operations = [
        migrations.AddField(
            model_name='bankstatement',
            name='source_pdf',
            field=models.FileField(
                blank=True,
                null=True,
                upload_to='accounting/bank_statements/',
                verbose_name='Relevé PDF source',
            ),
        ),
    ]
