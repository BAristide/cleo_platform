"""
Mapper FNE Côte d'Ivoire.
Transforme une Invoice Cleo en payload JSON conforme à l'API FNE DGI CI.
Zéro hardcoding : tous les mappings sont basés sur les données de la facture.
"""

import logging
from decimal import Decimal

logger = logging.getLogger(__name__)

# Mapping taux TVA Cleo → code TVA FNE
# Basé sur tax_rate numérique — indépendant des fixtures
TVA_RATE_TO_FNE_CODE = {
    Decimal('18.00'): 'TVA',  # TVA normale 18%
    Decimal('18.0'): 'TVA',
    Decimal('18'): 'TVA',
    Decimal('9.00'): 'TVAB',  # TVA réduite 9%
    Decimal('9.0'): 'TVAB',
    Decimal('9'): 'TVAB',
    Decimal('0.00'): None,  # Résolu dynamiquement (exo conv vs exo légale)
    Decimal('0.0'): None,
    Decimal('0'): None,
}

# Mapping méthode de paiement Cleo → code FNE
PAYMENT_METHOD_MAP = {
    'bank_transfer': 'transfer',
    'check': 'check',
    'cash': 'cash',
    'credit_card': 'card',
    'mobile_money': 'mobile-money',
    'deferred': 'deferred',
    'other': 'cash',  # Fallback FNE obligatoire
}


def _map_tax_rate_to_fne(tax_rate, is_tax_exempt=False):
    """
    Convertit le taux TVA Cleo en liste de codes FNE.
    - 18% → ['TVA']
    - 9%  → ['TVAB']
    - 0% exonéré → ['TVAC'] (exo conventionnelle) ou ['TVAD'] (exo légale)
    - 0% non exonéré → ['TVAD']
    """
    rate = Decimal(str(tax_rate)).quantize(Decimal('0.01'))
    if rate == Decimal('18.00'):
        return ['TVA']
    elif rate == Decimal('9.00'):
        return ['TVAB']
    elif rate == Decimal('0.00'):
        return ['TVAC'] if is_tax_exempt else ['TVAD']
    else:
        # Taux non standard → fallback TVAD (exonération légale)
        logger.warning(f'[FNE] Taux TVA non standard {tax_rate} → TVAD (fallback)')
        return ['TVAD']


def _map_payment_method(invoice):
    """Résout le mode de paiement FNE depuis la facture."""
    payments = invoice.payment_set.all().order_by('-date')
    if payments.exists():
        method = payments.first().method
        return PAYMENT_METHOD_MAP.get(method, 'cash')
    # Aucun paiement enregistré : fallback selon les conditions
    if invoice.payment_terms == 'immediate':
        return 'cash'
    return 'transfer'  # Virement par défaut


def _resolve_fne_template(invoice):
    """
    Détermine le template FNE (B2B / B2C / B2F).
    - B2B : client avec tax_id renseigné
    - B2F : devise étrangère ou facture exonérée (international)
    - B2C : client particulier (pas de NCC)
    """
    company = invoice.company
    if not company:
        return 'B2C'

    # Vérifier si la facture est en devise étrangère
    try:
        from core.models import Currency

        default_currency = Currency.objects.filter(is_default=True).first()
        if default_currency and invoice.currency_id != default_currency.pk:
            return 'B2F'
    except Exception:
        pass

    # Client avec identifiant fiscal → B2B
    if hasattr(company, 'tax_id') and company.tax_id:
        return 'B2B'

    return 'B2C'


def _get_client_ncc(invoice):
    """Retourne le NCC du client (tax_id) ou chaîne vide."""
    company = invoice.company
    if company and hasattr(company, 'tax_id'):
        return company.tax_id or ''
    return ''


def _is_foreign_currency(invoice):
    """True si la devise de la facture n'est pas la devise par défaut."""
    try:
        from core.models import Currency

        default_currency = Currency.objects.filter(is_default=True).first()
        return default_currency and invoice.currency_id != default_currency.pk
    except Exception:
        return False


def _map_item(item, is_tax_exempt=False):
    """Transforme une ligne de facture en item FNE."""
    quantity = float(item.quantity)
    amount = float(abs(item.unit_price))
    tax_rate = item.tax_rate
    fne_taxes = _map_tax_rate_to_fne(tax_rate, is_tax_exempt=is_tax_exempt)

    return {
        'description': item.description or (item.product.name if item.product else ''),
        'quantity': quantity,
        'amount': amount,
        'discount': 0,
        'taxes': fne_taxes,
        'customTaxes': [],
    }


def build_fne_invoice_payload(invoice, config):
    """
    Transforme une Invoice Cleo en payload JSON conforme à l'API FNE.

    Args:
        invoice: instance Invoice
        config: instance EInvoiceConfig

    Returns:
        dict prêt à être envoyé à POST /external/invoices/sign
    """
    company = invoice.company
    template = _resolve_fne_template(invoice)
    is_foreign = _is_foreign_currency(invoice)

    # Informations client
    client_name = company.name if company else ''
    client_phone = (
        str(getattr(company, 'phone', '') or '').replace(' ', '') or '00000000'
    )
    client_email = getattr(company, 'email', '') or ''
    client_ncc = _get_client_ncc(invoice)

    # Items de la facture
    items = invoice.get_items()
    fne_items = [_map_item(item, is_tax_exempt=invoice.is_tax_exempt) for item in items]

    # Devise étrangère
    foreign_currency = ''
    foreign_rate = 0
    if is_foreign and invoice.currency:
        foreign_currency = invoice.currency.code
        foreign_rate = float(invoice.exchange_rate) if invoice.exchange_rate else 0

    payload = {
        'invoiceType': 'sale',
        'paymentMethod': _map_payment_method(invoice),
        'template': template,
        'isRne': False,
        'rne': '',
        'clientNcc': client_ncc,
        'clientCompanyName': client_name,
        'clientPhone': client_phone,
        'clientEmail': client_email,
        'clientSellerName': '',
        'pointOfSale': config.point_of_sale or '',
        'establishment': config.establishment or '',
        'foreignCurrency': foreign_currency,
        'foreignCurrencyRate': foreign_rate,
        'items': fne_items,
        'discount': float(invoice.discount_percentage)
        if invoice.discount_percentage and invoice.discount_percentage > 0
        else 0,
    }

    return payload


def build_fne_refund_payload(credit_note, parent_invoice):
    """
    Construit le payload pour POST /external/invoices/{id}/refund.

    Extrait les IDs des items FNE depuis la raw_response du parent.
    """
    raw = parent_invoice.einvoice_raw_response or {}
    fne_parent_invoice = raw.get('invoice', {})
    fne_items = fne_parent_invoice.get('items', [])

    # Construire un index id→item FNE depuis la réponse brute parent
    fne_items_by_order = {i: item for i, item in enumerate(fne_items)}

    credit_items = credit_note.get_items()
    refund_items = []

    for idx, credit_item in enumerate(credit_items):
        fne_item = fne_items_by_order.get(idx)
        if fne_item and fne_item.get('id'):
            refund_items.append(
                {
                    'id': fne_item['id'],
                    'quantity': float(abs(credit_item.quantity)),
                }
            )
        else:
            # Fallback si l'item FNE n'a pas d'ID (simulation ou données manquantes)
            logger.warning(
                f'[FNE Refund] Item {idx} sans ID FNE sur facture parent {parent_invoice.number}'
            )

    return {'items': refund_items}
