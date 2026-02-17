import os

from django.db.models import Count, Sum
from django.http import FileResponse
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from .models import (
    AdvanceSalary,
    ContractType,
    EmployeePayroll,
    PayrollParameter,
    PayrollPeriod,
    PayrollRun,
    PaySlip,
    PaySlipLine,
    SalaryComponent,
    TaxBracket,
)
from .serializers import (
    AdvanceSalarySerializer,
    ContractTypeSerializer,
    EmployeePayrollSerializer,
    PayrollParameterSerializer,
    PayrollPeriodSerializer,
    PayrollRunSerializer,
    PaySlipLineSerializer,
    PaySlipSerializer,
    SalaryComponentSerializer,
    TaxBracketSerializer,
)
from .services.pdf_generator import PayrollPDFGenerator
from .services.salary_calculator import SalaryCalculator


class PayrollPeriodViewSet(viewsets.ModelViewSet):
    """API pour les périodes de paie."""

    queryset = PayrollPeriod.objects.all()
    serializer_class = PayrollPeriodSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['start_date', 'end_date', 'name']
    ordering = ['-start_date']

    @action(detail=True, methods=['post'])
    def close_period(self, request, pk=None):
        """Clôture une période de paie."""
        period = self.get_object()

        # Vérifier que tous les lancements de paie sont clôturés
        open_runs = PayrollRun.objects.filter(
            period=period, status__in=['draft', 'in_progress', 'calculated']
        )

        if open_runs.exists():
            return Response(
                {
                    'error': 'Impossible de clôturer la période, des lancements de paie sont encore ouverts.'
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        period.is_closed = True
        period.save(update_fields=['is_closed'])

        return Response({'success': True, 'message': 'Période clôturée avec succès.'})


class PayrollParameterViewSet(viewsets.ModelViewSet):
    """API pour les paramètres de paie."""

    queryset = PayrollParameter.objects.all()
    serializer_class = PayrollParameterSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ['is_active']
    search_fields = ['code', 'name', 'description']
    ordering_fields = ['code', 'effective_date']
    ordering = ['code']


class ContractTypeViewSet(viewsets.ModelViewSet):
    """API pour les types de contrat."""

    queryset = ContractType.objects.all()
    serializer_class = ContractTypeSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ['is_active']
    search_fields = ['code', 'name', 'description']
    ordering_fields = ['code', 'name']
    ordering = ['name']


class SalaryComponentViewSet(viewsets.ModelViewSet):
    """API pour les composants de salaire."""

    queryset = SalaryComponent.objects.all()
    serializer_class = SalaryComponentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ['component_type', 'is_taxable', 'is_cnss_eligible', 'is_active']
    search_fields = ['code', 'name', 'description']
    ordering_fields = ['code', 'name', 'component_type']
    ordering = ['component_type', 'code']


class TaxBracketViewSet(viewsets.ModelViewSet):
    """API pour les tranches d'imposition."""

    queryset = TaxBracket.objects.all()
    serializer_class = TaxBracketSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['min_amount', 'effective_date']
    ordering = ['min_amount']


class EmployeePayrollViewSet(viewsets.ModelViewSet):
    """API pour les données de paie des employés."""

    queryset = EmployeePayroll.objects.all()
    serializer_class = EmployeePayrollSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ['contract_type', 'payment_method']
    search_fields = [
        'employee__first_name',
        'employee__last_name',
        'employee__employee_id',
        'cnss_number',
        'bank_account',
    ]
    ordering_fields = ['employee__last_name', 'base_salary']
    ordering = ['employee__last_name']

    @action(detail=False, methods=['get'])
    def by_employee(self, request):
        """Récupère les données de paie pour un employé spécifique."""
        employee_id = request.query_params.get('employee_id')

        if not employee_id:
            return Response(
                {'error': 'employee_id est requis'}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            payroll_info = EmployeePayroll.objects.get(employee__id=employee_id)
            serializer = self.get_serializer(payroll_info)
            return Response(serializer.data)
        except EmployeePayroll.DoesNotExist:
            return Response(
                {'error': 'Informations de paie non trouvées pour cet employé'},
                status=status.HTTP_404_NOT_FOUND,
            )


class PayrollRunViewSet(viewsets.ModelViewSet):
    """API pour les lancements de paie."""

    queryset = PayrollRun.objects.all()
    serializer_class = PayrollRunSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ['period', 'status', 'department']
    search_fields = ['name', 'description']
    ordering_fields = ['period__start_date', 'run_date', 'status']
    ordering = ['-period__start_date', '-run_date']

    @action(detail=True, methods=['post'])
    def generate_payslips(self, request, pk=None):
        """Génère les bulletins de paie pour ce lancement."""
        payroll_run = self.get_object()

        if payroll_run.status != 'draft':
            return Response(
                {
                    'error': "Impossible de générer les bulletins, le lancement n'est pas en brouillon"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Récupérer les employés concernés (tous ou par département)
        from hr.models import Employee

        employees = Employee.objects.filter(is_active=True)

        if payroll_run.department:
            employees = employees.filter(department=payroll_run.department)

        # Créer les bulletins
        period = payroll_run.period
        months = [
            '',
            'JAN',
            'FEV',
            'MAR',
            'AVR',
            'MAI',
            'JUN',
            'JUL',
            'AOU',
            'SEP',
            'OCT',
            'NOV',
            'DEC',
        ]
        month_code = months[period.start_date.month]
        year_code = str(period.start_date.year)[-2:]

        created_count = 0
        for employee in employees:
            # Vérifier que l'employé a des infos de paie
            try:
                payroll_info = employee.payroll_info
            except EmployeePayroll.DoesNotExist:
                continue

            # Vérifier si un bulletin existe déjà pour cet employé dans ce lancement
            if PaySlip.objects.filter(
                payroll_run=payroll_run, employee=employee
            ).exists():
                continue

            # Générer un numéro de bulletin unique
            number = f'BUL-{month_code}{year_code}-{employee.employee_id}'

            # Créer le bulletin
            PaySlip.objects.create(
                payroll_run=payroll_run,
                employee=employee,
                number=number,
                basic_salary=payroll_info.base_salary,
                worked_days=26,  # Valeur par défaut
                gross_salary=0,  # Sera calculé
                taxable_salary=0,  # Sera calculé
                net_salary=0,  # Sera calculé
                cnss_employee=0,  # Sera calculé
                cnss_employer=0,  # Sera calculé
                amo_employee=0,  # Sera calculé
                amo_employer=0,  # Sera calculé
                income_tax=0,  # Sera calculé
                status='draft',
            )
            created_count += 1

        # Mettre à jour le statut du lancement
        payroll_run.status = 'in_progress'
        payroll_run.save(update_fields=['status'])

        return Response(
            {
                'success': True,
                'message': f'{created_count} bulletins de paie créés avec succès',
                'payslips_count': created_count,
            }
        )

    @action(detail=True, methods=['post'])
    def calculate_payslips(self, request, pk=None):
        """Calcule tous les bulletins de ce lancement."""
        payroll_run = self.get_object()

        if payroll_run.status not in ['in_progress', 'calculated']:
            return Response(
                {
                    'error': "Impossible de calculer les bulletins, le lancement n'est pas en cours ou déjà calculé"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Récupérer tous les bulletins du lancement
        payslips = PaySlip.objects.filter(payroll_run=payroll_run, status='draft')

        # Calculer chaque bulletin
        calculated_count = 0
        errors = []

        for payslip in payslips:
            try:
                SalaryCalculator.calculate_payslip(payslip)
                calculated_count += 1
            except Exception as e:
                errors.append(
                    {
                        'payslip_id': payslip.id,
                        'employee': payslip.employee.full_name,
                        'error': str(e),
                    }
                )

        # Mettre à jour le statut du lancement si tous les bulletins sont calculés
        if not PaySlip.objects.filter(payroll_run=payroll_run, status='draft').exists():
            payroll_run.status = 'calculated'
            payroll_run.calculated_date = timezone.now()
            payroll_run.save(update_fields=['status', 'calculated_date'])

        return Response(
            {
                'success': True,
                'message': f'{calculated_count} bulletins calculés avec succès',
                'errors': errors,
            }
        )

    @action(detail=True, methods=['post'])
    def validate_payroll(self, request, pk=None):
        """Valide le lancement de paie."""
        payroll_run = self.get_object()

        if payroll_run.status != 'calculated':
            return Response(
                {
                    'error': 'Impossible de valider le lancement, tous les bulletins ne sont pas calculés'
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Vérifier que tous les bulletins sont calculés
        if (
            PaySlip.objects.filter(payroll_run=payroll_run)
            .exclude(status='calculated')
            .exists()
        ):
            return Response(
                {'error': 'Tous les bulletins ne sont pas calculés'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Mettre à jour le statut du lancement
        payroll_run.status = 'validated'
        payroll_run.validated_date = timezone.now()
        payroll_run.validated_by = request.user.employee
        payroll_run.save(update_fields=['status', 'validated_date', 'validated_by'])

        # Mettre à jour les bulletins
        PaySlip.objects.filter(payroll_run=payroll_run).update(status='validated')

        return Response(
            {'success': True, 'message': 'Lancement de paie validé avec succès'}
        )

    @action(detail=True, methods=['post'])
    def pay_payroll(self, request, pk=None):
        """Marque le lancement de paie comme payé."""
        payroll_run = self.get_object()

        if payroll_run.status != 'validated':
            return Response(
                {'error': "Impossible de payer le lancement, il n'est pas validé"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment_reference = request.data.get('payment_reference', '')

        # Mettre à jour le statut du lancement
        payroll_run.status = 'paid'
        payroll_run.paid_date = timezone.now()
        payroll_run.save(update_fields=['status', 'paid_date'])

        # Mettre à jour les bulletins
        PaySlip.objects.filter(payroll_run=payroll_run).update(
            status='paid',
            is_paid=True,
            payment_date=timezone.now().date(),
            payment_reference=payment_reference,
        )

        return Response(
            {
                'success': True,
                'message': 'Lancement de paie marqué comme payé avec succès',
            }
        )

    @action(detail=True, methods=['get'])
    def generate_summary_pdf(self, request, pk=None):
        """Génère un récapitulatif PDF du lancement de paie."""
        payroll_run = self.get_object()

        try:
            pdf_path = PayrollPDFGenerator.generate_payroll_run_summary(payroll_run)
            return Response(
                {
                    'success': True,
                    'message': 'Récapitulatif généré avec succès',
                    'pdf_url': f'/media/{pdf_path}',
                }
            )
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la génération du PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class PaySlipViewSet(viewsets.ModelViewSet):
    """API pour les bulletins de paie."""

    queryset = PaySlip.objects.all()
    serializer_class = PaySlipSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ['payroll_run', 'employee', 'status', 'is_paid']
    search_fields = [
        'number',
        'employee__first_name',
        'employee__last_name',
        'employee__employee_id',
    ]
    ordering_fields = [
        'payroll_run__period__start_date',
        'employee__last_name',
        'number',
    ]
    ordering = ['-payroll_run__period__start_date', 'employee__last_name']

    @action(detail=True, methods=['post'])
    def calculate(self, request, pk=None):
        """Calcule ou recalcule un bulletin de paie."""
        payslip = self.get_object()

        if payslip.status not in ['draft', 'calculated']:
            return Response(
                {
                    'error': 'Impossible de calculer ce bulletin, son statut ne le permet pas'
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            SalaryCalculator.calculate_payslip(
                payslip, recalculate=(payslip.status == 'calculated')
            )
            return Response(
                {
                    'success': True,
                    'message': 'Bulletin calculé avec succès',
                    'payslip': PaySlipSerializer(payslip).data,
                }
            )
        except Exception as e:
            return Response(
                {'error': f'Erreur lors du calcul: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        """Télécharge le PDF d'un bulletin de paie."""
        payslip = self.get_object()

        if not payslip.pdf_file:
            # Générer le PDF s'il n'existe pas
            try:
                pdf_path = PayrollPDFGenerator.generate_payslip_pdf(payslip)
            except Exception as e:
                return Response(
                    {'error': f'Erreur lors de la génération du PDF: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        from django.conf import settings

        pdf_path = os.path.join(settings.MEDIA_ROOT, payslip.pdf_file)

        if os.path.exists(pdf_path):
            response = FileResponse(
                open(pdf_path, 'rb'), content_type='application/pdf'
            )
            response['Content-Disposition'] = (
                f'attachment; filename="bulletin_{payslip.number}.pdf"'
            )
            return response
        else:
            return Response(
                {'error': "Le fichier PDF n'existe pas"},
                status=status.HTTP_404_NOT_FOUND,
            )


class PaySlipLineViewSet(viewsets.ModelViewSet):
    """API pour les lignes de bulletin de paie."""

    queryset = PaySlipLine.objects.all()
    serializer_class = PaySlipLineSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['payslip', 'component', 'is_employer_contribution']
    ordering_fields = ['display_order', 'component__code']
    ordering = ['display_order', 'component__code']


class AdvanceSalaryViewSet(viewsets.ModelViewSet):
    """API pour les acomptes sur salaire."""

    queryset = AdvanceSalary.objects.all()
    serializer_class = AdvanceSalarySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ['employee', 'period', 'is_paid']
    search_fields = ['employee__first_name', 'employee__last_name', 'notes']
    ordering_fields = ['payment_date', 'amount']
    ordering = ['-payment_date']

    @action(detail=True, methods=['post'])
    def mark_as_paid(self, request, pk=None):
        """Marque un acompte comme payé."""
        advance = self.get_object()

        if advance.is_paid:
            return Response(
                {'error': 'Cet acompte est déjà marqué comme payé'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        advance.is_paid = True
        advance.save(update_fields=['is_paid'])

        return Response(
            {'success': True, 'message': 'Acompte marqué comme payé avec succès'}
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def payroll_dashboard(request):
    """Tableau de bord du module Paie."""
    # Période en cours
    current_period = (
        PayrollPeriod.objects.filter(is_closed=False).order_by('-start_date').first()
    )

    # Statistiques sur les lancements de paie
    payroll_runs = PayrollRun.objects.all()
    runs_by_status = (
        payroll_runs.values('status').annotate(count=Count('id')).order_by('status')
    )

    # Statistiques sur les bulletins
    payslips = PaySlip.objects.all()
    payslips_by_status = (
        payslips.values('status').annotate(count=Count('id')).order_by('status')
    )

    # Statistiques sur les acomptes
    advances = AdvanceSalary.objects.all()
    advances_by_period = (
        advances.values('period__name')
        .annotate(count=Count('id'), total=Sum('amount'))
        .order_by('-period__start_date')[:6]
    )

    # Période actuelle
    if current_period:
        current_period_data = {
            'id': current_period.id,
            'name': current_period.name,
            'start_date': current_period.start_date,
            'end_date': current_period.end_date,
            'runs_count': PayrollRun.objects.filter(period=current_period).count(),
            'payslips_count': PaySlip.objects.filter(
                payroll_run__period=current_period
            ).count(),
            'payslips_calculated': PaySlip.objects.filter(
                payroll_run__period=current_period,
                status__in=['calculated', 'validated', 'paid'],
            ).count(),
            'total_gross': PaySlip.objects.filter(
                payroll_run__period=current_period
            ).aggregate(total=Sum('gross_salary'))['total']
            or 0,
            'total_net': PaySlip.objects.filter(
                payroll_run__period=current_period
            ).aggregate(total=Sum('net_salary'))['total']
            or 0,
        }
    else:
        current_period_data = None

    # Récupérer les derniers bulletins
    recent_payslips = PaySlip.objects.all().order_by('-created_at')[:10]
    recent_payslips_data = PaySlipSerializer(recent_payslips, many=True).data

    # Récupérer les derniers acomptes
    recent_advances = AdvanceSalary.objects.all().order_by('-created_at')[:10]
    recent_advances_data = AdvanceSalarySerializer(recent_advances, many=True).data

    # Montants par département pour le mois en cours
    if current_period:
        department_stats = (
            PaySlip.objects.filter(payroll_run__period=current_period)
            .values('employee__department__name')
            .annotate(
                employees_count=Count('employee', distinct=True),
                total_gross=Sum('gross_salary'),
                total_net=Sum('net_salary'),
                total_cnss=Sum('cnss_employee') + Sum('cnss_employer'),
                total_amo=Sum('amo_employee') + Sum('amo_employer'),
                total_ir=Sum('income_tax'),
            )
            .order_by('-total_gross')
        )
    else:
        department_stats = []

    return Response(
        {
            'current_period': current_period_data,
            'runs_by_status': runs_by_status,
            'payslips_by_status': payslips_by_status,
            'advances_by_period': advances_by_period,
            'recent_payslips': recent_payslips_data,
            'recent_advances': recent_advances_data,
            'department_stats': department_stats,
            'totals': {
                'employees': PaySlip.objects.values('employee').distinct().count(),
                'periods': PayrollPeriod.objects.count(),
                'payroll_runs': payroll_runs.count(),
                'payslips': payslips.count(),
                'advances': advances.count(),
            },
        }
    )
