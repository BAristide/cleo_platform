"""
core/templatetags/cleo_filters.py
Filtres Django réutilisables pour le formatage des montants dans les templates PDF.
Utilise Currency.format_amount() — pack-agnostique, zéro hardcoding.
"""

from django import template

register = template.Library()


@register.filter(name='format_amount')
def format_amount(value, currency):
    """
    Formate un montant selon les paramètres de la devise (séparateurs, symbole, décimales).

    Usage dans les templates :
        {{ item.unit_price|format_amount:quote.currency }}
        {{ invoice.total|format_amount:invoice.currency }}
    """
    if currency is None:
        return value
    try:
        return currency.format_amount(value)
    except Exception:
        return value


@register.filter(name='format_amount_nosymbol')
def format_amount_nosymbol(value, currency):
    """
    Formate un montant avec séparateurs mais sans symbole de devise.
    Utile quand le code devise est affiché séparément.

    Usage :
        {{ item.subtotal|format_amount_nosymbol:quote.currency }} {{ quote.currency.code }}
    """
    if currency is None:
        return value
    try:
        from decimal import ROUND_HALF_UP, Decimal

        if value is None:
            value = Decimal('0')
        value = value if isinstance(value, Decimal) else Decimal(str(value))
        quant = Decimal('1').scaleb(-int(currency.decimal_places))
        value = value.quantize(quant, rounding=ROUND_HALF_UP)
        amount_str = f'{value:.{currency.decimal_places}f}'
        # decimal_places=0 (XOF, XAF...) : pas de point decimal dans la chaine
        if '.' in amount_str:
            integer_part, decimal_part = amount_str.split('.')
        else:
            integer_part, decimal_part = amount_str, None
        if currency.thousand_separator:
            grouped = []
            s = integer_part
            while s:
                grouped.append(s[-3:])
                s = s[:-3]
            integer_part = currency.thousand_separator.join(reversed(grouped))
        if decimal_part is not None:
            dec_sep = currency.decimal_separator or '.'
            return f'{integer_part}{dec_sep}{decimal_part}'
        return integer_part
    except Exception:
        return value
