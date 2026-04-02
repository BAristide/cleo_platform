"""
Connecteur FNE — Côte d'Ivoire.
API REST JSON — fne.dgi.gouv.ci
Source : Procédure d'interfaçage des entreprises par API (DGI CI, mai 2025).
"""

import logging

import requests

from sales.services.einvoice.base import (
    BaseEInvoiceProvider,
    EInvoiceCertificationError,
)

logger = logging.getLogger(__name__)

# Timeout HTTP en secondes
REQUEST_TIMEOUT = 30


class FNEProvider(BaseEInvoiceProvider):
    """Connecteur FNE Côte d'Ivoire — mode production."""

    def _get_headers(self, config):
        return {
            'Authorization': f'Bearer {config.api_key}',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }

    def _handle_response(self, response, context=''):
        """Traite la réponse HTTP et lève EInvoiceCertificationError si nécessaire."""
        if response.status_code in (200, 201):
            try:
                return response.json()
            except Exception:
                raise EInvoiceCertificationError(
                    f'Réponse FNE illisible {context}',
                    http_status=response.status_code,
                )

        error_map = {
            400: 'Données invalides — vérifiez le payload',
            401: 'Clé API invalide ou expirée — vérifiez Configuration > Facturation électronique',
            403: 'Accès refusé par la plateforme FNE',
            404: 'Ressource introuvable sur la plateforme FNE',
            500: 'Plateforme FNE temporairement indisponible — réessayez dans quelques minutes',
        }
        try:
            body = response.json()
            detail = body.get('message') or body.get('error') or str(body)
        except Exception:
            detail = response.text[:200] if response.text else '(réponse vide)'

        msg = error_map.get(response.status_code, f'Erreur HTTP {response.status_code}')
        raise EInvoiceCertificationError(
            f'{msg} : {detail}',
            http_status=response.status_code,
            raw_response={'status': response.status_code, 'body': detail},
        )

    def certify_invoice(self, invoice, config) -> dict:
        from sales.services.einvoice.mappers.fne_mapper import build_fne_invoice_payload

        payload = build_fne_invoice_payload(invoice, config)
        url = f'{config.api_url.rstrip("/")}/external/invoices/sign'

        logger.info(f'[FNE CI] Certification facture {invoice.number} → {url}')
        try:
            response = requests.post(
                url,
                json=payload,
                headers=self._get_headers(config),
                timeout=REQUEST_TIMEOUT,
            )
        except requests.Timeout:
            raise EInvoiceCertificationError(
                'Délai de connexion dépassé — plateforme FNE inaccessible'
            )
        except requests.ConnectionError:
            raise EInvoiceCertificationError(
                'Impossible de joindre la plateforme FNE — vérifiez votre connexion réseau'
            )

        data = self._handle_response(response, context=f'(facture {invoice.number})')
        fne_invoice = data.get('invoice', {})

        return {
            'reference': data.get('reference', ''),
            'verification_url': data.get('token', ''),
            'external_id': fne_invoice.get('id', ''),
            'sticker_balance': data.get('balance_sticker'),
            'raw_response': data,
        }

    def certify_credit_note(self, credit_note, parent_invoice, config) -> dict:
        """Appelle POST /external/invoices/{id}/refund"""
        from sales.services.einvoice.mappers.fne_mapper import build_fne_refund_payload

        parent_fne_id = parent_invoice.einvoice_external_id
        if not parent_fne_id:
            raise EInvoiceCertificationError(
                "La facture parent n'a pas d'identifiant FNE externe"
            )

        payload = build_fne_refund_payload(credit_note, parent_invoice)
        url = f'{config.api_url.rstrip("/")}/external/invoices/{parent_fne_id}/refund'

        logger.info(f'[FNE CI] Certification avoir {credit_note.number} → {url}')
        try:
            response = requests.post(
                url,
                json=payload,
                headers=self._get_headers(config),
                timeout=REQUEST_TIMEOUT,
            )
        except requests.Timeout:
            raise EInvoiceCertificationError(
                'Délai de connexion dépassé — plateforme FNE inaccessible'
            )
        except requests.ConnectionError:
            raise EInvoiceCertificationError('Impossible de joindre la plateforme FNE')

        data = self._handle_response(response, context=f'(avoir {credit_note.number})')
        fne_invoice = data.get('invoice', {})

        return {
            'reference': data.get('reference', ''),
            'verification_url': data.get('token', ''),
            'external_id': fne_invoice.get('id', ''),
            'sticker_balance': None,
            'raw_response': data,
        }

    def validate_config(self, config) -> dict:
        """Teste la connexion réelle vers la plateforme FNE."""
        if not config.api_url or not config.api_key:
            return {
                'valid': False,
                'message': 'URL API et Clé API sont obligatoires',
                'details': {},
            }

        # Tentative de connexion via un healthcheck ou un appel test
        url = f'{config.api_url.rstrip("/")}/external/invoices/sign'
        try:
            response = requests.options(
                url, headers=self._get_headers(config), timeout=10
            )
            # OPTIONS répond souvent 200 ou 405 — les deux indiquent que le serveur est joignable
            reachable = response.status_code in (200, 201, 405, 404, 400)
        except (requests.Timeout, requests.ConnectionError):
            return {
                'valid': False,
                'message': "Impossible de joindre la plateforme FNE — vérifiez l'URL et votre connexion",
                'details': {},
            }

        if reachable:
            return {
                'valid': True,
                'message': 'Connexion à la plateforme FNE établie',
                'details': {'url': config.api_url},
            }
        return {
            'valid': False,
            'message': f'Plateforme FNE inaccessible (HTTP {response.status_code})',
            'details': {'status': response.status_code},
        }
