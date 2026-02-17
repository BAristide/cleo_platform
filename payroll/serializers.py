# payroll/serializers.py
from rest_framework import serializers

from hr.models import Employee

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


class PayrollPeriodSerializer(serializers.ModelSerializer):
    """Serializer pour les périodes de paie."""

    class Meta:
        model = PayrollPeriod
        fields = [
            'id',
            'name',
            'start_date',
            'end_date',
            'is_closed',
            'created_at',
            'updated_at',
        ]


class PayrollParameterSerializer(serializers.ModelSerializer):
    """Serializer pour les paramètres de paie."""

    class Meta:
        model = PayrollParameter
        fields = [
            'id',
            'code',
            'name',
            'value',
            'effective_date',
            'end_date',
            'description',
            'is_active',
            'created_at',
            'updated_at',
        ]


class ContractTypeSerializer(serializers.ModelSerializer):
    """Serializer pour les types de contrat."""

    class Meta:
        model = ContractType
        fields = [
            'id',
            'code',
            'name',
            'description',
            'is_active',
            'created_at',
            'updated_at',
        ]


class SalaryComponentSerializer(serializers.ModelSerializer):
    """Serializer pour les composants de salaire."""

    component_type_display = serializers.SerializerMethodField()

    class Meta:
        model = SalaryComponent
        fields = [
            'id',
            'code',
            'name',
            'description',
            'component_type',
            'component_type_display',
            'is_taxable',
            'is_cnss_eligible',
            'is_active',
            'formula',
            'created_at',
            'updated_at',
        ]

    def get_component_type_display(self, obj):
        return dict(SalaryComponent.TYPE_CHOICES).get(obj.component_type, '')


class TaxBracketSerializer(serializers.ModelSerializer):
    """Serializer pour les tranches d'imposition."""

    range_display = serializers.SerializerMethodField()

    class Meta:
        model = TaxBracket
        fields = [
            'id',
            'min_amount',
            'max_amount',
            'rate',
            'deduction',
            'effective_date',
            'end_date',
            'range_display',
            'created_at',
            'updated_at',
        ]

    def get_range_display(self, obj):
        if obj.max_amount:
            return f'{obj.min_amount} à {obj.max_amount}: {obj.rate}%'
        return f'Plus de {obj.min_amount}: {obj.rate}%'


class EmployeePayrollSerializer(serializers.ModelSerializer):
    """Serializer pour les données de paie des employés."""

    employee_name = serializers.SerializerMethodField()
    contract_type_name = serializers.SerializerMethodField()
    payment_method_display = serializers.SerializerMethodField()

    class Meta:
        model = EmployeePayroll
        fields = [
            'id',
            'employee',
            'employee_name',
            'contract_type',
            'contract_type_name',
            'base_salary',
            'hourly_rate',
            'cnss_number',
            'bank_account',
            'bank_name',
            'bank_swift',
            'payment_method',
            'payment_method_display',
            'transport_allowance',
            'meal_allowance',
            'created_at',
            'updated_at',
        ]

    def get_employee_name(self, obj):
        return (
            f'{obj.employee.first_name} {obj.employee.last_name}'
            if obj.employee
            else ''
        )

    def get_contract_type_name(self, obj):
        return obj.contract_type.name if obj.contract_type else ''

    def get_payment_method_display(self, obj):
        return dict(EmployeePayroll.PAYMENT_METHOD_CHOICES).get(obj.payment_method, '')


class PaySlipLineSerializer(serializers.ModelSerializer):
    """Serializer pour les lignes de bulletin de paie."""

    component_name = serializers.SerializerMethodField()
    component_type = serializers.SerializerMethodField()

    class Meta:
        model = PaySlipLine
        fields = [
            'id',
            'payslip',
            'component',
            'component_name',
            'component_type',
            'amount',
            'base_amount',
            'rate',
            'quantity',
            'is_employer_contribution',
            'display_order',
            'created_at',
            'updated_at',
        ]

    def get_component_name(self, obj):
        return obj.component.name if obj.component else ''

    def get_component_type(self, obj):
        return obj.component.component_type if obj.component else ''


class BasicEmployeeSerializer(serializers.ModelSerializer):
    """Serializer simplifié pour les employés."""

    full_name = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = ['id', 'first_name', 'last_name', 'full_name', 'employee_id', 'email']

    def get_full_name(self, obj):
        return f'{obj.first_name} {obj.last_name}'


