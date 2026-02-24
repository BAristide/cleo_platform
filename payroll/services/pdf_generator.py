# payroll/services/pdf_generator.py
import os

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
        context = {
            'payslip': payslip,
            'employee': payslip.employee,
            'payroll_info': payslip.employee.payroll_info,
            'lines': payslip.lines.all().order_by('display_order'),
            'company': get_company_context(),
            'generation_date': timezone.now().date(),
        }

        html_string = render_to_string('payroll/pdf/payslip.html', context)

        output_dir = os.path.join(
            settings.MEDIA_ROOT, 'payslips', str(payslip.payroll_run.period.id)
        )
        os.makedirs(output_dir, exist_ok=True)

        filename = f'bulletin_{payslip.number}_{payslip.employee.employee_id}.pdf'
        output_path = os.path.join(output_dir, filename)

        HTML(string=html_string).write_pdf(output_path)

        relative_path = os.path.join(
            'payslips', str(payslip.payroll_run.period.id), filename
        )
        payslip.pdf_file = relative_path
        payslip.save(update_fields=['pdf_file'])

        return relative_path

    @staticmethod
    def generate_payroll_run_summary(payroll_run):
        """Génère un récapitulatif PDF du lancement de paie."""
        context = {
            'payroll_run': payroll_run,
            'period': payroll_run.period,
            'payslips': payroll_run.payslips.all().order_by(
                'employee__last_name', 'employee__first_name'
            ),
            'summary': {
                'total_gross': sum(p.gross_salary for p in payroll_run.payslips.all()),
                'total_net': sum(p.net_salary for p in payroll_run.payslips.all()),
                'total_cnss_employee': sum(
                    p.cnss_employee for p in payroll_run.payslips.all()
                ),
                'total_cnss_employer': sum(
                    p.cnss_employer for p in payroll_run.payslips.all()
                ),
                'total_amo_employee': sum(
                    p.amo_employee for p in payroll_run.payslips.all()
                ),
                'total_amo_employer': sum(
                    p.amo_employer for p in payroll_run.payslips.all()
                ),
                'total_income_tax': sum(
                    p.income_tax for p in payroll_run.payslips.all()
                ),
            },
            'company': get_company_context(),
            'generation_date': timezone.now().date(),
        }

        html_string = render_to_string('payroll/pdf/payroll_summary.html', context)

        output_dir = os.path.join(
            settings.MEDIA_ROOT, 'payroll_reports', str(payroll_run.period.id)
        )
        os.makedirs(output_dir, exist_ok=True)

        filename = (
            f'récapitulatif_paie_{payroll_run.name}_{payroll_run.period.name}.pdf'
        )
        output_path = os.path.join(output_dir, filename)

        HTML(string=html_string).write_pdf(output_path)

        return os.path.join('payroll_reports', str(payroll_run.period.id), filename)
