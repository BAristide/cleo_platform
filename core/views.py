import importlib
import json
import logging
import os
import shutil
import zipfile
from datetime import datetime
from io import BytesIO

from django.conf import settings as django_settings
from django.core.mail import EmailMessage, get_connection
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import HasModulePermission

from .models import CompanySetup, CoreSettings, Currency, EmailSettings
from .serializers import (
    CompanyInfoSerializer,
    CompanySetupSerializer,
    CoreSettingsSerializer,
    CurrencySerializer,
    EmailSettingsSerializer,
    LocalePackInfoSerializer,
    SetupStatusSerializer,
)

logger = logging.getLogger(__name__)


# ── Packs disponibles (métadonnées statiques) ───────────────────────

AVAILABLE_PACKS = {
    'MA': {
        'code': 'MA',
        'name': 'Maroc',
        'country_name': 'Maroc',
        'chart_of_accounts': 'PCG Maroc (PCGE)',
        'default_currency': 'MAD',
        'taxes_summary': 'TVA 20%, 14%, 10%, 7%, 0%',
        'legal_id_labels': ['RC', 'IF', 'Patente', 'ICE'],
    },
    'OHADA': {
        'code': 'OHADA',
        'name': 'OHADA — Afrique francophone',
        'country_name': "Côte d'Ivoire / Zone OHADA",
        'chart_of_accounts': 'SYSCOHADA révisé (2018)',
        'default_currency': 'XOF',
        'taxes_summary': 'TVA 18%, 0%',
        'legal_id_labels': ['RCCM', 'NCC', 'IDU'],
    },
    'FR': {
        'code': 'FR',
        'name': 'France',
        'country_name': 'France',
        'chart_of_accounts': 'PCG France (ANC)',
        'default_currency': 'EUR',
        'taxes_summary': 'TVA 20%, 10%, 5.5%, 2.1%, 0%',
        'legal_id_labels': ['SIRET', 'SIREN', 'Code APE', 'TVA Intra.'],
    },
}


class CurrencyViewSet(viewsets.ModelViewSet):
    queryset = Currency.objects.all()
    serializer_class = CurrencySerializer
    permission_classes = [IsAuthenticated, HasModulePermission]
    module_name = 'core'

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        new_is_default = request.data.get('is_default')

        if new_is_default and not instance.is_default:
            if self._has_commercial_documents():
                return Response(
                    {
                        'error': 'Impossible de changer la devise par défaut : '
                        'des documents commerciaux existent déjà. '
                        'Contactez un administrateur système.'
                    },
                    status=400,
                )

        if instance.is_default and new_is_default is False:
            return Response(
                {
                    'error': 'Impossible de retirer le statut par défaut. '
                    'Définissez une autre devise comme devise par défaut.'
                },
                status=400,
            )

        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def _has_commercial_documents(self):
        from sales.models import Invoice, Order, Quote

        return (
            Quote.objects.exists() or Order.objects.exists() or Invoice.objects.exists()
        )

    @action(detail=False, methods=['get'], url_path='default')
    def default(self, request):
        default_currency = Currency.objects.filter(is_default=True).first()
        if default_currency:
            serializer = self.get_serializer(default_currency)
            data = serializer.data
            data['is_locked'] = self._has_commercial_documents()
            return Response(data)
        return Response({'error': 'No default currency found'}, status=404)