class PaySlipSerializer(serializers.ModelSerializer):
    """Serializer pour les bulletins de paie."""

    employee_data = BasicEmployeeSerializer(source='employee', read_only=True)
    period_name = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    lines = PaySlipLineSerializer(many=True, read_only=True)

    class Meta:
        model = PaySlip
        fields = [
            'id',
            'payroll_run',
            'period_name',
            'employee',
            'employee_data',
            'number',
            'worked_days',
            'absence_days',
            'paid_leave_days',
            'unpaid_leave_days',
            'overtime_25_hours',
            'overtime_50_hours',
            'overtime_100_hours',
            'basic_salary',
            'gross_salary',
            'taxable_salary',
            'net_salary',
            'cnss_employee',
            'cnss_employer',
            'amo_employee',
            'amo_employer',
            'income_tax',
            'status',
            'status_display',
            'is_paid',
            'payment_date',
            'payment_reference',
            'pdf_file',
            'notes',
            'lines',
            'created_at',
            'updated_at',
        ]

    def get_period_name(self, obj):
        return (
            obj.payroll_run.period.name
            if obj.payroll_run and obj.payroll_run.period
            else ''
        )

    def get_status_display(self, obj):
        return dict(PaySlip.STATUS_CHOICES).get(obj.status, '')


class PayrollRunSerializer(serializers.ModelSerializer):
    """Serializer pour les lancements de paie."""

    period_name = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    validated_by_name = serializers.SerializerMethodField()
    payslips_count = serializers.SerializerMethodField()
    payslips_summary = serializers.SerializerMethodField()

    class Meta:
        model = PayrollRun
        fields = [
            'id',
            'period',
            'period_name',
            'name',
            'description',
            'department',
            'department_name',
            'status',
            'status_display',
            'run_date',
            'calculated_date',
            'validated_date',
            'paid_date',
            'created_by',
            'created_by_name',
            'validated_by',
            'validated_by_name',
            'notes',
            'payslips_count',
            'payslips_summary',
            'created_at',
            'updated_at',
        ]

    def get_period_name(self, obj):
        return obj.period.name if obj.period else ''

    def get_department_name(self, obj):
        return obj.department.name if obj.department else 'Tous les départements'

    def get_status_display(self, obj):
        return dict(PayrollRun.STATUS_CHOICES).get(obj.status, '')

    def get_created_by_name(self, obj):
        return obj.created_by.full_name if obj.created_by else ''

    def get_validated_by_name(self, obj):
        return obj.validated_by.full_name if obj.validated_by else ''

    def get_payslips_count(self, obj):
        return obj.payslips.count()

    def get_payslips_summary(self, obj):
        payslips = obj.payslips.all()
        if not payslips:
            return {
                'total_gross': 0,
                'total_net': 0,
                'total_cnss_employee': 0,
                'total_cnss_employer': 0,
                'total_amo_employee': 0,
                'total_amo_employer': 0,
                'total_income_tax': 0,
                'status_counts': {},
            }

        # Calculer les totaux
        from django.db.models import Count, Sum

        totals = payslips.aggregate(
            total_gross=Sum('gross_salary'),
            total_net=Sum('net_salary'),
            total_cnss_employee=Sum('cnss_employee'),
            total_cnss_employer=Sum('cnss_employer'),
            total_amo_employee=Sum('amo_employee'),
            total_amo_employer=Sum('amo_employer'),
            total_income_tax=Sum('income_tax'),
        )

        # Compter par statut
        status_counts = payslips.values('status').annotate(count=Count('id'))
        status_dict = {item['status']: item['count'] for item in status_counts}

        totals['status_counts'] = status_dict
        return totals


class AdvanceSalarySerializer(serializers.ModelSerializer):
    """Serializer pour les acomptes sur salaire."""

    employee_name = serializers.SerializerMethodField()
    period_name = serializers.SerializerMethodField()
    payslip_number = serializers.SerializerMethodField()

    class Meta:
        model = AdvanceSalary
        fields = [
            'id',
            'employee',
            'employee_name',
            'period',
            'period_name',
            'amount',
            'payment_date',
            'is_paid',
            'notes',
            'payslip',
            'payslip_number',
            'created_at',
            'updated_at',
        ]

    def get_employee_name(self, obj):
        return obj.employee.full_name if obj.employee else ''

    def get_period_name(self, obj):
        return obj.period.name if obj.period else ''

    def get_payslip_number(self, obj):
        return obj.payslip.number if obj.payslip else ''
