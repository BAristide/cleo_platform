from decimal import ROUND_HALF_UP, Decimal

from django import template

register = template.Library()


@register.filter
def abs_value(value):
    """Retourne la valeur absolue."""
    try:
        return abs(Decimal(str(value)))
    except (TypeError, ValueError):
        return value


@register.filter
def sub(value, arg):
    """Soustraction : value - arg."""
    try:
        return Decimal(str(value)) - Decimal(str(arg))
    except (TypeError, ValueError):
        return value


@register.filter
def fmt(value):
    """Formate un nombre avec separateurs de milliers (espace) et 2 decimales (virgule).

    Exemples :
        1502642.00  ->  1 502 642,00
        70000       ->  70 000,00
        -4410.50    ->  -4 410,50
    """
    try:
        val = Decimal(str(value)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        sign = '-' if val < 0 else ''
        val = abs(val)
        int_part = int(val)
        dec_part = str(val - int_part)[2:].ljust(2, '0')[:2]
        # Separateur de milliers (espace)
        formatted_int = f'{int_part:,}'.replace(',', ' ')
        return f'{sign}{formatted_int},{dec_part}'
    except (ValueError, TypeError, ArithmeticError):
        return value