class CoreSettingsView(APIView):
    """GET/PUT /api/core/settings/ — Paramètres système (singleton)."""

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAdminUser()]

    def get(self, request):
        obj = CoreSettings.load()
        serializer = CoreSettingsSerializer(obj)
        return Response(serializer.data)

    def put(self, request):
        obj = CoreSettings.load()
        serializer = CoreSettingsSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class EmailSettingsView(APIView):
    """GET/PUT /api/core/settings/email/ — Configuration SMTP (admin)."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        obj = EmailSettings.load()
        serializer = EmailSettingsSerializer(obj)
        return Response(serializer.data)

    def put(self, request):
        obj = EmailSettings.load()
        serializer = EmailSettingsSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class EmailTestView(APIView):
    """POST /api/core/settings/email/test/ — Envoi d'un email de test."""

    permission_classes = [IsAdminUser]

    def post(self, request):
        recipient = request.data.get('recipient', request.user.email)
        if not recipient:
            return Response(
                {'error': 'Aucune adresse email destinataire.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        es = EmailSettings.load()
        if not es.email_host:
            return Response(
                {'error': "Le serveur SMTP n'est pas configuré."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            connection = get_connection(
                host=es.email_host,
                port=es.email_port,
                username=es.email_host_user,
                password=es.email_host_password,
                use_tls=es.email_use_tls,
                fail_silently=False,
                timeout=15,
            )
            email = EmailMessage(
                subject='[Cleo ERP] Test de configuration email',
                body=(
                    'Ceci est un email de test envoyé depuis Cleo ERP.\n\n'
                    'Si vous recevez ce message, la configuration SMTP '
                    'est fonctionnelle.\n\n'
                    f'Serveur : {es.email_host}:{es.email_port}\n'
                    f'TLS : {"Oui" if es.email_use_tls else "Non"}'
                ),
                from_email=es.default_from_email or es.email_host_user,
                to=[recipient],
                connection=connection,
            )
            email.send()
            return Response(
                {
                    'status': 'success',
                    'message': f'Email de test envoyé à {recipient}',
                }
            )
        except Exception as e:
            logger.error(f'Email test failed: {e}')
            return Response(
                {'error': f"Échec de l'envoi : {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class SystemInfoView(APIView):
    """GET /api/core/system-info/ — Informations système (lecture seule, admin)."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        from django.contrib.auth.models import User

        from accounting.models import Account, Journal

        setup = CompanySetup.objects.first()

        # Espace disque média
        media_root = django_settings.MEDIA_ROOT
        media_size = 0
        if os.path.exists(media_root):
            for dirpath, dirnames, filenames in os.walk(media_root):
                for f in filenames:
                    fp = os.path.join(dirpath, f)
                    if os.path.isfile(fp):
                        media_size += os.path.getsize(fp)

        # Espace disque total du volume
        try:
            disk = shutil.disk_usage(media_root)
            disk_info = {
                'total_gb': round(disk.total / (1024**3), 2),
                'used_gb': round(disk.used / (1024**3), 2),
                'free_gb': round(disk.free / (1024**3), 2),
                'usage_percent': round(disk.used / disk.total * 100, 1),
            }
        except Exception:
            disk_info = None

        data = {
            'version': django_settings.VERSION,
            'locale_pack': setup.locale_pack if setup else None,
            'company_name': setup.company_name if setup else None,
            'is_locked': setup.is_locked if setup else False,
            'setup_date': setup.setup_date if setup else None,
            'accounts_count': Account.objects.count(),
            'journals_count': Journal.objects.count(),
            'users_count': User.objects.count(),
            'superusers_count': User.objects.filter(is_superuser=True).count(),
            'currencies_count': Currency.objects.count(),
            'media_size_mb': round(media_size / (1024**2), 2),
            'disk_info': disk_info,
            'debug_mode': django_settings.DEBUG,
            'python_version': None,
            'django_version': None,
        }

        # Versions techniques
        import sys

        import django

        data['python_version'] = sys.version.split()[0]
        data['django_version'] = django.get_version()

        return Response(data)


# ── Localization Packs — Setup API ───────────────────────────────────


class SetupStatusView(APIView):
    """GET /api/core/setup/status/ — Sans authentification."""

    permission_classes = [AllowAny]

    def get(self, request):
        setup = CompanySetup.objects.first()
        if setup:
            data = {
                'setup_completed': setup.setup_completed,
                'locale_pack': setup.locale_pack,
                'company_name': setup.company_name,
                'is_locked': setup.is_locked,
            }
        else:
            data = {
                'setup_completed': False,
                'locale_pack': None,
                'company_name': None,
                'is_locked': False,
            }
        serializer = SetupStatusSerializer(data)
        return Response(serializer.data)


class SetupPacksView(APIView):
    """GET /api/core/setup/packs/ — Sans authentification."""

    permission_classes = [AllowAny]

    def get(self, request):
        packs = list(AVAILABLE_PACKS.values())
        serializer = LocalePackInfoSerializer(packs, many=True)
        return Response(serializer.data)


class SetupCreateView(APIView):
    """POST /api/core/setup/ — Superuser requis."""

    permission_classes = [IsAdminUser]

    @transaction.atomic
    def post(self, request):
        existing = CompanySetup.objects.first()
        if existing and existing.setup_completed:
            if existing.is_locked:
                return Response(
                    {'error': 'Le setup est verrouillé. Impossible de le modifier.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            return Response(
                {'error': 'Le setup a déjà été effectué.'},
                status=status.HTTP_409_CONFLICT,
            )

        locale_pack = request.data.get('locale_pack')
        if locale_pack not in AVAILABLE_PACKS:
            return Response(
                {
                    'error': (
                        f'Pack inconnu : {locale_pack}. Disponibles : '
                        f'{list(AVAILABLE_PACKS.keys())}'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        pack_info = AVAILABLE_PACKS[locale_pack]
        install_demo = request.data.get('install_demo', False)

        data = request.data.copy()
        labels = pack_info['legal_id_labels']
        for i, label in enumerate(labels, start=1):
            data.setdefault(f'legal_id_{i}_label', label)
        for i in range(len(labels) + 1, 5):
            data.setdefault(f'legal_id_{i}_label', '')

        if existing:
            existing.delete()

        serializer = CompanySetupSerializer(data=data)
        serializer.is_valid(raise_exception=True)

        setup = CompanySetup(
            company_name=serializer.validated_data['company_name'],
            country_code=serializer.validated_data.get('country_code', locale_pack),
            locale_pack=locale_pack,
            address_line1=serializer.validated_data.get('address_line1', ''),
            address_line2=serializer.validated_data.get('address_line2', ''),
            city=serializer.validated_data.get('city', ''),
            postal_code=serializer.validated_data.get('postal_code', ''),
            country=serializer.validated_data.get('country', ''),
            phone=serializer.validated_data.get('phone', ''),
            email=serializer.validated_data.get('email', ''),
            website=serializer.validated_data.get('website', ''),
            bank_name=serializer.validated_data.get('bank_name', ''),
            bank_account=serializer.validated_data.get('bank_account', ''),
            bank_swift=serializer.validated_data.get('bank_swift', ''),
        )

        for i in range(1, 5):
            setattr(setup, f'legal_id_{i}_label', data.get(f'legal_id_{i}_label', ''))
            setattr(
                setup,
                f'legal_id_{i}_value',
                serializer.validated_data.get(f'legal_id_{i}_value', ''),
            )

        setup.save()

        try:
            result = self._load_locale_pack(locale_pack, install_demo)
        except Exception as e:
            logger.exception(f'Erreur lors du chargement du pack {locale_pack}')
            setup.delete()
            return Response(
                {'error': f'Erreur lors du chargement du pack : {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        setup.setup_completed = True
        setup.setup_date = timezone.now()
        setup.save()

        # Créer le BankAccount dans le module Sales
        if setup.bank_name and setup.bank_account:
            try:
                from sales.models import BankAccount

                pack_currencies = {'MA': 'MAD', 'OHADA': 'XOF', 'FR': 'EUR'}
                currency_code = pack_currencies.get(setup.locale_pack, 'MAD')
                currency = Currency.objects.filter(code=currency_code).first()
                if currency:
                    BankAccount.objects.get_or_create(
                        rib=setup.bank_account,
                        defaults={
                            'name': f'Compte Principal {currency_code}',
                            'bank_name': setup.bank_name,
                            'swift': setup.bank_swift or '',
                            'currency': currency,
                            'is_default': True,
                        },
                    )
            except Exception as e:
                logger.warning(f'Impossible de créer le compte bancaire: {e}')

        return Response(
            {
                'status': 'success',
                'message': f'Cleo ERP configuré avec succès — Pack {pack_info["name"]}',
                'details': result,
            },
            status=status.HTTP_201_CREATED,
        )

    def _load_locale_pack(self, locale_pack, install_demo=False):
        from accounting.services.init_accounting_service import InitAccountingService

        init_service = InitAccountingService(locale_pack=locale_pack, force=False)
        init_service.init_all()

        # ── Chargement des mappings de comptes (AccountMapping) ─────────
        try:
            import json as _json

            from accounting.models import Account, AccountMapping

            fixture_path = os.path.join(
                django_settings.BASE_DIR,
                'accounting',
                'fixtures',
                f'mappings_{locale_pack}.json',
            )
            if os.path.exists(fixture_path):
                with open(fixture_path, encoding='utf-8') as _f:
                    _mappings = _json.load(_f)
                _created = 0
                for item in _mappings:
                    _account = Account.objects.filter(code=item['account_code']).first()
                    if _account:
                        _, _is_new = AccountMapping.objects.update_or_create(
                            role=item['role'],
                            defaults={
                                'account': _account,
                                'description': item.get('description', ''),
                            },
                        )
                        if _is_new:
                            _created += 1
                logger.info(
                    f'AccountMapping: {_created} rôles créés pour le pack {locale_pack}'
                )
            else:
                logger.warning(
                    f'Aucun fichier de mappings trouvé pour le pack {locale_pack}: {fixture_path}'
                )
        except Exception as e:
            logger.warning(f'Mappings de comptes non chargés pour {locale_pack}: {e}')

        try:
            from django.core.management import call_command

            call_command('init_payroll_data', '--locale', locale_pack, '--force')
        except Exception as e:
            logger.warning(f'Paie non initialisée pour {locale_pack}: {e}')

        # ── Données de référence CRM (SalesStage, ActivityType) ────────
        try:
            from crm.models import ActivityType, SalesStage

            default_stages = [
                {
                    'name': 'Qualification',
                    'order': 1,
                    'probability': 10,
                    'color': '#1890ff',
                },
                {
                    'name': 'Proposition',
                    'order': 2,
                    'probability': 30,
                    'color': '#faad14',
                },
                {
                    'name': 'Négociation',
                    'order': 3,
                    'probability': 60,
                    'color': '#fa8c16',
                },
                {'name': 'Closing', 'order': 4, 'probability': 80, 'color': '#52c41a'},
                {
                    'name': 'Gagné',
                    'order': 5,
                    'probability': 100,
                    'is_won': True,
                    'color': '#389e0d',
                },
                {
                    'name': 'Perdu',
                    'order': 6,
                    'probability': 0,
                    'is_lost': True,
                    'color': '#f5222d',
                },
            ]
            for stage_data in default_stages:
                SalesStage.objects.get_or_create(
                    name=stage_data['name'],
                    defaults=stage_data,
                )

            default_activity_types = [
                {'name': 'Appel téléphonique', 'icon': 'phone', 'color': '#1890ff'},
                {'name': 'Email', 'icon': 'mail', 'color': '#52c41a'},
                {'name': 'Réunion', 'icon': 'team', 'color': '#faad14'},
                {'name': 'Rendez-vous', 'icon': 'calendar', 'color': '#722ed1'},
                {'name': 'Démo', 'icon': 'desktop', 'color': '#13c2c2'},
                {'name': 'Note interne', 'icon': 'file-text', 'color': '#8c8c8c'},
            ]
            for at_data in default_activity_types:
                ActivityType.objects.get_or_create(
                    name=at_data['name'],
                    defaults=at_data,
                )
        except Exception as e:
            logger.warning(f'Données CRM non initialisées: {e}')

        # ── Entrepôt par défaut ────────────────────────────────────────
        try:
            from inventory.models import Warehouse

            WAREHOUSE_DEFAULTS = {
                'MA': {
                    'code': 'DEP-001',
                    'name': 'Dépôt Principal',
                    'address': 'Casablanca, Maroc',
                },
                'OHADA': {
                    'code': 'DEP-001',
                    'name': 'Dépôt Principal',
                    'address': "Abidjan, Côte d'Ivoire",
                },
                'FR': {
                    'code': 'DEP-001',
                    'name': 'Entrepôt Principal',
                    'address': 'France',
                },
            }
            wh_data = WAREHOUSE_DEFAULTS.get(locale_pack, WAREHOUSE_DEFAULTS['FR'])
            Warehouse.objects.get_or_create(
                code=wh_data['code'],
                defaults={
                    'name': wh_data['name'],
                    'address': wh_data['address'],
                    'is_default': True,
                },
            )
        except Exception as e:
            logger.warning(f'Entrepôt par défaut non créé: {e}')

        demo_loaded = False
        if install_demo:
            try:
                demo_module = importlib.import_module(
                    f'accounting.fixtures.locales.demo.{locale_pack.lower()}'
                )
                if hasattr(demo_module, 'load_demo_data'):
                    demo_module.load_demo_data()
                    demo_loaded = True
            except (ImportError, ModuleNotFoundError):
                logger.info(f'Pas de données de démo pour le pack {locale_pack}')

        # ── Paramètres congés + types de congés ─────────────────────────────
        try:
            from decimal import Decimal as _D

            from hr.models import LeaveType
            from payroll.models import PayrollParameter

            LEAVE_PARAMS_BY_PACK = {
                'OHADA': [
                    ('LEAVE_ANNUAL_DAYS', _D('24')),
                    ('LEAVE_ACCRUAL_DAY', _D('1')),
                    ('LEAVE_SICK_DAYS_ANNUAL', _D('30')),
                    ('LEAVE_MATERNITY_DAYS', _D('98')),
                    ('LEAVE_PATERNITY_DAYS', _D('10')),
                    ('LEAVE_SENIORITY_THRESHOLD_1', _D('5')),
                    ('LEAVE_SENIORITY_BONUS_1', _D('2')),
                    ('LEAVE_SENIORITY_THRESHOLD_2', _D('10')),
                    ('LEAVE_SENIORITY_BONUS_2', _D('4')),
                    ('LEAVE_MAX_CARRY_DAYS', _D('0')),
                ],
                'MA': [
                    ('LEAVE_ANNUAL_DAYS', _D('18')),
                    ('LEAVE_ACCRUAL_DAY', _D('1')),
                    ('LEAVE_SICK_DAYS_ANNUAL', _D('30')),
                    ('LEAVE_MATERNITY_DAYS', _D('98')),
                    ('LEAVE_PATERNITY_DAYS', _D('3')),
                    ('LEAVE_SENIORITY_THRESHOLD_1', _D('5')),
                    ('LEAVE_SENIORITY_BONUS_1', _D('1')),
                    ('LEAVE_SENIORITY_THRESHOLD_2', _D('10')),
                    ('LEAVE_SENIORITY_BONUS_2', _D('2')),
                    ('LEAVE_MAX_CARRY_DAYS', _D('15')),
                ],
                'FR': [
                    ('LEAVE_ANNUAL_DAYS', _D('25')),
                    ('LEAVE_ACCRUAL_DAY', _D('1')),
                    ('LEAVE_SICK_DAYS_ANNUAL', _D('0')),
                    ('LEAVE_MATERNITY_DAYS', _D('112')),
                    ('LEAVE_PATERNITY_DAYS', _D('28')),
                    ('LEAVE_SENIORITY_THRESHOLD_1', _D('5')),
                    ('LEAVE_SENIORITY_BONUS_1', _D('2')),
                    ('LEAVE_SENIORITY_THRESHOLD_2', _D('10')),
                    ('LEAVE_SENIORITY_BONUS_2', _D('4')),
                    ('LEAVE_MAX_CARRY_DAYS', _D('0')),
                ],
            }
            for key, val in LEAVE_PARAMS_BY_PACK.get(locale_pack, []):
                PayrollParameter.objects.get_or_create(
                    pack=locale_pack, key=key, defaults={'value_decimal': val}
                )

            LEAVE_TYPES = [
                {
                    'code': 'ANNUAL',
                    'name': 'Congés payés annuels',
                    'is_paid': True,
                    'accrual_method': 'monthly',
                    'requires_document': False,
                    'color': '#1890ff',
                },
                {
                    'code': 'SICK',
                    'name': 'Congé maladie',
                    'is_paid': True,
                    'accrual_method': 'none',
                    'requires_document': True,
                    'color': '#fa8c16',
                },
                {
                    'code': 'MATERNITY',
                    'name': 'Congé maternité',
                    'is_paid': True,
                    'accrual_method': 'none',
                    'requires_document': True,
                    'color': '#eb2f96',
                },
                {
                    'code': 'PATERNITY',
                    'name': 'Congé paternité',
                    'is_paid': True,
                    'accrual_method': 'none',
                    'requires_document': True,
                    'color': '#722ed1',
                },
                {
                    'code': 'UNPAID',
                    'name': 'Congé sans solde',
                    'is_paid': False,
                    'accrual_method': 'none',
                    'requires_document': False,
                    'color': '#8c8c8c',
                },
                {
                    'code': 'BEREAVEMENT',
                    'name': 'Congé deuil',
                    'is_paid': True,
                    'accrual_method': 'none',
                    'requires_document': True,
                    'color': '#595959',
                },
            ]
            for lt in LEAVE_TYPES:
                LeaveType.objects.get_or_create(code=lt['code'], defaults=lt)

            logger.info(
                f'[SETUP] Paramètres congés et types chargés pour le pack {locale_pack}'
            )
        except Exception as e:
            logger.warning(f'Paramètres congés non initialisés pour {locale_pack}: {e}')

        from accounting.models import Account, Journal, Tax

        return {
            'accounts_created': Account.objects.count(),
            'taxes_created': Tax.objects.count(),
            'journals_created': Journal.objects.count(),
            'currencies_created': Currency.objects.count(),
            'demo_data': demo_loaded,
            'locale_pack': locale_pack,
        }


class CompanyInfoView(APIView):
    """GET/PUT /api/core/company/ — Infos entreprise post-setup."""

    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAdminUser()]

    def get(self, request):
        setup = CompanySetup.objects.first()
        if not setup or not setup.setup_completed:
            return Response(
                {'error': 'Setup non effectué'},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = CompanyInfoSerializer(setup)
        return Response(serializer.data)

    def put(self, request):
        setup = CompanySetup.objects.first()
        if not setup or not setup.setup_completed:
            return Response(
                {'error': 'Setup non effectué'},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = CompanyInfoSerializer(setup, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ── Recherche globale (v3.5.0) ───────────────────────────────────────


class GlobalSearchView(APIView):
    """
    GET /api/core/search/?q=renault&limit=20
    Recherche multi-modules avec résultats groupés.
    Respecte les permissions de l'utilisateur.
    """

    permission_classes = [IsAuthenticated]

    # Nombre max de résultats par module
    PER_MODULE = 5

    def _get_user_modules(self, user):
        """Retourne les modules accessibles par l'utilisateur."""
        if user.is_superuser:
            return None  # None = tous les modules
        accessible = set()
        for group in user.groups.all():
            try:
                role = group.role
                for mp in role.module_permissions.all():
                    if mp.access_level != 'no_access':
                        accessible.add(mp.module)
            except Exception:
                continue
        return accessible

    def _search_crm(self, q, limit):
        from crm.models import Company, Contact, Opportunity

        results = []

        for obj in Company.objects.filter(
            Q(name__icontains=q) | Q(email__icontains=q) | Q(phone__icontains=q)
        )[:limit]:
            results.append(
                {
                    'module': 'crm',
                    'type': 'Entreprise',
                    'id': obj.id,
                    'label': obj.name,
                    'url': f'/crm/companies/{obj.id}',
                }
            )

        for obj in Contact.objects.filter(
            Q(first_name__icontains=q)
            | Q(last_name__icontains=q)
            | Q(email__icontains=q)
        ).select_related('company')[:limit]:
            results.append(
                {
                    'module': 'crm',
                    'type': 'Contact',
                    'id': obj.id,
                    'label': f'{obj.first_name} {obj.last_name}',
                    'description': obj.company.name if obj.company else '',
                    'url': f'/crm/contacts/{obj.id}',
                }
            )

        for obj in Opportunity.objects.filter(Q(name__icontains=q)).select_related(
            'company'
        )[:limit]:
            results.append(
                {
                    'module': 'crm',
                    'type': 'Opportunité',
                    'id': obj.id,
                    'label': obj.name,
                    'description': obj.company.name if obj.company else '',
                    'url': f'/crm/opportunities/{obj.id}',
                }
            )

        return results

    def _search_sales(self, q, limit):
        from catalog.models import Product
        from sales.models import Invoice, Order, Quote

        results = []

        for obj in Product.objects.filter(
            Q(name__icontains=q) | Q(reference__icontains=q)
        )[:limit]:
            results.append(
                {
                    'module': 'sales',
                    'type': 'Produit',
                    'id': obj.id,
                    'label': f'{obj.reference} — {obj.name}',
                    'url': f'/sales/products/{obj.id}',
                }
            )

        for obj in Quote.objects.filter(
            Q(number__icontains=q) | Q(company__name__icontains=q)
        ).select_related('company')[:limit]:
            results.append(
                {
                    'module': 'sales',
                    'type': 'Devis',
                    'id': obj.id,
                    'label': obj.number,
                    'description': obj.company.name if obj.company else '',
                    'url': f'/sales/quotes/{obj.id}',
                }
            )

        for obj in Order.objects.filter(
            Q(number__icontains=q) | Q(company__name__icontains=q)
        ).select_related('company')[:limit]:
            results.append(
                {
                    'module': 'sales',
                    'type': 'Commande',
                    'id': obj.id,
                    'label': obj.number,
                    'description': obj.company.name if obj.company else '',
                    'url': f'/sales/orders/{obj.id}',
                }
            )

        for obj in Invoice.objects.filter(
            Q(number__icontains=q) | Q(company__name__icontains=q)
        ).select_related('company')[:limit]:
            results.append(
                {
                    'module': 'sales',
                    'type': 'Facture',
                    'id': obj.id,
                    'label': obj.number,
                    'description': obj.company.name if obj.company else '',
                    'url': f'/sales/invoices/{obj.id}',
                }
            )

        return results

    def _search_purchasing(self, q, limit):
        from purchasing.models import PurchaseOrder, Supplier, SupplierInvoice

        results = []

        for obj in Supplier.objects.filter(
            Q(name__icontains=q) | Q(code__icontains=q) | Q(email__icontains=q)
        )[:limit]:
            results.append(
                {
                    'module': 'purchasing',
                    'type': 'Fournisseur',
                    'id': obj.id,
                    'label': f'{obj.code} — {obj.name}',
                    'url': f'/purchasing/suppliers/{obj.id}',
                }
            )

        for obj in PurchaseOrder.objects.filter(
            Q(number__icontains=q) | Q(supplier__name__icontains=q)
        ).select_related('supplier')[:limit]:
            results.append(
                {
                    'module': 'purchasing',
                    'type': 'Bon de commande',
                    'id': obj.id,
                    'label': obj.number,
                    'description': obj.supplier.name,
                    'url': f'/purchasing/orders/{obj.id}',
                }
            )

        for obj in SupplierInvoice.objects.filter(
            Q(number__icontains=q)
            | Q(supplier__name__icontains=q)
            | Q(supplier_reference__icontains=q)
        ).select_related('supplier')[:limit]:
            results.append(
                {
                    'module': 'purchasing',
                    'type': 'Facture fournisseur',
                    'id': obj.id,
                    'label': obj.number,
                    'description': obj.supplier.name,
                    'url': f'/purchasing/invoices/{obj.id}',
                }
            )

        return results

    def _search_hr(self, q, limit):
        from hr.models import Employee

        results = []

        for obj in Employee.objects.filter(
            Q(first_name__icontains=q)
            | Q(last_name__icontains=q)
            | Q(employee_id__icontains=q)
        )[:limit]:
            results.append(
                {
                    'module': 'hr',
                    'type': 'Employé',
                    'id': obj.id,
                    'label': f'{obj.first_name} {obj.last_name}',
                    'description': obj.employee_id,
                    'url': f'/hr/employees/{obj.id}',
                }
            )

        return results

    def _search_inventory(self, q, limit):
        from inventory.models import Warehouse

        results = []

        for obj in Warehouse.objects.filter(
            Q(name__icontains=q) | Q(code__icontains=q)
        )[:limit]:
            results.append(
                {
                    'module': 'inventory',
                    'type': 'Entrepôt',
                    'id': obj.id,
                    'label': f'{obj.code} — {obj.name}',
                    'url': '/inventory/warehouses',
                }
            )

        return results

    def _search_accounting(self, q, limit):
        from accounting.models import Account, Journal

        results = []

        for obj in Account.objects.filter(Q(code__icontains=q) | Q(name__icontains=q))[
            :limit
        ]:
            results.append(
                {
                    'module': 'accounting',
                    'type': 'Compte',
                    'id': obj.id,
                    'label': f'{obj.code} — {obj.name}',
                    'url': f'/accounting/accounts/{obj.id}',
                }
            )

        for obj in Journal.objects.filter(Q(code__icontains=q) | Q(name__icontains=q))[
            :limit
        ]:
            results.append(
                {
                    'module': 'accounting',
                    'type': 'Journal',
                    'id': obj.id,
                    'label': f'{obj.code} — {obj.name}',
                    'url': f'/accounting/journals/{obj.id}',
                }
            )

        return results

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        if len(q) < 2:
            return Response({'results': [], 'query': q, 'total': 0})

        limit = min(int(request.query_params.get('limit', 20)), 50)
        per_module = self.PER_MODULE
        user_modules = self._get_user_modules(request.user)

        search_map = {
            'crm': self._search_crm,
            'sales': self._search_sales,
            'purchasing': self._search_purchasing,
            'hr': self._search_hr,
            'inventory': self._search_inventory,
            'accounting': self._search_accounting,
        }

        all_results = []
        for module_key, search_fn in search_map.items():
            # Vérifier les permissions
            if user_modules is not None and module_key not in user_modules:
                continue
            try:
                results = search_fn(q, per_module)
                all_results.extend(results)
            except Exception:
                continue

        return Response(
            {
                'results': all_results[:limit],
                'query': q,
                'total': len(all_results),
            }
        )


# ── Backup (v3.8.0) ──────────────────────────────────────────────────


class BackupListView(APIView):
    """
    GET  /api/core/backups/          → Liste des backups disponibles
    POST /api/core/backups/          → Déclencher un backup manuel
    """

    permission_classes = [IsAdminUser]

    def get(self, request):
        backup_dir = os.path.join(django_settings.MEDIA_ROOT, 'backups')
        backups = []

        if os.path.exists(backup_dir):
            import glob

            for filepath in sorted(
                glob.glob(os.path.join(backup_dir, 'cleo_db_*.sql.gz')),
                reverse=True,
            ):
                stat = os.stat(filepath)
                backups.append(
                    {
                        'filename': os.path.basename(filepath),
                        'size_mb': round(stat.st_size / (1024 * 1024), 2),
                        'created_at': timezone.datetime.fromtimestamp(
                            stat.st_mtime
                        ).isoformat(),
                    }
                )

        return Response(
            {
                'backups': backups,
                'count': len(backups),
                'backup_dir': backup_dir,
            }
        )

    def post(self, request):
        from core.tasks import backup_database_manual

        task = backup_database_manual.delay()
        return Response(
            {
                'status': 'started',
                'task_id': task.id,
                'message': 'Backup en cours. Rafraîchissez la liste dans quelques secondes.',
            },
            status=status.HTTP_202_ACCEPTED,
        )


class BackupDownloadView(APIView):
    """GET /api/core/backups/<filename>/download/ → Télécharger un backup."""

    permission_classes = [IsAdminUser]

    def get(self, request, filename):
        # Sécurité : empêcher le path traversal
        safe_filename = os.path.basename(filename)
        if not safe_filename.startswith('cleo_db_') or not safe_filename.endswith(
            '.sql.gz'
        ):
            return Response(
                {'error': 'Nom de fichier invalide'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        filepath = os.path.join(django_settings.MEDIA_ROOT, 'backups', safe_filename)

        if not os.path.exists(filepath):
            return Response(
                {'error': 'Fichier non trouvé'},
                status=status.HTTP_404_NOT_FOUND,
            )

        from django.http import FileResponse

        response = FileResponse(
            open(filepath, 'rb'),
            content_type='application/octet-stream',
        )
        response['Content-Disposition'] = f'attachment; filename="{safe_filename}"'
        return response


# ── Export RGPD (v3.9.0) ─────────────────────────────────────────────


class ExportRGPDView(APIView):
    """
    POST /api/core/export/
    Génère une archive ZIP contenant toutes les données de l'entreprise
    au format JSON (un fichier par module).
    Réservé aux administrateurs (obligation RGPD — droit à la portabilité).
    """

    permission_classes = [IsAdminUser]

    def post(self, request):
        buffer = BytesIO()
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

        with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            # ── Core ─────────────────────────────────────────────
            from core.models import CompanySetup, Currency

            zf.writestr(
                'core/currencies.json',
                self._serialize(
                    Currency.objects.all(),
                    [
                        'id',
                        'code',
                        'name',
                        'symbol',
                        'is_default',
                        'exchange_rate',
                        'decimal_places',
                        'symbol_position',
                    ],
                ),
            )
            zf.writestr(
                'core/company_setup.json',
                self._serialize(
                    CompanySetup.objects.all(),
                    [
                        'id',
                        'company_name',
                        'country_code',
                        'locale_pack',
                        'address_line1',
                        'city',
                        'postal_code',
                        'country',
                        'phone',
                        'email',
                        'website',
                        'bank_name',
                        'bank_account',
                    ],
                ),
            )

            # ── CRM ──────────────────────────────────────────────
            try:
                from crm.models import Activity, Contact, CRMCompany, Opportunity

                zf.writestr(
                    'crm/contacts.json',
                    self._serialize(
                        Contact.objects.all(),
                        [
                            'id',
                            'first_name',
                            'last_name',
                            'email',
                            'phone',
                            'mobile',
                            'job_title',
                            'created_at',
                        ],
                    ),
                )
                zf.writestr(
                    'crm/companies.json',
                    self._serialize(
                        CRMCompany.objects.all(),
                        [
                            'id',
                            'name',
                            'email',
                            'phone',
                            'website',
                            'industry',
                            'city',
                            'country',
                            'created_at',
                        ],
                    ),
                )
                zf.writestr(
                    'crm/opportunities.json',
                    self._serialize(
                        Opportunity.objects.all(),
                        [
                            'id',
                            'name',
                            'stage',
                            'amount',
                            'probability',
                            'expected_close_date',
                            'created_at',
                        ],
                    ),
                )
                zf.writestr(
                    'crm/activities.json',
                    self._serialize(
                        Activity.objects.all(),
                        [
                            'id',
                            'activity_type',
                            'subject',
                            'description',
                            'date',
                            'created_at',
                        ],
                    ),
                )
            except ImportError:
                pass

            # ── Ventes ───────────────────────────────────────────
            try:
                from sales.models import (
                    Invoice,
                    Order,
                    Payment,
                    Product,
                    Quote,
                )

                zf.writestr(
                    'sales/products.json',
                    self._serialize(
                        Product.objects.all(),
                        [
                            'id',
                            'reference',
                            'name',
                            'product_type',
                            'sale_price',
                            'cost_price',
                            'tax_rate',
                            'stock_alert_threshold',
                            'is_active',
                            'created_at',
                        ],
                    ),
                )
                zf.writestr(
                    'sales/quotes.json',
                    self._serialize(
                        Quote.objects.all(),
                        [
                            'id',
                            'number',
                            'state',
                            'total_ht',
                            'total_ttc',
                            'date',
                            'validity_date',
                            'created_at',
                        ],
                    ),
                )
                zf.writestr(
                    'sales/orders.json',
                    self._serialize(
                        Order.objects.all(),
                        [
                            'id',
                            'number',
                            'state',
                            'total_ht',
                            'total_ttc',
                            'date',
                            'created_at',
                        ],
                    ),
                )
                zf.writestr(
                    'sales/invoices.json',
                    self._serialize(
                        Invoice.objects.all(),
                        [
                            'id',
                            'number',
                            'state',
                            'payment_status',
                            'total_ht',
                            'total_ttc',
                            'amount_due',
                            'date',
                            'due_date',
                            'created_at',
                        ],
                    ),
                )
                zf.writestr(
                    'sales/payments.json',
                    self._serialize(
                        Payment.objects.all(),
                        [
                            'id',
                            'amount',
                            'payment_method',
                            'payment_date',
                            'reference',
                            'created_at',
                        ],
                    ),
                )
            except ImportError:
                pass

            # ── Achats ───────────────────────────────────────────
            try:
                from purchasing.models import (
                    PurchaseOrder,
                    Supplier,
                    SupplierInvoice,
                )

                zf.writestr(
                    'purchasing/suppliers.json',
                    self._serialize(
                        Supplier.objects.all(),
                        [
                            'id',
                            'name',
                            'email',
                            'phone',
                            'address',
                            'city',
                            'country',
                            'tax_id',
                            'is_active',
                            'created_at',
                        ],
                    ),
                )
                zf.writestr(
                    'purchasing/purchase_orders.json',
                    self._serialize(
                        PurchaseOrder.objects.all(),
                        [
                            'id',
                            'number',
                            'state',
                            'total_ht',
                            'total_ttc',
                            'date',
                            'expected_delivery_date',
                            'created_at',
                        ],
                    ),
                )
                zf.writestr(
                    'purchasing/supplier_invoices.json',
                    self._serialize(
                        SupplierInvoice.objects.all(),
                        [
                            'id',
                            'number',
                            'state',
                            'total_ht',
                            'total_ttc',
                            'date',
                            'due_date',
                            'created_at',
                        ],
                    ),
                )
            except ImportError:
                pass

            # ── Stocks ───────────────────────────────────────────
            try:
                from inventory.models import (
                    StockLevel,
                    StockMovement,
                    Warehouse,
                )

                zf.writestr(
                    'inventory/warehouses.json',
                    self._serialize(
                        Warehouse.objects.all(),
                        [
                            'id',
                            'name',
                            'code',
                            'address',
                            'is_active',
                            'created_at',
                        ],
                    ),
                )
                zf.writestr(
                    'inventory/stock_levels.json',
                    self._serialize(
                        StockLevel.objects.all(),
                        [
                            'id',
                            'quantity_on_hand',
                            'quantity_reserved',
                            'updated_at',
                        ],
                    ),
                )
                zf.writestr(
                    'inventory/stock_movements.json',
                    self._serialize(
                        StockMovement.objects.all(),
                        [
                            'id',
                            'movement_type',
                            'quantity',
                            'reference',
                            'date',
                            'created_at',
                        ],
                    ),
                )
            except ImportError:
                pass

            # ── RH ───────────────────────────────────────────────
            try:
                from hr.models import Department, Employee, Position

                zf.writestr(
                    'hr/departments.json',
                    self._serialize(
                        Department.objects.all(),
                        [
                            'id',
                            'name',
                            'code',
                            'created_at',
                        ],
                    ),
                )
                zf.writestr(
                    'hr/positions.json',
                    self._serialize(
                        Position.objects.all(),
                        [
                            'id',
                            'title',
                            'department_id',
                            'created_at',
                        ],
                    ),
                )
                zf.writestr(
                    'hr/employees.json',
                    self._serialize(
                        Employee.objects.all(),
                        [
                            'id',
                            'employee_id',
                            'first_name',
                            'last_name',
                            'email',
                            'phone',
                            'hire_date',
                            'status',
                            'created_at',
                        ],
                    ),
                )
            except ImportError:
                pass

            # ── Paie ─────────────────────────────────────────────
            try:
                from payroll.models import Payslip

                zf.writestr(
                    'payroll/payslips.json',
                    self._serialize(
                        Payslip.objects.all(),
                        [
                            'id',
                            'period',
                            'gross_salary',
                            'net_salary',
                            'total_deductions',
                            'state',
                            'created_at',
                        ],
                    ),
                )
            except ImportError:
                pass

            # ── Comptabilité ─────────────────────────────────────
            try:
                from accounting.models import Account, Journal, JournalEntry

                zf.writestr(
                    'accounting/accounts.json',
                    self._serialize(
                        Account.objects.all(),
                        [
                            'id',
                            'code',
                            'name',
                            'account_type',
                            'is_active',
                        ],
                    ),
                )
                zf.writestr(
                    'accounting/journals.json',
                    self._serialize(
                        Journal.objects.all(),
                        [
                            'id',
                            'code',
                            'name',
                            'journal_type',
                        ],
                    ),
                )
                zf.writestr(
                    'accounting/journal_entries.json',
                    self._serialize(
                        JournalEntry.objects.all(),
                        [
                            'id',
                            'number',
                            'date',
                            'description',
                            'total_debit',
                            'total_credit',
                            'state',
                            'created_at',
                        ],
                    ),
                )
            except ImportError:
                pass

            # ── Recrutement ──────────────────────────────────────
            try:
                from recruitment.models import Application, JobOffer

                zf.writestr(
                    'recruitment/job_offers.json',
                    self._serialize(
                        JobOffer.objects.all(),
                        [
                            'id',
                            'title',
                            'status',
                            'location',
                            'contract_type',
                            'published_date',
                            'created_at',
                        ],
                    ),
                )
                zf.writestr(
                    'recruitment/applications.json',
                    self._serialize(
                        Application.objects.all(),
                        [
                            'id',
                            'candidate_name',
                            'candidate_email',
                            'status',
                            'applied_date',
                            'created_at',
                        ],
                    ),
                )
            except ImportError:
                pass

            # ── Utilisateurs ─────────────────────────────────────
            from django.contrib.auth.models import User

            zf.writestr(
                'users/users.json',
                self._serialize(
                    User.objects.all(),
                    [
                        'id',
                        'username',
                        'email',
                        'first_name',
                        'last_name',
                        'is_active',
                        'is_staff',
                        'date_joined',
                        'last_login',
                    ],
                ),
            )

            # ── Notifications ────────────────────────────────────
            try:
                from notifications.models import Notification

                zf.writestr(
                    'notifications/notifications.json',
                    self._serialize(
                        Notification.objects.all(),
                        [
                            'id',
                            'level',
                            'title',
                            'message',
                            'module',
                            'is_read',
                            'created_at',
                        ],
                    ),
                )
            except ImportError:
                pass

            # ── Métadonnées ──────────────────────────────────────
            meta = {
                'export_date': datetime.now().isoformat(),
                'platform': 'Cleo ERP',
                'version': django_settings.VERSION,
                'export_type': 'RGPD — Portabilité des données (Art. 20)',
                'requested_by': request.user.username,
            }
            zf.writestr('metadata.json', json.dumps(meta, indent=2, default=str))

        buffer.seek(0)

        from django.http import FileResponse

        response = FileResponse(
            buffer,
            content_type='application/zip',
        )
        response['Content-Disposition'] = (
            f'attachment; filename="cleo_export_{timestamp}.zip"'
        )
        return response

    def _serialize(self, queryset, fields):
        """Sérialise un queryset en JSON avec les champs spécifiés."""
        data = []
        for obj in queryset:
            row = {}
            for field in fields:
                value = getattr(obj, field, None)
                if hasattr(value, 'isoformat'):
                    value = value.isoformat()
                elif hasattr(value, '__str__') and not isinstance(
                    value, (str, int, float, bool, type(None))
                ):
                    value = str(value)
                row[field] = value
            data.append(row)
        return json.dumps(data, indent=2, ensure_ascii=False, default=str)
