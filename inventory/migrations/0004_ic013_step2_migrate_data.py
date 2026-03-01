"""IC-013 — Migration des données source_document_type → content_type + object_id."""

from django.db import migrations


DOCUMENT_TYPE_MAP = {
    'invoice_item': ('sales', 'invoiceitem'),
    'order': ('sales', 'order'),
    'invoice': ('sales', 'invoice'),
    'purchase': ('purchasing', 'purchaseorder'),
    'reception': ('purchasing', 'reception'),
    'supplier_invoice': ('purchasing', 'supplierinvoice'),
    'credit_note': ('sales', 'invoice'),
    'inventory': ('inventory', 'stockinventory'),
}


def migrate_source_documents(apps, schema_editor):
    StockMove = apps.get_model('inventory', 'StockMove')
    ContentType = apps.get_model('contenttypes', 'ContentType')

    moves = StockMove.objects.filter(
        source_document_type__isnull=False,
        content_type__isnull=True,
    ).exclude(source_document_type='')

    migrated = 0
    skipped = 0

    for move in moves.iterator():
        mapping = DOCUMENT_TYPE_MAP.get(move.source_document_type)
        if mapping:
            app_label, model_name = mapping
            try:
                ct = ContentType.objects.get(app_label=app_label, model=model_name)
                move.content_type = ct
                move.object_id = move.source_document_id
                move.save(update_fields=['content_type', 'object_id'])
                migrated += 1
            except ContentType.DoesNotExist:
                skipped += 1
        else:
            skipped += 1

    print(f'\n  IC-013 data migration: {migrated} migrés, {skipped} ignorés')


def reverse_migration(apps, schema_editor):
    StockMove = apps.get_model('inventory', 'StockMove')
    StockMove.objects.filter(content_type__isnull=False).update(
        content_type=None, object_id=None
    )


class Migration(migrations.Migration):
    dependencies = [
        ('inventory', '0003_ic013_step1_add_generic_fk'),
        ('contenttypes', '0002_remove_content_type_name'),
        ('sales', '0009_move_product_to_catalog'),
    ]

    operations = [
        migrations.RunPython(migrate_source_documents, reverse_migration),
    ]
