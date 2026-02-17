# payroll/services/pdf_generator.py
import os

from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone
from weasyprint import HTML


class PayrollPDFGenerator:
    """Classe de service pour générer les PDF de paie."""

    @staticmethod
    def generate_payslip_pdf(payslip):
        """Génère le PDF d'un bulletin de paie."""
        # Préparer le contexte pour le template
        context = {
            'payslip': payslip,
            'employee': payslip.employee,
            'payroll_info': payslip.employee.payroll_info,
            'lines': payslip.lines.all().order_by('display_order'),
            'company': {
                'name': 'ECINTELLIGENCE',
                'address': 'La Marina Casablanca | Tour Oceanes 3 Bureau 03 Rez-De-Jardin',
                'city': 'Casablanca',
                'country': 'Maroc',
                'tax_id': 'IF 25018675',
                'rc': 'RC 393329',
                'patente': 'Patente 350424929',
                'ice': 'ICE 00203009000092',
            },
            'generation_date': timezone.now().date(),
        }

        # Rendre le template HTML
        html_string = render_to_string('payroll/pdf/payslip.html', context)

        # Créer le répertoire de sortie si nécessaire
        output_dir = os.path.join(
            settings.MEDIA_ROOT, 'payslips', str(payslip.payroll_run.period.id)
        )
        os.makedirs(output_dir, exist_ok=True)

        # Nom du fichier PDF
        filename = f'bulletin_{payslip.number}_{payslip.employee.employee_id}.pdf'
        output_path = os.path.join(output_dir, filename)

        # Générer le PDF
        HTML(string=html_string).write_pdf(output_path)

        # Mettre à jour le chemin du PDF dans le bulletin
        relative_path = os.path.join(
            'payslips', str(payslip.payroll_run.period.id), filename
        )
        payslip.pdf_file = relative_path
        payslip.save(update_fields=['pdf_file'])

        return relative_path

    @staticmethod
    def generate_payroll_run_summary(payroll_run):
        """Génère un récapitulatif PDF du lancement de paie."""
        # Préparer le contexte pour le template
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
            'company': {
                'name': 'ECINTELLIGENCE',
                'address': 'La Marina Casablanca | Tour Oceanes 3 Bureau 03 Rez-De-Jardin',
                'city': 'Casablanca',
                'country': 'Maroc',
                'tax_id': 'IF 25018675',
                'rc': 'RC 393329',
                'patente': 'Patente 350424929',
                'ice': 'ICE 00203009000092',
            },
            'generation_date': timezone.now().date(),
        }

        # Rendre le template HTML
        html_string = render_to_string('payroll/pdf/payroll_summary.html', context)

        # Créer le répertoire de sortie si nécessaire
        output_dir = os.path.join(
            settings.MEDIA_ROOT, 'payroll_reports', str(payroll_run.period.id)
        )
        os.makedirs(output_dir, exist_ok=True)

        # Nom du fichier PDF
        filename = (
            f'récapitulatif_paie_{payroll_run.name}_{payroll_run.period.name}.pdf'
        )
        output_path = os.path.join(output_dir, filename)

        # Générer le PDF
        HTML(string=html_string).write_pdf(output_path)

        return os.path.join('payroll_reports', str(payroll_run.period.id), filename)
