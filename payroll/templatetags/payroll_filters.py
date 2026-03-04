from decimal import Decimal

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
