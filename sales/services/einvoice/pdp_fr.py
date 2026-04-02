"""
Connecteur PDP France (stub) — Plateforme de Dématérialisation Partenaire.
Phase 3 : stub prêt à accueillir le connecteur après sélection d'une PDP agréée.
"""

from sales.services.einvoice.base import BaseEInvoiceProvider


class PDPFranceProvider(BaseEInvoiceProvider):
    """Stub connecteur PDP France."""

    def certify_invoice(self, invoice, config) -> dict:
        raise NotImplementedError(
            "Le connecteur PDP France n'est pas encore disponible. "
            'Utilisez le mode Simulation pour valider le flux Factur-X.'
        )

    def certify_credit_note(self, credit_note, parent_invoice, config) -> dict:
        raise NotImplementedError(
            "Le connecteur PDP France n'est pas encore disponible."
        )

    def validate_config(self, config) -> dict:
        return {
            'valid': False,
            'message': "Le connecteur PDP France n'est pas encore disponible — sélection d'une PDP agréée requise.",
            'details': {'phase': 3, 'status': 'stub'},
        }
