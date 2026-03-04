# payroll/services/pdf_generator.py
import os
from decimal import Decimal

from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone
from weasyprint import HTML

from core.services import get_company_context


class PayrollPDFGenerator:
    """Classe de service pour générer les PDF de paie."""

    @staticmethod
    def generate_payslip_pdf(payslip):
        """Génère le PDF d'un bulletin de paie."""
        employee = payslip.employee
        payroll_info = employee.payroll_info

        # Récupérer la devise active
        from core.models import Currency

        try:
            currency = Currency.objects.filter(is_default=True).first()
            currency_code = currency.code if currency else 'XOF'
        except Exception:
            currency_code = 'XOF'

        # Récupérer les taux depuis les paramètres
        from payroll.services.parameter_resolver import PayrollParameterResolver

        try:
            cnss_employee_rate = PayrollParameterResolver.get_required(
                'CNSS_EMPLOYEE_RATE'
            )
            amo_employee_rate = PayrollParameterResolver.get_required(
                'AMO_EMPLOYEE_RATE'
            )
        except Exception:
            cnss_employee_rate = Decimal('0')
            amo_employee_rate = Decimal('0')

        # Calculer les totaux
        total_deductions = (
            (payslip.cnss_employee or Decimal('0'))
            + (payslip.amo_employee or Decimal('0'))
            + (payslip.income_tax or Decimal('0'))
        )
        total_employer = (payslip.cnss_employer or Decimal('0')) + (
            payslip.amo_employer or Decimal('0')
        )

        # Libellés sûrs pour contract_type et payment_method
        try:
            contract_type_display = payroll_info.get_contract_type_display()
        except Exception:
            contract_type_display = getattr(payroll_info, 'contract_type', '—')

        try:
            payment_method_display = payroll_info.get_payment_method_display()
        except Exception:
            payment_method_display = getattr(payroll_info, 'payment_method', '—')

        # Nom de période
        period_name = ''
        if payslip.payroll_run and payslip.payroll_run.period:
            period_name = payslip.payroll_run.period.name
        elif payslip.period:
            period_name = payslip.period.name

        context = {
            'payslip': payslip,
            'employee': employee,
            'payroll_info': payroll_info,
            'company': get_company_context(),
            'generation_date': timezone.now(),
            'currency_code': currency_code,
            'period_name': period_name,
            'cnss_employee_rate': cnss_employee_rate,
            'amo_employee_rate': amo_employee_rate,
            'total_deductions': total_deductions,
            'total_employer': total_employer,
            'contract_type_display': contract_type_display,
            'payment_method_display': payment_method_display,
        }

        html_string = render_to_string('payroll/pdf/payslip.html', context)

        output_dir = os.path.join(
            settings.MEDIA_ROOT,
            'payslips',
            str(payslip.payroll_run.period.id) if payslip.payroll_run else 'standalone',
        )
        os.makedirs(output_dir, exist_ok=True)

        filename = f'bulletin_{payslip.number}_{employee.employee_id}.pdf'
        output_path = os.path.join(output_dir, filename)

        HTML(string=html_string).write_pdf(output_path)

        period_id = (
            str(payslip.payroll_run.period.id) if payslip.payroll_run else 'standalone'
        )
        relative_path = os.path.join('payslips', period_id, filename)
        payslip.pdf_file = relative_path
        payslip.save(update_fields=['pdf_file'])

        return relative_path

    @staticmethod
    def generate_payroll_run_summary(payroll_run):
        """Génère un récapitulatif PDF du lancement de paie."""
        payslips = payroll_run.payslips.all()

        # Devise active
        from core.models import Currency

        try:
            currency = Currency.objects.filter(is_default=True).first()
            currency_code = currency.code if currency else 'XOF'
        except Exception:
            currency_code = 'XOF'

        context = {
            'payroll_run': payroll_run,
            'period': payroll_run.period,
            'payslips': payslips.order_by(
                'employee__last_name', 'employee__first_name'
            ),
            'summary': {
                'total_gross': sum(p.gross_salary or Decimal('0') for p in payslips),
                'total_net': sum(p.net_salary or Decimal('0') for p in payslips),
                'total_cnss_employee': sum(
                    p.cnss_employee or Decimal('0') for p in payslips
                ),
                'total_cnss_employer': sum(
                    p.cnss_employer or Decimal('0') for p in payslips
                ),
                'total_amo_employee': sum(
                    p.amo_employee or Decimal('0') for p in payslips
                ),
                'total_amo_employer': sum(
                    p.amo_employer or Decimal('0') for p in payslips
                ),
                'total_income_tax': sum(p.income_tax or Decimal('0') for p in payslips),
            },
            'company': get_company_context(),
            'generation_date': timezone.now(),
            'currency_code': currency_code,
        }

        html_string = render_to_string('payroll/pdf/payroll_summary.html', context)

        output_dir = os.path.join(
            settings.MEDIA_ROOT, 'payroll_reports', str(payroll_run.period.id)
        )
        os.makedirs(output_dir, exist_ok=True)

        filename = f'recapitulatif_paie_{payroll_run.id}_{payroll_run.period.name}.pdf'
        output_path = os.path.join(output_dir, filename)

        HTML(string=html_string).write_pdf(output_path)

        return os.path.join('payroll_reports', str(payroll_run.period.id), filename)
