"""
Connecteur DGI Maroc (stub) — API non encore publiée.
Phase 2 : stub prêt à accueillir le connecteur dès publication des specs DGI/xHub.
"""

from sales.services.einvoice.base import BaseEInvoiceProvider


class DGIMarocProvider(BaseEInvoiceProvider):
    """Stub connecteur DGI Maroc — API non disponible."""

    def certify_invoice(self, invoice, config) -> dict:
        raise NotImplementedError(
            "Le connecteur DGI Maroc n'est pas encore disponible. "
            'Utilisez le mode Simulation pour valider le flux UBL 2.1.'
        )

    def certify_credit_note(self, credit_note, parent_invoice, config) -> dict:
        raise NotImplementedError(
            "Le connecteur DGI Maroc n'est pas encore disponible."
        )

    def validate_config(self, config) -> dict:
        return {
            'valid': False,
            'message': "Le connecteur DGI Maroc n'est pas encore disponible — en attente des spécifications techniques officielles.",
            'details': {'phase': 2, 'status': 'stub'},
        }
