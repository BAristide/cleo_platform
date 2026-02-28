"""Service centralisé de numérotation des documents via séquences PostgreSQL."""

import logging

from django.db import connection

logger = logging.getLogger(__name__)

# (sequence_name, default_prefix, padding_digits)
_DOC_CONFIG = {
    'quote': ('cleo_quote_seq', 'DEV-', 4),
    'order': ('cleo_order_seq', 'CMD-', 4),
    'invoice_standard': ('cleo_invoice_standard_seq', 'FACT-', 4),
    'invoice_deposit': ('cleo_invoice_deposit_seq', 'AC-', 4),
    'invoice_credit_note': ('cleo_invoice_credit_note_seq', 'AV-', 4),
    'purchase_order': ('cleo_purchase_order_seq', 'BC-', 5),
    'reception': ('cleo_reception_seq', 'REC-', 5),
    'supplier_invoice': ('cleo_supplier_invoice_seq', 'FF-', 5),
}

# Champs CoreSettings lus dynamiquement pour les préfixes sales
_SETTINGS_PREFIX_MAP = {
    'quote': 'quote_prefix',
    'order': 'order_prefix',
    'invoice_standard': 'invoice_prefix',
}


def generate_document_number(doc_type):
    """
    Génère un numéro de document unique et atomique via séquence PostgreSQL.
    Lit le préfixe depuis CoreSettings si disponible (documents vente).
    """
    if doc_type not in _DOC_CONFIG:
        raise ValueError(f'Type de document inconnu: {doc_type}')

    seq_name, default_prefix, padding = _DOC_CONFIG[doc_type]

    # Lire le préfixe depuis CoreSettings si applicable
    prefix = default_prefix
    if doc_type in _SETTINGS_PREFIX_MAP:
        try:
            from core.models import CoreSettings

            settings = CoreSettings.objects.first()
            if settings:
                custom_prefix = getattr(settings, _SETTINGS_PREFIX_MAP[doc_type], '')
                if custom_prefix:
                    prefix = custom_prefix
        except Exception:
            pass

    with connection.cursor() as cursor:
        cursor.execute(f"SELECT nextval('{seq_name}')")
        next_val = cursor.fetchone()[0]

    return f'{prefix}{next_val:0{padding}d}'
