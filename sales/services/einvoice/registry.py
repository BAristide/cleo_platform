"""
Registre des providers e-invoicing.
Résout le bon connecteur selon le country_code et le mode configuré.
Zéro hardcoding : l'ajout d'un nouveau pays se fait uniquement dans PROVIDER_MAP.
"""

import importlib
import logging

logger = logging.getLogger(__name__)

# Mapping country_code → chemin complet de la classe provider
PROVIDER_MAP = {
    'CI': 'sales.services.einvoice.fne_ci.FNEProvider',
    'MA': 'sales.services.einvoice.dgi_ma.DGIMarocProvider',
    'FR': 'sales.services.einvoice.pdp_fr.PDPFranceProvider',
}

# Pays supportés pour l'e-invoicing (affichage UI)
SUPPORTED_COUNTRIES = list(PROVIDER_MAP.keys())


def _load_class(dotted_path):
    """Charge dynamiquement une classe à partir de son chemin pointé."""
    module_path, class_name = dotted_path.rsplit('.', 1)
    module = importlib.import_module(module_path)
    return getattr(module, class_name)


def get_provider(country_code=None, mode=None):
    """
    Résout le provider e-invoicing selon le pays et le mode.

    - mode='disabled' ou mode=None → retourne None
    - mode='simulation' → retourne SimulatorProvider (tous pays)
    - mode='production' → retourne le connecteur réel du pays
    - country_code absent du PROVIDER_MAP en mode production → retourne None
    """
    if not mode or mode == 'disabled':
        return None

    if mode == 'simulation':
        from sales.services.einvoice.simulator import SimulatorProvider

        return SimulatorProvider(country_code=country_code)

    if mode == 'production':
        if not country_code or country_code not in PROVIDER_MAP:
            logger.warning(
                f'E-invoicing: pas de provider pour le pays {country_code!r}'
            )
            return None
        provider_class = _load_class(PROVIDER_MAP[country_code])
        return provider_class()

    return None


def get_country_code_from_setup():
    """Récupère le country_code depuis CompanySetup."""
    try:
        from core.models import CompanySetup

        setup = CompanySetup.objects.filter(setup_completed=True).first()
        return setup.country_code if setup else None
    except Exception:
        return None


def is_einvoice_supported(country_code):
    """Retourne True si l'e-invoicing est supporté pour ce pays."""
    return country_code in PROVIDER_MAP
