"""
EInvoiceService — Orchestration métier de la facturation électronique.
Point d'entrée unique appelé depuis InvoiceViewSet.
"""

import logging

from django.utils import timezone

logger = logging.getLogger(__name__)


class EInvoiceService:
    """Service d'orchestration de la facturation électronique."""

    @staticmethod
    def get_active_config():
        """Charge la configuration singleton EInvoiceConfig."""
        from sales.models import EInvoiceConfig

        return EInvoiceConfig.load()

    @staticmethod
    def get_active_provider(config=None):
        """Résout le provider actif selon la config et le CompanySetup."""
        from sales.services.einvoice.registry import (
            get_country_code_from_setup,
            get_provider,
        )

        if config is None:
            config = EInvoiceService.get_active_config()

        country_code = get_country_code_from_setup()
        return get_provider(country_code=country_code, mode=config.mode)

    @staticmethod
    def certify(invoice):
        """
        Certifie une facture (standard ou acompte).
        Met à jour les champs einvoice_* de la facture.
        Retourne : {'success': bool, 'reference': str, ...} ou lève une exception.
        """
        from sales.services.einvoice.base import EInvoiceCertificationError

        config = EInvoiceService.get_active_config()

        if config.mode == 'disabled':
            return {
                'success': False,
                'error': 'La facturation électronique est désactivée.',
            }

        if invoice.type not in ('standard', 'deposit'):
            return {
                'success': False,
                'error': 'Seules les factures standard et acompte peuvent être certifiées.',
            }

        if invoice.einvoice_status == 'certified':
            return {'success': False, 'error': 'Cette facture est déjà certifiée.'}

        provider = EInvoiceService.get_active_provider(config)
        if provider is None:
            return {
                'success': False,
                'error': 'Aucun provider e-invoicing disponible pour ce pays.',
            }

        try:
            result = provider.certify_invoice(invoice, config)

            new_status = 'simulated' if config.mode == 'simulation' else 'certified'
            invoice.einvoice_status = new_status
            invoice.einvoice_reference = result.get('reference', '')
            invoice.einvoice_verification_url = result.get('verification_url', '')
            invoice.einvoice_external_id = result.get('external_id', '')
            invoice.einvoice_certified_at = timezone.now()
            invoice.einvoice_raw_response = result.get('raw_response')
            invoice.save(
                update_fields=[
                    'einvoice_status',
                    'einvoice_reference',
                    'einvoice_verification_url',
                    'einvoice_external_id',
                    'einvoice_certified_at',
                    'einvoice_raw_response',
                ]
            )

            return {
                'success': True,
                'status': new_status,
                'reference': result.get('reference', ''),
                'verification_url': result.get('verification_url', ''),
                'sticker_balance': result.get('sticker_balance'),
                'mode': config.mode,
            }

        except EInvoiceCertificationError as e:
            invoice.einvoice_status = 'failed'
            invoice.save(update_fields=['einvoice_status'])
            return {
                'success': False,
                'error': str(e),
                'http_status': e.http_status,
            }
        except Exception as e:
            logger.exception(
                f'Erreur inattendue lors de la certification de {invoice.number}'
            )
            invoice.einvoice_status = 'failed'
            invoice.save(update_fields=['einvoice_status'])
            return {'success': False, 'error': f'Erreur inattendue : {str(e)}'}

    @staticmethod
    def certify_credit_note(credit_note):
        """
        Certifie un avoir.
        La facture parent doit être certifiée (status certified ou simulated).
        """
        from sales.services.einvoice.base import EInvoiceCertificationError

        config = EInvoiceService.get_active_config()

        if config.mode == 'disabled':
            return {
                'success': False,
                'error': 'La facturation électronique est désactivée.',
            }

        if credit_note.type != 'credit_note':
            return {'success': False, 'error': "Ce document n'est pas un avoir."}

        parent = credit_note.parent_invoice
        if not parent:
            return {'success': False, 'error': "L'avoir n'a pas de facture parent."}

        if parent.einvoice_status not in ('certified', 'simulated'):
            return {
                'success': False,
                'error': 'La facture parent doit être certifiée avant de certifier cet avoir.',
            }

        if not parent.einvoice_external_id:
            return {
                'success': False,
                'error': "La facture parent n'a pas d'identifiant externe e-facture.",
            }

        provider = EInvoiceService.get_active_provider(config)
        if provider is None:
            return {
                'success': False,
                'error': 'Aucun provider e-invoicing disponible pour ce pays.',
            }

        try:
            result = provider.certify_credit_note(credit_note, parent, config)

            new_status = 'simulated' if config.mode == 'simulation' else 'certified'
            credit_note.einvoice_status = new_status
            credit_note.einvoice_reference = result.get('reference', '')
            credit_note.einvoice_verification_url = result.get('verification_url', '')
            credit_note.einvoice_external_id = result.get('external_id', '')
            credit_note.einvoice_certified_at = timezone.now()
            credit_note.einvoice_raw_response = result.get('raw_response')
            credit_note.save(
                update_fields=[
                    'einvoice_status',
                    'einvoice_reference',
                    'einvoice_verification_url',
                    'einvoice_external_id',
                    'einvoice_certified_at',
                    'einvoice_raw_response',
                ]
            )

            return {
                'success': True,
                'status': new_status,
                'reference': result.get('reference', ''),
                'mode': config.mode,
            }

        except EInvoiceCertificationError as e:
            credit_note.einvoice_status = 'failed'
            credit_note.save(update_fields=['einvoice_status'])
            return {'success': False, 'error': str(e), 'http_status': e.http_status}
        except Exception as e:
            logger.exception(
                f'Erreur inattendue lors de la certification avoir {credit_note.number}'
            )
            credit_note.einvoice_status = 'failed'
            credit_note.save(update_fields=['einvoice_status'])
            return {'success': False, 'error': f'Erreur inattendue : {str(e)}'}

    @staticmethod
    def test_connection(config):
        """Teste la connexion selon le mode configuré."""
        provider = EInvoiceService.get_active_provider(config)
        if provider is None:
            return {
                'valid': False,
                'message': 'Aucun provider disponible pour ce pays.',
            }
        return provider.validate_config(config)
