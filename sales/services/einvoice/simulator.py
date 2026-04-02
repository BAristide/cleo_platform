"""
SimulatorProvider — Mock local de la facturation électronique.
Exécute le flux complet (construction payload, validation) sans aucun appel réseau.
Le PDF simulation porte un filigrane « SIMULATION — NON CERTIFIÉ ».
Adapte son comportement selon le country_code (FNE CI / DGI MA / PDP FR).
"""

import logging
import random
import string

from sales.services.einvoice.base import BaseEInvoiceProvider

logger = logging.getLogger(__name__)


def _random_ref(prefix, length=6):
    return f'{prefix}-{"".join(random.choices(string.ascii_uppercase + string.digits, k=length))}'


class SimulatorProvider(BaseEInvoiceProvider):
    """Provider simulateur — aucun appel réseau."""

    def __init__(self, country_code=None):
        self.country_code = country_code or 'CI'

    # ── FNE CI ───────────────────────────────────────────────────────

    def _simulate_fne_ci(self, invoice, config):
        """Simule une réponse FNE conforme au format réel."""
        from sales.services.einvoice.mappers.fne_mapper import build_fne_invoice_payload

        # Valider la structure du payload (sans appel réseau)
        payload = build_fne_invoice_payload(invoice, config)
        # Vérifier les champs obligatoires FNE
        required = [
            'invoiceType',
            'paymentMethod',
            'template',
            'clientCompanyName',
            'items',
        ]
        missing = [f for f in required if not payload.get(f)]
        if missing:
            from sales.services.einvoice.base import EInvoiceCertificationError

            raise EInvoiceCertificationError(
                f'Payload FNE invalide — champs manquants : {missing}'
            )
        # Générer une réponse simulée fidèle au format FNE
        sim_ref = _random_ref('SIM-CI')
        sim_id = f'sim-fne-{_random_ref("", 12).lower()}'
        # Construire les items simulés avec IDs (nécessaires pour refund)
        simulated_items = []
        for i, item in enumerate(payload.get('items', [])):
            simulated_items.append(
                {**item, 'id': f'sim-item-{i + 1}-{_random_ref("", 6).lower()}'}
            )
        return {
            'reference': sim_ref,
            'verification_url': f'#simulation-ci-{sim_ref}',
            'external_id': sim_id,
            'sticker_balance': random.randint(50, 200),
            'raw_response': {
                'ncc': config.establishment or 'SIM-NCC',
                'reference': sim_ref,
                'token': f'#simulation-ci-{sim_ref}',
                'balance_sticker': random.randint(50, 200),
                'warning': None,
                'invoice': {
                    'id': sim_id,
                    'invoiceType': 'sale',
                    'items': simulated_items,
                },
                '_simulation': True,
            },
        }

    def _simulate_fne_ci_refund(self, credit_note, parent_invoice, config):
        """Simule une réponse FNE refund."""
        sim_ref = _random_ref('SIM-CI-AV')
        sim_id = f'sim-fne-av-{_random_ref("", 12).lower()}'
        return {
            'reference': sim_ref,
            'verification_url': f'#simulation-ci-avoir-{sim_ref}',
            'external_id': sim_id,
            'sticker_balance': None,
            'raw_response': {
                'reference': sim_ref,
                'invoice': {'id': sim_id},
                '_simulation': True,
            },
        }

    # ── DGI Maroc ────────────────────────────────────────────────────

    def _simulate_dgi_ma(self, invoice, config):
        """Simule une réponse DGI Maroc (UBL 2.1 — stub)."""
        from sales.services.einvoice.mappers.ubl_generator import build_ubl_invoice

        xml_content = build_ubl_invoice(invoice)
        sim_ref = _random_ref('SIM-MA')
        return {
            'reference': sim_ref,
            'verification_url': f'#simulation-ma-{sim_ref}',
            'external_id': f'sim-dgi-ma-{_random_ref("", 12).lower()}',
            'sticker_balance': None,
            'raw_response': {
                'reference': sim_ref,
                'ubl_generated': True,
                'ubl_length': len(xml_content) if xml_content else 0,
                '_simulation': True,
            },
        }

    def _simulate_dgi_ma_refund(self, credit_note, parent_invoice, config):
        sim_ref = _random_ref('SIM-MA-AV')
        return {
            'reference': sim_ref,
            'verification_url': f'#simulation-ma-avoir-{sim_ref}',
            'external_id': f'sim-dgi-ma-av-{_random_ref("", 8).lower()}',
            'sticker_balance': None,
            'raw_response': {'reference': sim_ref, '_simulation': True},
        }

    # ── PDP France ───────────────────────────────────────────────────

    def _simulate_pdp_fr(self, invoice, config):
        """Simule une réponse PDP France (Factur-X — stub)."""
        from sales.services.einvoice.mappers.facturx_generator import build_facturx

        facturx = build_facturx(invoice)
        sim_ref = _random_ref('SIM-FR')
        return {
            'reference': sim_ref,
            'verification_url': f'#simulation-fr-{sim_ref}',
            'external_id': f'sim-pdp-fr-{_random_ref("", 12).lower()}',
            'sticker_balance': None,
            'raw_response': {
                'reference': sim_ref,
                'facturx_generated': facturx is not None,
                '_simulation': True,
            },
        }

    def _simulate_pdp_fr_refund(self, credit_note, parent_invoice, config):
        sim_ref = _random_ref('SIM-FR-AV')
        return {
            'reference': sim_ref,
            'verification_url': f'#simulation-fr-avoir-{sim_ref}',
            'external_id': f'sim-pdp-fr-av-{_random_ref("", 8).lower()}',
            'sticker_balance': None,
            'raw_response': {'reference': sim_ref, '_simulation': True},
        }

    # ── Interface abstraite ──────────────────────────────────────────

    def certify_invoice(self, invoice, config) -> dict:
        logger.info(
            f'[SIMULATION] Certification facture {invoice.number} (pays={self.country_code})'
        )
        if self.country_code == 'CI':
            return self._simulate_fne_ci(invoice, config)
        elif self.country_code == 'MA':
            return self._simulate_dgi_ma(invoice, config)
        elif self.country_code == 'FR':
            return self._simulate_pdp_fr(invoice, config)
        else:
            # Pays non supporté → simulateur générique
            sim_ref = _random_ref(f'SIM-{self.country_code}')
            return {
                'reference': sim_ref,
                'verification_url': f'#simulation-{self.country_code.lower()}-{sim_ref}',
                'external_id': f'sim-generic-{_random_ref("", 10).lower()}',
                'sticker_balance': None,
                'raw_response': {
                    'reference': sim_ref,
                    '_simulation': True,
                    'country': self.country_code,
                },
            }

    def certify_credit_note(self, credit_note, parent_invoice, config) -> dict:
        logger.info(
            f'[SIMULATION] Certification avoir {credit_note.number} (pays={self.country_code})'
        )
        if self.country_code == 'CI':
            return self._simulate_fne_ci_refund(credit_note, parent_invoice, config)
        elif self.country_code == 'MA':
            return self._simulate_dgi_ma_refund(credit_note, parent_invoice, config)
        elif self.country_code == 'FR':
            return self._simulate_pdp_fr_refund(credit_note, parent_invoice, config)
        else:
            sim_ref = _random_ref(f'SIM-{self.country_code}-AV')
            return {
                'reference': sim_ref,
                'verification_url': f'#simulation-avoir-{sim_ref}',
                'external_id': f'sim-av-{_random_ref("", 8).lower()}',
                'sticker_balance': None,
                'raw_response': {'reference': sim_ref, '_simulation': True},
            }

    def validate_config(self, config) -> dict:
        """En simulation : valide la structure des paramètres sans appel réseau."""
        errors = []
        if self.country_code == 'CI':
            if not config.api_url:
                errors.append('URL API manquante')
            if not config.api_key:
                errors.append('Clé API manquante')
            if not config.establishment:
                errors.append('Établissement manquant')
            if not config.point_of_sale:
                errors.append('Point de vente manquant')
        elif self.country_code == 'MA':
            if not config.api_url:
                errors.append('URL API manquante')
            if not config.api_key:
                errors.append('Clé API manquante')
        elif self.country_code == 'FR':
            if not config.pdp_name:
                errors.append('Nom PDP manquant')
            if not config.pdp_api_url:
                errors.append('URL API PDP manquante')

        if errors:
            return {
                'valid': False,
                'message': f'Configuration incomplète : {", ".join(errors)}',
                'details': {'errors': errors, 'mode': 'simulation'},
            }
        return {
            'valid': True,
            'message': 'Configuration valide — mode simulation',
            'details': {'mode': 'simulation', 'country': self.country_code},
        }
