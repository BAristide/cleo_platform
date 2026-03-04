from datetime import datetime, timedelta
from decimal import Decimal

from django.db.models import Q, Sum
from django.http import HttpResponse
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import HasModulePermission, module_permission_required

from .models import (
    Account,
    AccountType,
    AnalyticAccount,
    Asset,
    AssetCategory,
    AssetDepreciation,
    BankStatement,
    BankStatementLine,
    FiscalPeriod,
    FiscalYear,
    Journal,
    JournalEntry,
    JournalEntryLine,
    Reconciliation,
    Tax,
)
from .serializers import (
    AccountDetailSerializer,
    AccountSerializer,
    AccountTypeSerializer,
    AnalyticAccountSerializer,
    AssetCategorySerializer,
    AssetDepreciationSerializer,
    AssetDetailSerializer,
    AssetSerializer,
    BankStatementDetailSerializer,
    BankStatementSerializer,
    FiscalPeriodSerializer,
    FiscalYearSerializer,
    JournalEntryCreateSerializer,
    JournalEntryDetailSerializer,
    JournalEntrySerializer,
    JournalSerializer,
    ReconciliationDetailSerializer,
    ReconciliationSerializer,
    TaxSerializer,
)
from .services.export_service import ImportExportService
from .services.financial_report_service import FinancialReportService

# API Viewsets


class AccountTypeViewSet(viewsets.ModelViewSet):
    """API pour les types de comptes comptables."""

    queryset = AccountType.objects.all()
    serializer_class = AccountTypeSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'accounting'
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    search_fields = ['code', 'name']
    ordering_fields = ['sequence', 'code', 'name']
    ordering = ['sequence', 'code']


class AccountViewSet(viewsets.ModelViewSet):
    """API pour les comptes comptables."""

    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'accounting'
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ['type_id', 'is_active', 'is_reconcilable', 'is_tax_account']
    search_fields = ['code', 'name', 'description']
    ordering_fields = ['code', 'name']
    ordering = ['code']

    def get_serializer_class(self):
        if self.action in ['retrieve', 'create', 'update', 'partial_update']:
            return AccountDetailSerializer
        return AccountSerializer

    @action(detail=True)
    def balance(self, request, pk=None):
        """Retourne le solde du compte."""
        account = self.get_object()

        # Récupérer les dates de la requête
        start_date = request.query_params.get('start_date', None)
        end_date = request.query_params.get('end_date', None)

        # Calculer le solde
        balance = account.get_balance(start_date=start_date, end_date=end_date)

        # Convertir au format float pour éviter les problèmes de sérialisation
        return Response({'account_id': account.id, 'balance': float(balance)})

    @action(detail=False)
    def chart_of_accounts(self, request):
        """Retourne le plan comptable structuré."""
        # Récupérer tous les comptes racines (sans parent)
        root_accounts = Account.objects.filter(
            parent_id__isnull=True, is_active=True
        ).order_by('code')

        # Sérialiser les comptes racines avec leurs enfants
        serializer = AccountDetailSerializer(
            root_accounts, many=True, context={'request': request}
        )

        return Response(serializer.data)


class JournalViewSet(viewsets.ModelViewSet):
    """API pour les journaux comptables."""

    queryset = Journal.objects.all()
    serializer_class = JournalSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'accounting'
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ['type', 'active']
    search_fields = ['code', 'name']
    ordering_fields = ['code', 'name']
    ordering = ['code']

    @action(detail=True)
    def next_sequence(self, request, pk=None):
        """Retourne le prochain numéro de séquence du journal."""
        journal = self.get_object()

        # Récupérer la date de la requête
        date_str = request.query_params.get('date', None)
        if date_str:
            try:
                entry_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'error': _('Format de date invalide')},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            entry_date = timezone.now().date()

        # Générer le prochain numéro
        next_sequence = journal.next_sequence(date=entry_date)

        return Response({'next_sequence': next_sequence})


