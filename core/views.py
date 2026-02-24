import importlib
import logging

from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Company, CompanySetup, CoreSettings, Currency
from .serializers import (
    CompanyInfoSerializer,
    CompanySerializer,
    CompanySetupSerializer,
    CoreSettingsSerializer,
    CurrencySerializer,
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
    permission_classes = [IsAuthenticated]

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

    @action(detail=False, methods=['get'])
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
    permission_classes = [IsAuthenticated]


class CoreSettingsViewSet(viewsets.ModelViewSet):
    queryset = CoreSettings.objects.all()
    serializer_class = CoreSettingsSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def current(self, request):
        settings = CoreSettings.objects.first()
        if settings:
            serializer = self.get_serializer(settings)
            return Response(serializer.data)
        return Response({'error': 'No settings found'}, status=404)


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
                    'error': f'Pack inconnu : {locale_pack}. Disponibles : {list(AVAILABLE_PACKS.keys())}'
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
                    f'accounting.fixtures.demo.{locale_pack.lower()}'
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
