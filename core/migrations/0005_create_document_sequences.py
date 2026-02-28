"""Crée les séquences PostgreSQL pour la numérotation atomique des documents."""

from django.db import migrations


def create_sequences(apps, schema_editor):
    sequences = [
        ('cleo_quote_seq', 4),
        ('cleo_order_seq', 1),
        ('cleo_invoice_standard_seq', 1),
        ('cleo_invoice_deposit_seq', 1),
        ('cleo_invoice_credit_note_seq', 1),
        ('cleo_purchase_order_seq', 1),
        ('cleo_reception_seq', 1),
        ('cleo_supplier_invoice_seq', 1),
    ]
    for seq_name, start_val in sequences:
        schema_editor.execute(
            f'CREATE SEQUENCE IF NOT EXISTS {seq_name} START WITH {start_val};'
        )


def drop_sequences(apps, schema_editor):
    names = [
        'cleo_quote_seq',
        'cleo_order_seq',
        'cleo_invoice_standard_seq',
        'cleo_invoice_deposit_seq',
        'cleo_invoice_credit_note_seq',
        'cleo_purchase_order_seq',
        'cleo_reception_seq',
        'cleo_supplier_invoice_seq',
    ]
    for seq_name in names:
        schema_editor.execute(f'DROP SEQUENCE IF EXISTS {seq_name};')


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0004_settings_refactor_singleton'),
    ]

    operations = [
        migrations.RunPython(create_sequences, drop_sequences),
    ]