class JournalEntryViewSet(viewsets.ModelViewSet):
    """API pour les écritures comptables."""

    queryset = JournalEntry.objects.all()
    serializer_class = JournalEntrySerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'accounting'
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ['journal_id', 'state', 'is_manual', 'date', 'period_id']
    search_fields = ['name', 'ref', 'narration']
    ordering_fields = ['date', 'journal_id', 'name']
    ordering = ['-date', 'journal_id', 'name']

    def get_serializer_class(self):
        if self.action == 'create':
            return JournalEntryCreateSerializer
        if self.action in ['retrieve', 'update', 'partial_update']:
            return JournalEntryDetailSerializer
        return JournalEntrySerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filtrer par date
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)

        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        return queryset

    @action(detail=True, methods=['post'])
    def post_entry(self, request, pk=None):
        """Valide une écriture comptable."""
        entry = self.get_object()

        if entry.state != 'draft':
            return Response(
                {'success': False, 'message': _("L'écriture n'est pas en brouillon")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            entry.post()
            return Response(
                {'success': True, 'message': _('Écriture validée avec succès')}
            )
        except Exception as e:
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=['post'])
    def cancel_entry(self, request, pk=None):
        """Annule une écriture comptable."""
        entry = self.get_object()

        if entry.state != 'posted':
            return Response(
                {'success': False, 'message': _("L'écriture n'est pas validée")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            entry.cancel()
            return Response(
                {'success': True, 'message': _('Écriture annulée avec succès')}
            )
        except Exception as e:
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=['post'])
    def duplicate_entry(self, request, pk=None):
        """Duplique une écriture comptable."""
        entry = self.get_object()

        # Créer une nouvelle écriture avec les mêmes données
        new_entry = JournalEntry.objects.create(
            journal_id=entry.journal_id,
            date=request.data.get('date', timezone.now().date()),
            ref=request.data.get('ref', entry.ref),
            narration=entry.narration,
            is_manual=True,
            created_by=request.user,
        )

        # Déterminer la période fiscale
        try:
            period = FiscalPeriod.objects.get(
                start_date__lte=new_entry.date,
                end_date__gte=new_entry.date,
                state='open',
            )
            new_entry.period_id = period
            new_entry.save(update_fields=['period_id'])
        except FiscalPeriod.DoesNotExist:
            new_entry.delete()
            return Response(
                {
                    'success': False,
                    'message': _('Aucune période fiscale ouverte pour cette date'),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Dupliquer les lignes
        for line in entry.lines.all():
            JournalEntryLine.objects.create(
                entry_id=new_entry,
                account_id=line.account_id,
                name=line.name,
                partner_id=line.partner_id,
                debit=line.debit,
                credit=line.credit,
                date=new_entry.date,
                date_maturity=line.date_maturity,
                ref=line.ref,
                analytic_account_id=line.analytic_account_id,
            )

        serializer = JournalEntryDetailSerializer(new_entry)
        return Response(serializer.data)


class FiscalYearViewSet(viewsets.ModelViewSet):
    """API pour les exercices fiscaux."""

    queryset = FiscalYear.objects.all()
    serializer_class = FiscalYearSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'accounting'
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ['state']
    search_fields = ['name']
    ordering_fields = ['start_date', 'end_date', 'name']
    ordering = ['-start_date']

    @action(detail=True, methods=['post'])
    def open(self, request, pk=None):
        """Ouvre un exercice fiscal."""
        year = self.get_object()

        if year.state != 'draft':
            return Response(
                {'success': False, 'message': _("L'exercice n'est pas en brouillon")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        year.state = 'open'
        year.save(update_fields=['state'])

        return Response({'success': True, 'message': _('Exercice ouvert avec succès')})

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """Clôture un exercice fiscal."""
        year = self.get_object()

        if year.state != 'open':
            return Response(
                {'success': False, 'message': _("L'exercice n'est pas ouvert")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Vérifier si toutes les périodes sont clôturées
        if year.periods.filter(state='open').exists():
            return Response(
                {
                    'success': False,
                    'message': _('Toutes les périodes doivent être clôturées'),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        year.state = 'closed'
        year.save(update_fields=['state'])

        return Response({'success': True, 'message': _('Exercice clôturé avec succès')})

    @action(detail=True, methods=['post'])
    def create_periods(self, request, pk=None):
        """Crée les périodes fiscales pour un exercice."""
        year = self.get_object()

        # Supprimer les périodes existantes si demandé
        if request.data.get('reset', False):
            year.periods.all().delete()

        # Créer les périodes
        year.create_periods()

        # Récupérer les périodes créées
        periods = year.periods.all()
        serializer = FiscalPeriodSerializer(periods, many=True)

        return Response(
            {
                'success': True,
                'message': _('{} périodes créées').format(len(serializer.data)),
                'periods': serializer.data,
            }
        )


class FiscalPeriodViewSet(viewsets.ModelViewSet):
    """API pour les périodes fiscales."""

    queryset = FiscalPeriod.objects.all()
    serializer_class = FiscalPeriodSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'accounting'
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ['fiscal_year', 'state']
    search_fields = ['name']
    ordering_fields = ['start_date', 'end_date', 'name']
    ordering = ['start_date']

    @action(detail=True, methods=['post'])
    def open(self, request, pk=None):
        """Ouvre une période fiscale."""
        period = self.get_object()

        if period.state != 'draft':
            return Response(
                {'success': False, 'message': _("La période n'est pas en brouillon")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Vérifier si l'exercice est ouvert
        if period.fiscal_year.state != 'open':
            return Response(
                {'success': False, 'message': _("L'exercice n'est pas ouvert")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        period.state = 'open'
        period.save(update_fields=['state'])

        return Response({'success': True, 'message': _('Période ouverte avec succès')})

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """Clôture une période fiscale."""
        period = self.get_object()

        if period.state != 'open':
            return Response(
                {'success': False, 'message': _("La période n'est pas ouverte")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        period.state = 'closed'
        period.save(update_fields=['state'])

        return Response({'success': True, 'message': _('Période clôturée avec succès')})


class ReconciliationViewSet(viewsets.ModelViewSet):
    """API pour les lettrages comptables."""

    queryset = Reconciliation.objects.all()
    serializer_class = ReconciliationSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'accounting'
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ['account_id']
    search_fields = ['name']
    ordering_fields = ['date', 'name']
    ordering = ['-date', 'name']

    def get_serializer_class(self):
        if self.action in ['retrieve', 'create', 'update', 'partial_update']:
            return ReconciliationDetailSerializer
        return ReconciliationSerializer

    def perform_create(self, serializer):
        """Personnalisation de la création d'un lettrage."""
        # Enregistrer l'utilisateur qui crée le lettrage
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['post'])
    def reconcile_lines(self, request):
        """Lettre des lignes d'écritures."""
        # Récupérer les lignes à lettrer
        line_ids = request.data.get('line_ids', [])
        if not line_ids:
            return Response(
                {'success': False, 'message': _('Aucune ligne à lettrer')},
                status=status.HTTP_400_BAD_REQUEST,
            )

        lines = JournalEntryLine.objects.filter(id__in=line_ids)

        # Vérifier que toutes les lignes sont du même compte
        account_ids = lines.values_list('account_id', flat=True).distinct()
        if len(account_ids) != 1:
            return Response(
                {
                    'success': False,
                    'message': _('Les lignes doivent être du même compte'),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Vérifier que le compte est lettrable
        account = Account.objects.get(id=account_ids[0])
        if not account.is_reconcilable:
            return Response(
                {'success': False, 'message': _("Le compte n'est pas lettrable")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Vérifier que les lignes ne sont pas déjà lettrées
        if lines.filter(is_reconciled=True).exists():
            return Response(
                {'success': False, 'message': _('Certaines lignes sont déjà lettrées')},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Vérifier que le solde est proche de zéro
        debit_sum = lines.aggregate(sum=Sum('debit'))['sum'] or 0
        credit_sum = lines.aggregate(sum=Sum('credit'))['sum'] or 0
        balance = debit_sum - credit_sum

        # Tolérance: 0.01 unités monétaires
        if abs(balance) > 0.01:
            return Response(
                {
                    'success': False,
                    'message': _("Le solde n'est pas équilibré"),
                    'balance': balance,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Créer le lettrage
        reconciliation = Reconciliation.objects.create(
            name=f'R-{timezone.now().strftime("%Y%m%d%H%M%S")}',
            date=timezone.now().date(),
            account_id=account,
            created_by=request.user,
        )

        # Mettre à jour les lignes
        lines.update(is_reconciled=True, reconciliation_id=reconciliation)

        return Response(
            {
                'success': True,
                'message': _('{} lignes lettrées').format(lines.count()),
                'reconciliation': ReconciliationSerializer(reconciliation).data,
            }
        )

    @action(detail=True, methods=['post'])
    def unreconcile(self, request, pk=None):
        """Annule un lettrage."""
        reconciliation = self.get_object()

        # Récupérer les lignes lettrées
        lines = reconciliation.reconciled_lines.all()

        # Mettre à jour les lignes
        count = lines.count()
        lines.update(is_reconciled=False, reconciliation_id=None)

        # Supprimer le lettrage
        reconciliation.delete()

        return Response(
            {'success': True, 'message': _('{} lignes délettrées').format(count)}
        )


class BankStatementViewSet(viewsets.ModelViewSet):
    """API pour les relevés bancaires."""

    queryset = BankStatement.objects.all()
    serializer_class = BankStatementSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'accounting'
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ['journal_id', 'state']
    search_fields = ['name', 'reference']
    ordering_fields = ['date', 'name']
    ordering = ['-date', 'name']

    def get_serializer_class(self):
        if self.action in ['retrieve', 'create', 'update', 'partial_update']:
            return BankStatementDetailSerializer
        return BankStatementSerializer

    def perform_create(self, serializer):
        """Personnalisation de la création d'un relevé bancaire."""
        # Enregistrer l'utilisateur qui crée le relevé
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """Confirme un relevé bancaire."""
        statement = self.get_object()

        if statement.state != 'open':
            return Response(
                {'success': False, 'message': _("Le relevé n'est pas en cours")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        statement.state = 'confirm'
        statement.save(update_fields=['state'])

        return Response({'success': True, 'message': _('Relevé confirmé avec succès')})

    @action(detail=True, methods=['post'])
    def import_from_csv(self, request, pk=None):
        """Importe un relevé bancaire depuis un fichier CSV."""
        statement = self.get_object()

        if statement.state != 'draft':
            return Response(
                {'success': False, 'message': _("Le relevé n'est pas en brouillon")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Récupérer le fichier
        csv_file = request.FILES.get('file')
        if not csv_file:
            return Response(
                {'success': False, 'message': _('Aucun fichier fourni')},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Traiter le fichier
        try:
            # Lire les lignes du CSV et les ajouter au relevé
            import csv
            from io import StringIO

            # Décoder le fichier
            content = csv_file.read().decode('utf-8')

            # Analyser le CSV
            csv_data = csv.reader(StringIO(content), delimiter=',')
            next(csv_data)  # Ignorer l'en-tête

            # Créer les lignes
            lines_created = 0
            for row in csv_data:
                try:
                    date_str, ref, label, amount_str = row
                    date = datetime.strptime(date_str, '%d/%m/%Y').date()
                    amount = Decimal(amount_str.replace(',', '.'))

                    BankStatementLine.objects.create(
                        statement_id=statement,
                        date=date,
                        ref=ref,
                        name=label,
                        amount=amount,
                    )
                    lines_created += 1
                except Exception:
                    # Ignorer les lignes mal formées
                    continue

            # Calculer le solde final
            if lines_created > 0:
                statement.balance_end = statement.balance_start + sum(
                    line.amount for line in statement.lines.all()
                )
                statement.save(update_fields=['balance_end'])

            return Response(
                {
                    'success': True,
                    'message': _('{} lignes importées').format(lines_created),
                }
            )
        except Exception as e:
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=['post'])
    def import_from_ofx(self, request, pk=None):
        """Importe un relevé bancaire depuis un fichier OFX/QFX."""
        statement = self.get_object()

        if statement.state != 'draft':
            return Response(
                {
                    'success': False,
                    'message': 'Le relevé doit être en brouillon pour importer',
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        ofx_file = request.FILES.get('file')
        if not ofx_file:
            return Response(
                {'success': False, 'message': 'Aucun fichier fourni'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from io import BytesIO

            from ofxtools.Parser import OFXTree

            raw = ofx_file.read()
            parser = OFXTree()
            parser.parse(BytesIO(raw))
            ofx = parser.convert()

            lines_created = 0
            duplicates_skipped = 0

            for stmt in ofx.statements:
                for txn in stmt.transactions:
                    # Dédoublonnage par fitid (identifiant unique OFX)
                    if (
                        txn.fitid
                        and BankStatementLine.objects.filter(
                            statement_id=statement,
                            ref=txn.fitid,
                        ).exists()
                    ):
                        duplicates_skipped += 1
                        continue

                    txn_date = txn.dtposted
                    if hasattr(txn_date, 'date'):
                        txn_date = txn_date.date()

                    BankStatementLine.objects.create(
                        statement_id=statement,
                        date=txn_date,
                        name=txn.memo or txn.name or 'Transaction OFX',
                        ref=txn.fitid or '',
                        amount=txn.trnamt,
                    )
                    lines_created += 1

            # Recalculer le solde final
            if lines_created > 0:
                total = sum(line.amount for line in statement.lines.all())
                statement.balance_end = statement.balance_start + total
                statement.save(update_fields=['balance_end'])

            msg = f'{lines_created} lignes importées'
            if duplicates_skipped:
                msg += f', {duplicates_skipped} doublons ignorés'

            return Response(
                {
                    'success': True,
                    'message': msg,
                    'lines_created': lines_created,
                    'duplicates_skipped': duplicates_skipped,
                }
            )

        except Exception as e:
            return Response(
                {'success': False, 'message': f'Erreur import OFX: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=['post'])
    def auto_reconcile(self, request, pk=None):
        """Rapprochement automatique des lignes du relevé."""
        statement = self.get_object()

        if statement.state == 'confirm':
            return Response(
                {
                    'success': False,
                    'message': 'Impossible de modifier un relevé confirmé',
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        from accounting.services.reconciliation_service import BankReconciliationService

        service = BankReconciliationService()
        reconciled_count = service.auto_reconcile(statement)

        return Response(
            {
                'success': True,
                'message': f'{reconciled_count} lignes rapprochées automatiquement',
                'reconciled_count': reconciled_count,
            }
        )

    @action(
        detail=True, methods=['post'], url_path='lines/(?P<line_id>[0-9]+)/suggestions'
    )
    def line_suggestions(self, request, pk=None, line_id=None):
        """Suggestions de rapprochement pour une ligne donnée."""
        statement = self.get_object()

        try:
            line = statement.lines.get(id=line_id)
        except BankStatementLine.DoesNotExist:
            return Response(
                {'success': False, 'message': 'Ligne non trouvée'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if line.is_reconciled:
            return Response(
                {'success': False, 'message': 'Ligne déjà rapprochée'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from accounting.services.reconciliation_service import BankReconciliationService

        service = BankReconciliationService()
        account_ids = service.get_bank_account_ids(statement)
        suggestions = service.get_suggestions(line, account_ids)

        return Response(
            {
                'success': True,
                'suggestions': suggestions,
                'statement_line': {
                    'id': line.id,
                    'date': line.date.isoformat(),
                    'name': line.name,
                    'ref': line.ref,
                    'amount': float(line.amount),
                    'partner_name': line.partner_id.name if line.partner_id else None,
                },
            }
        )

    @action(
        detail=True, methods=['post'], url_path='lines/(?P<line_id>[0-9]+)/reconcile'
    )
    def reconcile_line(self, request, pk=None, line_id=None):
        """Rapproche une ligne de relevé avec des lignes d'écritures sélectionnées."""
        statement = self.get_object()

        if statement.state == 'confirm':
            return Response(
                {
                    'success': False,
                    'message': 'Impossible de modifier un relevé confirmé',
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            line = statement.lines.get(id=line_id)
        except BankStatementLine.DoesNotExist:
            return Response(
                {'success': False, 'message': 'Ligne non trouvée'},
                status=status.HTTP_404_NOT_FOUND,
            )

        entry_line_ids = request.data.get('entry_line_ids', [])
        if not entry_line_ids:
            return Response(
                {'success': False, 'message': "Aucune ligne d'écriture sélectionnée"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from accounting.services.reconciliation_service import BankReconciliationService

        service = BankReconciliationService()

        try:
            service.reconcile_line(line, entry_line_ids)
            return Response(
                {
                    'success': True,
                    'message': 'Ligne rapprochée avec succès',
                }
            )
        except ValueError as e:
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(
        detail=True, methods=['post'], url_path='lines/(?P<line_id>[0-9]+)/unreconcile'
    )
    def unreconcile_line(self, request, pk=None, line_id=None):
        """Annule le rapprochement d'une ligne de relevé."""
        statement = self.get_object()

        if statement.state == 'confirm':
            return Response(
                {
                    'success': False,
                    'message': 'Impossible de modifier un relevé confirmé',
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            line = statement.lines.get(id=line_id)
        except BankStatementLine.DoesNotExist:
            return Response(
                {'success': False, 'message': 'Ligne non trouvée'},
                status=status.HTTP_404_NOT_FOUND,
            )

        from accounting.services.reconciliation_service import BankReconciliationService

        service = BankReconciliationService()
        service.unreconcile_line(line)

        return Response(
            {
                'success': True,
                'message': 'Rapprochement annulé',
            }
        )


class AnalyticAccountViewSet(viewsets.ModelViewSet):
    """API pour les comptes analytiques."""

    queryset = AnalyticAccount.objects.all()
    serializer_class = AnalyticAccountSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'accounting'
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ['active']
    search_fields = ['code', 'name']
    ordering_fields = ['code', 'name']
    ordering = ['code']


class TaxViewSet(viewsets.ModelViewSet):
    """API pour les taxes."""

    queryset = Tax.objects.all()
    serializer_class = TaxSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'accounting'
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ['type', 'tax_category', 'active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'amount']
    ordering = ['name']


class AssetCategoryViewSet(viewsets.ModelViewSet):
    """API pour les catégories d'immobilisations."""

    queryset = AssetCategory.objects.all()
    serializer_class = AssetCategorySerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'accounting'
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ['method']
    search_fields = ['name']
    ordering_fields = ['name', 'duration_years']
    ordering = ['name']


class AssetViewSet(viewsets.ModelViewSet):
    """API pour les immobilisations."""

    queryset = Asset.objects.all()
    serializer_class = AssetSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'accounting'
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ['category_id', 'state']
    search_fields = ['code', 'name']
    ordering_fields = ['code', 'name', 'acquisition_date']
    ordering = ['code']

    def get_serializer_class(self):
        if self.action in ['retrieve', 'create', 'update', 'partial_update']:
            return AssetDetailSerializer
        return AssetSerializer

    @action(detail=True, methods=['post'])
    def compute_depreciation(self, request, pk=None):
        """Calcule le tableau d'amortissement d'une immobilisation."""
        asset = self.get_object()

        try:
            asset.compute_depreciation_board()
            return Response(
                {
                    'success': True,
                    'message': _("Tableau d'amortissement calculé avec succès"),
                    'depreciation_lines': AssetDepreciationSerializer(
                        asset.depreciation_lines.all(), many=True
                    ).data,
                }
            )
        except Exception as e:
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=['post'])
    def post_depreciation(self, request, pk=None):
        """Comptabilise une dotation aux amortissements."""
        asset = self.get_object()

        # Récupérer la ligne d'amortissement à comptabiliser
        depreciation_id = request.data.get('depreciation_id')
        if not depreciation_id:
            return Response(
                {'success': False, 'message': _('Identifiant de dotation manquant')},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            depreciation = AssetDepreciation.objects.get(
                id=depreciation_id, asset_id=asset
            )
        except AssetDepreciation.DoesNotExist:
            return Response(
                {'success': False, 'message': _('Dotation introuvable')},
                status=status.HTTP_404_NOT_FOUND,
            )

        if depreciation.state != 'draft':
            return Response(
                {'success': False, 'message': _("La dotation n'est pas en brouillon")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Créer l'écriture comptable
        try:
            # Déterminer la période fiscale
            try:
                period = FiscalPeriod.objects.get(
                    start_date__lte=depreciation.date,
                    end_date__gte=depreciation.date,
                    state='open',
                )
            except FiscalPeriod.DoesNotExist:
                return Response(
                    {
                        'success': False,
                        'message': _('Aucune période fiscale ouverte pour cette date'),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Créer l'écriture
            entry = JournalEntry.objects.create(
                journal_id=Journal.objects.get(
                    code='OD'
                ),  # Journal des opérations diverses
                name=Journal.objects.get(code='OD').next_sequence(depreciation.date),
                date=depreciation.date,
                period_id=period,
                ref=f'DOTATION-{asset.code}',
                narration=f'Dotation aux amortissements - {asset.name}',
                source_module='accounting',
                source_model='AssetDepreciation',
                source_id=depreciation.id,
                is_manual=False,
                created_by=request.user,
            )

            # Créer les lignes
            JournalEntryLine.objects.create(
                entry_id=entry,
                account_id=asset.category_id.account_expense_id,
                name=f'Dotation aux amortissements - {asset.name}',
                debit=depreciation.amount,
                credit=0,
                date=entry.date,
            )

            JournalEntryLine.objects.create(
                entry_id=entry,
                account_id=asset.category_id.account_depreciation_id,
                name=f'Dotation aux amortissements - {asset.name}',
                debit=0,
                credit=depreciation.amount,
                date=entry.date,
            )

            # Valider l'écriture
            entry.post()

            # Mettre à jour la dotation
            depreciation.move_id = entry
            depreciation.state = 'posted'
            depreciation.save(update_fields=['move_id', 'state'])

            return Response(
                {
                    'success': True,
                    'message': _('Dotation comptabilisée avec succès'),
                    'entry': JournalEntrySerializer(entry).data,
                }
            )
        except Exception as e:
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )


class AssetDepreciationViewSet(viewsets.ModelViewSet):
    """ViewSet pour les dotations aux amortissements."""

    queryset = AssetDepreciation.objects.all().order_by('date')
    serializer_class = AssetDepreciationSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'accounting'
    filterset_fields = ['asset_id', 'state']
    search_fields = ['name']

    @action(detail=True, methods=['post'])
    def post(self, request, pk=None):
        """Comptabiliser une dotation."""
        depreciation = self.get_object()
        if depreciation.state != 'draft':
            return Response(
                {'success': False, 'message': 'La dotation n est pas en brouillon'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        depreciation.state = 'posted'
        depreciation.save()
        return Response({'success': True})


# Vues pour le Dashboard et les rapports
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
@module_permission_required('accounting')
def dashboard_view(request):
    """Vue du tableau de bord comptable avec les indicateurs clés."""
    # Période par défaut: l'année en cours
    today = timezone.now().date()
    start_date = request.query_params.get(
        'start_date', datetime(today.year, 1, 1).date().isoformat()
    )
    end_date = request.query_params.get('end_date', today.isoformat())

    # Comptes importants
    bank_balance = Decimal(0)
    customer_balance = Decimal(0)
    supplier_balance = Decimal(0)
    vat_balance = Decimal(0)

    # Banque: compte 514xxx
    bank_accounts = Account.objects.filter(code__startswith='514')
    for account in bank_accounts:
        bank_balance += account.get_balance(end_date=end_date)

    # Clients: compte 411xxx
    customer_accounts = Account.objects.filter(code__startswith='411')
    for account in customer_accounts:
        customer_balance += account.get_balance(end_date=end_date)

    # Fournisseurs: compte 401xxx
    supplier_accounts = Account.objects.filter(code__startswith='401')
    for account in supplier_accounts:
        supplier_balance += account.get_balance(end_date=end_date)

    # TVA: comptes 4455xx (TVA à décaisser) et 4456xx (TVA à payer)
    vat_collected_accounts = Account.objects.filter(
        Q(code__startswith='4455') | Q(code__startswith='4456')
    )
    for account in vat_collected_accounts:
        vat_balance += account.get_balance(end_date=end_date)

    # TVA: comptes 4455xx (TVA déductible)
    vat_deductible_accounts = Account.objects.filter(code__startswith='3455')
    for account in vat_deductible_accounts:
        vat_balance -= account.get_balance(end_date=end_date)

    # Statistiques mensuelles
    month_stats = []
    start_month = datetime.strptime(start_date, '%Y-%m-%d').date().replace(day=1)
    end_month = datetime.strptime(end_date, '%Y-%m-%d').date().replace(day=1)

    current_month = start_month
    while current_month <= end_month:
        month_end = (current_month.replace(day=28) + timedelta(days=4)).replace(
            day=1
        ) - timedelta(days=1)

        # Revenus: comptes 7xxxx
        income = Decimal(0)
        income_accounts = Account.objects.filter(code__regex=r'^7.*')
        for account in income_accounts:
            income -= account.get_balance(
                start_date=current_month,
                end_date=month_end,
            )

        # Dépenses: comptes 6xxxx
        expense = Decimal(0)
        expense_accounts = Account.objects.filter(code__regex=r'^6.*')
        for account in expense_accounts:
            expense += account.get_balance(start_date=current_month, end_date=month_end)

        month_stats.append(
            {
                'month': current_month.strftime('%m/%Y'),
                'income': float(income),
                'expense': float(expense),
                'profit': float(income - expense),
            }
        )

        # Passer au mois suivant
        current_month = (current_month.replace(day=28) + timedelta(days=4)).replace(
            day=1
        )

    # Écritures récentes
    recent_entries = JournalEntry.objects.filter(state='posted').order_by(
        '-date', '-id'
    )[:10]

    # Formater les données
    recent_entries_data = []
    for entry in recent_entries:
        # Calculer le montant total
        total_debit = entry.total_debit

        recent_entries_data.append(
            {
                'id': entry.id,
                'date': entry.date,
                'journal': entry.journal_id.code,
                'name': entry.name,
                'narration': entry.narration,
                'amount': float(total_debit),
            }
        )

    return Response(
        {
            'account_balances': {
                'bank_balance': float(bank_balance),
                'customer_balance': float(customer_balance),
                'supplier_balance': float(supplier_balance),
                'vat_balance': float(vat_balance),
            },
            'month_stats': month_stats,
            'recent_entries': recent_entries_data,
        }
    )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
@module_permission_required('accounting')
def general_ledger(request):
    """Vue du grand livre comptable."""
    account_id = request.query_params.get('account_id')
    if not account_id:
        return Response(
            {'error': _('Identifiant de compte manquant')},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Dates par défaut: l'année en cours
    today = timezone.now().date()
    start_date = request.query_params.get(
        'start_date', datetime(today.year, 1, 1).date().isoformat()
    )
    end_date = request.query_params.get('end_date', today.isoformat())

    # Générer le grand livre
    try:
        ledger_data = FinancialReportService.generate_general_ledger(
            start_date=start_date, end_date=end_date, account_ids=[account_id]
        )

        return Response(ledger_data)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
@module_permission_required('accounting')
def general_ledger_export(request):
    """Exportation du grand livre comptable."""
    account_id = request.query_params.get('account_id')
    if not account_id:
        return Response(
            {'error': _('Identifiant de compte manquant')},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Dates par défaut: l'année en cours
    today = timezone.now().date()
    start_date = request.query_params.get(
        'start_date', datetime(today.year, 1, 1).date().isoformat()
    )
    end_date = request.query_params.get('end_date', today.isoformat())

    # Format d'export
    export_format = request.query_params.get('format', 'excel')

    # Générer le grand livre
    try:
        ledger_data = FinancialReportService.generate_general_ledger(
            start_date=start_date, end_date=end_date, account_ids=[account_id]
        )

        # Exporter les données
        if export_format == 'excel':
            export_data = ImportExportService.export_ledger_to_excel(ledger_data)

            # Créer la réponse
            response = HttpResponse(
                export_data,
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            )
            response['Content-Disposition'] = (
                f'attachment; filename="grand_livre_{account_id}.xlsx"'
            )

            return response
        elif export_format == 'pdf':
            export_data = ImportExportService.export_ledger_to_pdf(ledger_data)

            # Créer la réponse
            response = HttpResponse(export_data, content_type='application/pdf')
            response['Content-Disposition'] = (
                f'attachment; filename="grand_livre_{account_id}.pdf"'
            )

            return response
        else:
            return Response(
                {'error': _("Format d'export non pris en charge")},
                status=status.HTTP_400_BAD_REQUEST,
            )
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
@module_permission_required('accounting')
def trial_balance(request):
    """Vue de la balance des comptes."""
    # Date par défaut: aujourd'hui
    today = timezone.now().date()
    date = request.query_params.get('date', today.isoformat())

    # Période fiscale
    period_id = request.query_params.get('period_id')

    # Générer la balance
    try:
        balance_data = FinancialReportService.generate_trial_balance(
            date=date, period_id=period_id
        )

        return Response(balance_data)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
@module_permission_required('accounting')
def trial_balance_export(request):
    """Exportation de la balance des comptes."""
    # Date par défaut: aujourd'hui
    today = timezone.now().date()
    date = request.query_params.get('date', today.isoformat())

    # Période fiscale
    period_id = request.query_params.get('period_id')

    # Format d'export
    export_format = request.query_params.get('format', 'excel')

    # Générer la balance
    try:
        balance_data = FinancialReportService.generate_trial_balance(
            date=date, period_id=period_id
        )

        # Exporter les données
        if export_format == 'excel':
            export_data = ImportExportService.export_balance_to_excel(balance_data)

            # Créer la réponse
            response = HttpResponse(
                export_data,
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            )
            response['Content-Disposition'] = (
                f'attachment; filename="balance_{date}.xlsx"'
            )

            return response
        elif export_format == 'pdf':
            export_data = ImportExportService.export_balance_to_pdf(balance_data)

            # Créer la réponse
            response = HttpResponse(export_data, content_type='application/pdf')
            response['Content-Disposition'] = (
                f'attachment; filename="balance_{date}.pdf"'
            )

            return response
        else:
            return Response(
                {'error': _("Format d'export non pris en charge")},
                status=status.HTTP_400_BAD_REQUEST,
            )
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
@module_permission_required('accounting')
def balance_sheet(request):
    """Vue du bilan comptable."""
    # Date par défaut: aujourd'hui
    today = timezone.now().date()
    date = request.query_params.get('date', today.isoformat())

    # Générer le bilan
    try:
        balance_sheet_data = FinancialReportService.generate_balance_sheet(date=date)

        return Response(balance_sheet_data)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
@module_permission_required('accounting')
def income_statement(request):
    """Vue du compte de résultat."""
    # Dates par défaut: l'année en cours
    today = timezone.now().date()
    start_date = request.query_params.get(
        'start_date', datetime(today.year, 1, 1).date().isoformat()
    )
    end_date = request.query_params.get('end_date', today.isoformat())

    # Période fiscale
    period_id = request.query_params.get('period_id')

    # Générer le compte de résultat
    try:
        income_statement_data = FinancialReportService.generate_income_statement(
            start_date=start_date, end_date=end_date, period_id=period_id
        )

        return Response(income_statement_data)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
@module_permission_required('accounting')
def financial_statements_export(request):
    """Exportation des états financiers."""
    # Type d'état financier
    statement_type = request.query_params.get('type', 'balance_sheet')

    # Date pour le bilan
    today = timezone.now().date()
    date = request.query_params.get('date', today.isoformat())

    # Dates pour le compte de résultat
    start_date = request.query_params.get(
        'start_date', datetime(today.year, 1, 1).date().isoformat()
    )
    end_date = request.query_params.get('end_date', today.isoformat())

    # Période fiscale
    period_id = request.query_params.get('period_id')

    # Format d'export
    export_format = request.query_params.get('format', 'excel')

    try:
        # Générer les données
        if statement_type == 'balance_sheet':
            data = FinancialReportService.generate_balance_sheet(date=date)
            filename = f'bilan_{date}'
        elif statement_type == 'income_statement':
            data = FinancialReportService.generate_income_statement(
                start_date=start_date, end_date=end_date, period_id=period_id
            )
            filename = f'compte_resultat_{start_date}_{end_date}'
        else:
            return Response(
                {'error': _("Type d'état financier non pris en charge")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Exporter les données
        if export_format == 'excel':
            if statement_type == 'balance_sheet':
                export_data = ImportExportService.export_balance_sheet_to_excel(data)
            else:
                export_data = ImportExportService.export_income_statement_to_excel(data)

            # Créer la réponse
            response = HttpResponse(
                export_data,
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            )
            response['Content-Disposition'] = f'attachment; filename="{filename}.xlsx"'

            return response
        elif export_format == 'pdf':
            if statement_type == 'balance_sheet':
                export_data = ImportExportService.export_balance_sheet_to_pdf(data)
            else:
                export_data = ImportExportService.export_income_statement_to_pdf(data)

            # Créer la réponse
            response = HttpResponse(export_data, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{filename}.pdf"'

            return response
        else:
            return Response(
                {'error': _("Format d'export non pris en charge")},
                status=status.HTTP_400_BAD_REQUEST,
            )
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
@module_permission_required('accounting')
def vat_declaration(request):
    """Vue de la déclaration de TVA."""
    # Période fiscale
    period_id = request.query_params.get('period_id')
    if not period_id:
        return Response(
            {'error': _('Identifiant de période manquant')},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Générer la déclaration de TVA
    try:
        vat_data = FinancialReportService.generate_vat_declaration(period_id=period_id)

        return Response(vat_data)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
@module_permission_required('accounting')
def vat_declaration_export(request):
    """Exportation de la déclaration de TVA."""
    # Période fiscale
    period_id = request.query_params.get('period_id')
    if not period_id:
        return Response(
            {'error': _('Identifiant de période manquant')},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Format d'export
    export_format = request.query_params.get('format', 'excel')

    # Générer la déclaration de TVA
    try:
        vat_data = FinancialReportService.generate_vat_declaration(period_id=period_id)

        # Exporter les données
        if export_format == 'excel':
            export_data = ImportExportService.export_vat_declaration_to_excel(vat_data)

            # Créer la réponse
            response = HttpResponse(
                export_data,
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            )
            response['Content-Disposition'] = (
                f'attachment; filename="declaration_tva_{vat_data["period"].name}.xlsx"'
            )

            return response
        elif export_format == 'pdf':
            export_data = ImportExportService.export_vat_declaration_to_pdf(vat_data)

            # Créer la réponse
            response = HttpResponse(export_data, content_type='application/pdf')
            response['Content-Disposition'] = (
                f'attachment; filename="declaration_tva_{vat_data["period"].name}.pdf"'
            )

            return response
        else:
            return Response(
                {'error': _("Format d'export non pris en charge")},
                status=status.HTTP_400_BAD_REQUEST,
            )
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
@module_permission_required('accounting')
def import_journal_entries(request):
    """Import d'écritures comptables."""
    # Récupérer le fichier
    file = request.FILES.get('file')
    if not file:
        return Response(
            {'error': _('Aucun fichier fourni')}, status=status.HTTP_400_BAD_REQUEST
        )

    # Format d'import
    import_format = request.data.get('format', 'csv')

    # Importer les écritures
    try:
        result = ImportExportService.import_journal_entries(
            file_data=file.read(), file_format=import_format
        )

        return Response(result)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ── Rapports réglementaires additionnels ──────────────────────────────


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
@module_permission_required('accounting')
def esg_report(request):
    """État des Soldes de Gestion (ESG) — spécifique Maroc."""
    today = timezone.now().date()
    start_date = request.query_params.get(
        'start_date', datetime(today.year, 1, 1).date().isoformat()
    )
    end_date = request.query_params.get('end_date', today.isoformat())

    try:
        from core.models import CompanySetup

        setup = CompanySetup.objects.first()
        locale_pack = setup.locale_pack if setup else 'MA'
    except Exception:
        locale_pack = 'MA'

    def account_balance(prefix, sd=start_date, ed=end_date):
        """Somme des soldes des comptes commençant par prefix."""
        total = Decimal('0')
        for acct in Account.objects.filter(code__startswith=prefix):
            total += acct.get_balance(start_date=sd, end_date=ed)
        return total

    # Calcul ESG selon PCGE marocain
    # I. Tableau de formation des résultats (TFR)
    ventes_marchandises = abs(account_balance('711'))
    achats_marchandises = abs(account_balance('611'))
    marge_brute = ventes_marchandises - achats_marchandises

    production = (
        abs(account_balance('712'))
        + abs(account_balance('713'))
        + abs(account_balance('714'))
    )
    consommation = (
        abs(account_balance('612'))
        + abs(account_balance('613'))
        + abs(account_balance('614'))
    )
    valeur_ajoutee = marge_brute + production - consommation
    subventions = abs(account_balance('716'))
    impots_taxes = abs(account_balance('616'))
    charges_personnel = abs(account_balance('617'))
    ebe = valeur_ajoutee + subventions - impots_taxes - charges_personnel

    autres_produits_exploit = abs(account_balance('718')) + abs(account_balance('719'))
    autres_charges_exploit = abs(account_balance('618')) + abs(account_balance('619'))
    resultat_exploitation = ebe + autres_produits_exploit - autres_charges_exploit

    produits_financiers = abs(account_balance('73'))
    charges_financieres = abs(account_balance('63'))
    resultat_financier = produits_financiers - charges_financieres

    resultat_courant = resultat_exploitation + resultat_financier

    produits_non_courants = abs(account_balance('75'))
    charges_non_courantes = abs(account_balance('65'))
    resultat_non_courant = produits_non_courants - charges_non_courantes

    impot_sur_resultat = abs(account_balance('670'))
    resultat_net = resultat_courant + resultat_non_courant - impot_sur_resultat

    # II. Capacité d'autofinancement
    dotations_total = (
        abs(account_balance('619'))
        + abs(account_balance('639'))
        + abs(account_balance('659'))
    )
    reprises_total = (
        abs(account_balance('719'))
        + abs(account_balance('739'))
        + abs(account_balance('759'))
    )
    caf = resultat_net + dotations_total - reprises_total

    return Response(
        {
            'locale_pack': locale_pack,
            'period': {'start_date': start_date, 'end_date': end_date},
            'tfr': [
                {'label': 'Ventes de marchandises', 'value': str(ventes_marchandises)},
                {
                    'label': 'Achats revendus de marchandises',
                    'value': str(achats_marchandises),
                    'sign': '-',
                },
                {
                    'label': "MARGE BRUTE SUR VENTES EN L'ÉTAT",
                    'value': str(marge_brute),
                    'is_total': True,
                },
                {'label': "Production de l'exercice", 'value': str(production)},
                {
                    'label': "Consommation de l'exercice",
                    'value': str(consommation),
                    'sign': '-',
                },
                {
                    'label': 'VALEUR AJOUTÉE',
                    'value': str(valeur_ajoutee),
                    'is_total': True,
                },
                {'label': "Subventions d'exploitation", 'value': str(subventions)},
                {'label': 'Impôts et taxes', 'value': str(impots_taxes), 'sign': '-'},
                {
                    'label': 'Charges de personnel',
                    'value': str(charges_personnel),
                    'sign': '-',
                },
                {
                    'label': "EXCÉDENT BRUT D'EXPLOITATION (EBE)",
                    'value': str(ebe),
                    'is_total': True,
                },
                {
                    'label': "Autres produits d'exploitation",
                    'value': str(autres_produits_exploit),
                },
                {
                    'label': "Autres charges d'exploitation",
                    'value': str(autres_charges_exploit),
                    'sign': '-',
                },
                {
                    'label': "RÉSULTAT D'EXPLOITATION",
                    'value': str(resultat_exploitation),
                    'is_total': True,
                },
                {'label': 'Produits financiers', 'value': str(produits_financiers)},
                {
                    'label': 'Charges financières',
                    'value': str(charges_financieres),
                    'sign': '-',
                },
                {
                    'label': 'RÉSULTAT FINANCIER',
                    'value': str(resultat_financier),
                    'is_total': True,
                },
                {
                    'label': 'RÉSULTAT COURANT',
                    'value': str(resultat_courant),
                    'is_total': True,
                },
                {'label': 'Produits non courants', 'value': str(produits_non_courants)},
                {
                    'label': 'Charges non courantes',
                    'value': str(charges_non_courantes),
                    'sign': '-',
                },
                {
                    'label': 'RÉSULTAT NON COURANT',
                    'value': str(resultat_non_courant),
                    'is_total': True,
                },
                {
                    'label': 'Impôt sur les résultats',
                    'value': str(impot_sur_resultat),
                    'sign': '-',
                },
                {
                    'label': "RÉSULTAT NET DE L'EXERCICE",
                    'value': str(resultat_net),
                    'is_total': True,
                },
            ],
            'caf': {
                'resultat_net': str(resultat_net),
                'dotations': str(dotations_total),
                'reprises': str(reprises_total),
                'caf': str(caf),
            },
        }
    )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
@module_permission_required('accounting')
def asset_schedule(request):
    """Tableau des immobilisations et amortissements."""
    today = timezone.now().date()
    date = request.query_params.get('date', today.isoformat())

    from .models import Asset, AssetDepreciation

    assets = (
        Asset.objects.select_related('category_id')
        .filter(state__in=['open', 'close'])
        .order_by('category_id__name', 'code')
    )

    categories = {}
    for asset in assets:
        cat_name = asset.category_id.name if asset.category_id else 'Sans catégorie'
        if cat_name not in categories:
            categories[cat_name] = {
                'name': cat_name,
                'method': asset.category_id.method if asset.category_id else 'linear',
                'duration': asset.category_id.duration_years
                if asset.category_id
                else 0,
                'assets': [],
                'totals': {
                    'acquisition_value': Decimal('0'),
                    'cumulated_depreciation': Decimal('0'),
                    'net_value': Decimal('0'),
                    'year_depreciation': Decimal('0'),
                },
            }

        # Amortissements cumulés
        cumulated = AssetDepreciation.objects.filter(
            asset_id=asset, state='posted', date__lte=date
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        # Dotation de l'exercice en cours
        year_start = datetime.strptime(date, '%Y-%m-%d').date().replace(month=1, day=1)
        year_dep = AssetDepreciation.objects.filter(
            asset_id=asset, state='posted', date__gte=year_start, date__lte=date
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        net_value = asset.acquisition_value - cumulated

        asset_data = {
            'id': asset.id,
            'code': asset.code,
            'name': asset.name,
            'acquisition_date': asset.acquisition_date.isoformat()
            if asset.acquisition_date
            else None,
            'acquisition_value': str(asset.acquisition_value),
            'cumulated_depreciation': str(cumulated),
            'year_depreciation': str(year_dep),
            'net_value': str(net_value),
            'state': asset.state,
        }
        categories[cat_name]['assets'].append(asset_data)
        categories[cat_name]['totals']['acquisition_value'] += asset.acquisition_value
        categories[cat_name]['totals']['cumulated_depreciation'] += cumulated
        categories[cat_name]['totals']['net_value'] += net_value
        categories[cat_name]['totals']['year_depreciation'] += year_dep

    # Totaux généraux
    grand_totals = {
        'acquisition_value': Decimal('0'),
        'cumulated_depreciation': Decimal('0'),
        'net_value': Decimal('0'),
        'year_depreciation': Decimal('0'),
    }
    for cat in categories.values():
        for key in grand_totals:
            grand_totals[key] += cat['totals'][key]
        cat['totals'] = {k: str(v) for k, v in cat['totals'].items()}

    return Response(
        {
            'date': date,
            'categories': list(categories.values()),
            'grand_totals': {k: str(v) for k, v in grand_totals.items()},
        }
    )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
@module_permission_required('accounting')
def journal_officiel(request):
    """Journal centralisé officiel (toutes écritures validées)."""
    today = timezone.now().date()
    start_date = request.query_params.get(
        'start_date', datetime(today.year, 1, 1).date().isoformat()
    )
    end_date = request.query_params.get('end_date', today.isoformat())
    journal_id = request.query_params.get('journal_id')

    entries = (
        JournalEntry.objects.filter(
            state='posted', date__gte=start_date, date__lte=end_date
        )
        .select_related('journal_id', 'period_id')
        .order_by('date', 'journal_id__code', 'name')
    )

    if journal_id:
        entries = entries.filter(journal_id=journal_id)

    result = []
    total_debit = Decimal('0')
    total_credit = Decimal('0')

    for entry in entries:
        lines = entry.lines.select_related('account_id').order_by('account_id__code')
        entry_lines = []
        for line in lines:
            entry_lines.append(
                {
                    'account_code': line.account_id.code,
                    'account_name': line.account_id.name,
                    'label': line.name or '',
                    'debit': str(line.debit),
                    'credit': str(line.credit),
                }
            )
            total_debit += line.debit
            total_credit += line.credit

        result.append(
            {
                'date': entry.date.isoformat(),
                'journal': entry.journal_id.code,
                'number': entry.name,
                'ref': entry.ref or '',
                'narration': entry.narration or '',
                'lines': entry_lines,
            }
        )

    return Response(
        {
            'period': {'start_date': start_date, 'end_date': end_date},
            'entries_count': len(result),
            'entries': result,
            'totals': {'debit': str(total_debit), 'credit': str(total_credit)},
        }
    )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
@module_permission_required('accounting')
def cash_forecast(request):
    """
    Prévision de trésorerie sur 12 semaines.
    Calcul : solde actuel + encaissements prévus - décaissements prévus - salaires.
    """
    from datetime import timedelta
    from decimal import Decimal

    from django.db.models import Sum

    from sales.models import BankAccount, Invoice

    try:
        from purchasing.models import SupplierInvoice
    except ImportError:
        SupplierInvoice = None
    try:
        from payroll.models import PayrollRun, PaySlip
    except ImportError:
        PayrollRun = None
        PaySlip = None

    today = timezone.now().date()
    weeks = int(request.GET.get('weeks', 12))
    weeks = min(weeks, 26)  # Max 6 mois

    # ── 1. Solde actuel (somme des comptes bancaires) ──
    bank_accounts = BankAccount.objects.all()
    bank_accounts_data = []

    for ba in bank_accounts:
        # Chercher le dernier relevé confirmé pour ce compte
        # On utilise les journaux liés au compte bancaire
        last_statement = (
            BankStatement.objects.filter(state='confirm').order_by('-date').first()
        )

        balance = last_statement.balance_end if last_statement else Decimal('0.00')

        bank_accounts_data.append(
            {
                'id': ba.id,
                'name': f'{ba.bank_name} - {ba.name}',
                'rib': ba.rib,
                'balance': float(balance),
            }
        )

    current_balance = sum(ba['balance'] for ba in bank_accounts_data)

    # ── 2. Encaissements prévus (factures clients non payées) ──
    receivables = Invoice.objects.filter(
        payment_status__in=['unpaid', 'partial', 'overdue'],
        due_date__gte=today,
        due_date__lte=today + timedelta(weeks=weeks),
    ).values('id', 'number', 'company__name', 'due_date', 'total', 'amount_paid')

    # ── 3. Décaissements prévus (factures fournisseurs non payées) ──
    payables = []
    if SupplierInvoice:
        payables = list(
            SupplierInvoice.objects.filter(
                state='validated',
                due_date__gte=today,
                due_date__lte=today + timedelta(weeks=weeks),
            ).values(
                'id', 'number', 'supplier__name', 'due_date', 'total', 'amount_paid'
            )
        )

    # ── 4. Salaires prévus ──
    salary_forecasts = []
    if PayrollRun and PaySlip:
        upcoming_runs = PayrollRun.objects.filter(
            status__in=['draft', 'in_progress', 'calculated', 'validated'],
        ).select_related('period')

        for run in upcoming_runs:
            total_net = run.payslip_set.aggregate(total=Sum('net_salary'))[
                'total'
            ] or Decimal('0.00')
            if total_net > 0:
                salary_forecasts.append(
                    {
                        'id': run.id,
                        'name': run.name,
                        'period': str(run.period),
                        'date': run.period.end_date.isoformat()
                        if hasattr(run.period, 'end_date')
                        else today.isoformat(),
                        'amount': float(total_net),
                        'status': run.status,
                    }
                )

    # ── 5. Construire la prévision semaine par semaine ──
    weekly_forecast = []
    running_balance = Decimal(str(current_balance))

    for week_num in range(weeks):
        week_start = today + timedelta(weeks=week_num)
        week_end = week_start + timedelta(days=6)

        # Encaissements de la semaine
        week_inflows = Decimal('0.00')
        for inv in receivables:
            if inv['due_date'] and week_start <= inv['due_date'] <= week_end:
                remaining = (inv['total'] or Decimal('0')) - (
                    inv['amount_paid'] or Decimal('0')
                )
                week_inflows += remaining

        # Décaissements de la semaine
        week_outflows = Decimal('0.00')
        for inv in payables:
            if inv['due_date'] and week_start <= inv['due_date'] <= week_end:
                remaining = (inv['total'] or Decimal('0')) - (
                    inv['amount_paid'] or Decimal('0')
                )
                week_outflows += remaining

        # Salaires de la semaine
        week_salaries = Decimal('0.00')
        for sal in salary_forecasts:
            sal_date = sal['date']
            if isinstance(sal_date, str):
                from datetime import datetime as dt

                try:
                    sal_date = dt.strptime(sal_date, '%Y-%m-%d').date()
                except (ValueError, TypeError):
                    continue
            if week_start <= sal_date <= week_end:
                week_salaries += Decimal(str(sal['amount']))

        running_balance += week_inflows - week_outflows - week_salaries

        weekly_forecast.append(
            {
                'week': week_num + 1,
                'start_date': week_start.isoformat(),
                'end_date': week_end.isoformat(),
                'label': f'S{week_start.isocalendar()[1]}',
                'inflows': float(week_inflows),
                'outflows': float(week_outflows),
                'salaries': float(week_salaries),
                'net': float(week_inflows - week_outflows - week_salaries),
                'balance': float(running_balance),
            }
        )

    # ── 6. Résumé ──
    total_inflows = sum(w['inflows'] for w in weekly_forecast)
    total_outflows = sum(w['outflows'] for w in weekly_forecast)
    total_salaries = sum(w['salaries'] for w in weekly_forecast)
    final_balance = (
        weekly_forecast[-1]['balance'] if weekly_forecast else current_balance
    )

    # Factures échues (déjà en retard)
    overdue_receivables = float(
        Invoice.objects.filter(
            payment_status__in=['unpaid', 'partial', 'overdue'],
            due_date__lt=today,
        ).aggregate(total=Sum('total') - Sum('amount_paid'))['total']
        or 0
    )

    overdue_payables = 0.0
    if SupplierInvoice:
        overdue_payables = float(
            SupplierInvoice.objects.filter(
                state='validated',
                due_date__lt=today,
            ).aggregate(total=Sum('total') - Sum('amount_paid'))['total']
            or 0
        )

    return Response(
        {
            'current_balance': float(current_balance),
            'bank_accounts': bank_accounts_data,
            'weekly_forecast': weekly_forecast,
            'summary': {
                'total_inflows': total_inflows,
                'total_outflows': total_outflows,
                'total_salaries': total_salaries,
                'projected_balance': float(final_balance),
                'overdue_receivables': overdue_receivables,
                'overdue_payables': overdue_payables,
            },
            'weeks': weeks,
        }
    )


class AccountMappingValidateView(APIView):
    """
    GET /api/accounting/mappings/validate/
    Vérifie que tous les rôles comptables critiques sont configurés.
    Health check utilisable après setup ou pour diagnostic.
    """

    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        from accounting.services.account_resolver import AccountResolver

        result = AccountResolver.validate_all_roles()
        status_code = 200 if result['valid'] else 206
        return Response(result, status=status_code)


class AccountMappingListView(APIView):
    """
    GET /api/accounting/mappings/
    Liste tous les mappings configurés avec le détail du compte.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from accounting.models import AccountMapping

        mappings = AccountMapping.objects.select_related('account').all()
        data = [
            {
                'role': m.role,
                'role_label': m.get_role_display(),
                'account_code': m.account.code,
                'account_name': m.account.name,
                'description': m.description,
            }
            for m in mappings
        ]
        return Response({'count': len(data), 'results': data})
