"""
Interface abstraite commune à tous les connecteurs de facturation électronique.
Chaque provider (FNE CI, DGI MA, PDP FR, Simulateur) implémente cette classe.
"""

from abc import ABC, abstractmethod


class EInvoiceCertificationError(Exception):
    """Erreur levée en cas d'échec de certification auprès de la plateforme."""

    def __init__(self, message, http_status=None, raw_response=None):
        super().__init__(message)
        self.http_status = http_status
        self.raw_response = raw_response


class BaseEInvoiceProvider(ABC):
    """Interface commune à tous les connecteurs de facturation électronique."""

    @abstractmethod
    def certify_invoice(self, invoice, config) -> dict:
        """
        Certifie une facture auprès de la plateforme gouvernementale.

        Retourne un dict :
            {
                'reference': str,            # Numéro fiscal retourné
                'verification_url': str,     # URL de vérification (QR code)
                'external_id': str,          # UUID retourné par la plateforme
                'raw_response': dict,        # Réponse brute complète
                'sticker_balance': int|None, # Solde stickers (FNE CI)
            }
        Lève EInvoiceCertificationError en cas d'échec.
        """

    @abstractmethod
    def certify_credit_note(self, credit_note, parent_invoice, config) -> dict:
        """
        Certifie un avoir.
        parent_invoice doit avoir un einvoice_external_id renseigné.

        Retourne le même dict que certify_invoice.
        Lève EInvoiceCertificationError en cas d'échec.
        """

    @abstractmethod
    def validate_config(self, config) -> dict:
        """
        Vérifie que la configuration est complète et fonctionnelle.

        Retourne : {'valid': bool, 'message': str, 'details': dict}
        """
