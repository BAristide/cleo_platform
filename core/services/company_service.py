"""
Service centralisé pour récupérer le contexte entreprise.
Utilisé par tous les générateurs PDF et services email.
"""

import logging

logger = logging.getLogger(__name__)


def get_company_context():
    """
    Retourne le contexte entreprise pour les templates PDF/email.
    Lit CompanySetup + devise par défaut.
    Retourne un fallback si le setup n'est pas encore fait.
    """
    from core.models import CompanySetup, Currency

    setup = CompanySetup.objects.first()
    default_currency = Currency.objects.filter(is_default=True).first()

    if not setup or not setup.setup_completed:
        logger.warning(
            'CompanySetup non configuré — utilisation des valeurs par défaut'
        )
        return _get_fallback_context()

    # Construire la liste des identifiants légaux
    legal_ids = []
    for i in range(1, 5):
        label = getattr(setup, f'legal_id_{i}_label', '')
        value = getattr(setup, f'legal_id_{i}_value', '')
        if label and value:
            legal_ids.append({'label': label, 'value': value})

    # Construire l'adresse complète
    address_parts = [setup.address_line1]
    if setup.address_line2:
        address_parts.append(setup.address_line2)
    full_address = '\n'.join(filter(None, address_parts))

    city_line = ''
    if setup.city:
        city_parts = [setup.city]
        if setup.postal_code:
            city_parts.insert(0, setup.postal_code)
        city_line = ', '.join(city_parts)
        if setup.country:
            city_line += f' - {setup.country}'

    return {
        'name': setup.company_name,
        'address': full_address,
        'address_line1': setup.address_line1 or '',
        'address_line2': setup.address_line2 or '',
        'city': setup.city or '',
        'postal_code': setup.postal_code or '',
        'country': setup.country or '',
        'city_line': city_line,
        'phone': setup.phone or '',
        'email': setup.email or '',
        'website': setup.website or '',
        'legal_ids': legal_ids,
        'logo_url': setup.logo.url if setup.logo else None,
        'currency_code': default_currency.code if default_currency else '',
        'currency_symbol': default_currency.symbol if default_currency else '',
        'bank_name': setup.bank_name or '',
        'bank_account': setup.bank_account or '',
        'bank_swift': setup.bank_swift or '',
        'accounting_pack': setup.accounting_pack or '',
    }


def _get_fallback_context():
    """Contexte par défaut si CompanySetup n'existe pas encore."""
    return {
        'name': 'Mon Entreprise',
        'address': '',
        'address_line1': '',
        'address_line2': '',
        'city': '',
        'postal_code': '',
        'country': '',
        'city_line': '',
        'phone': '',
        'email': '',
        'website': '',
        'legal_ids': [],
        'logo_url': None,
        'currency_code': '',
        'currency_symbol': '',
        'bank_name': '',
        'bank_account': '',
        'bank_swift': '',
        'accounting_pack': '',
    }
