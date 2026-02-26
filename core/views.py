import importlib
import logging
import os
import shutil

from django.conf import settings as django_settings
from django.core.mail import EmailMessage, get_connection
from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import HasModulePermission

from .models import Company, CompanySetup, CoreSettings, Currency, EmailSettings
from .serializers import (
    CompanyInfoSerializer,
    CompanySerializer,
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
        'legal_id_labels': ['RCCM', 'CC', 'NIF'],
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


class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated, HasModulePermission]
    module_name = 'core'


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

        try:
            payroll_module = importlib.import_module(
                f'payroll.fixtures.locales.{locale_pack.lower()}'
            )
            if hasattr(payroll_module, 'load_payroll_data'):
                payroll_module.load_payroll_data()
        except (ImportError, ModuleNotFoundError):
            try:
                from django.core.management import call_command

                call_command('init_payroll_data')
            except Exception:
                logger.info(f'Pas de données de paie pour le pack {locale_pack}')

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
