"""
Générateur Factur-X — France (Phase 3 — stub).
Factur-X est un format hybride PDF/A-3 + XML (CII ou UBL).
Ce stub retourne un dict descripteur prêt à être complété.
"""

import logging

logger = logging.getLogger(__name__)


def build_facturx(invoice) -> dict:
    """
    Stub Factur-X.
    Retourne un dict descripteur du document (pas encore un vrai PDF/A-3).
    """
    try:
        return {
            'profile': 'EN16931',  # Profil Factur-X recommandé France
            'invoice_number': invoice.number,
            'issue_date': str(invoice.date) if invoice.date else '',
            'seller': 'EC Intelligence',
            'buyer': invoice.company.name if invoice.company else '',
            'currency': invoice.currency.code if invoice.currency else 'EUR',
            'total_ht': float(invoice.subtotal or 0),
            'total_ttc': float(invoice.total or 0),
            'tva': float(invoice.tax_amount or 0),
            '_stub': True,
            '_note': 'Factur-X Phase 3 — stub à compléter après sélection PDP agréée',
        }
    except Exception as e:
        logger.warning(f'[Factur-X] Erreur génération pour {invoice.number}: {e}')
        return None
