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
    def _get_payroll_labels():
        """Résout les labels de paie depuis COUNTRY_PACKS via CompanySetup.country_code."""
        defaults = {
            'social': 'Cotisations sociales',
            'health': 'Cotisation complémentaire',
            'tax': 'Impôt sur le revenu',
            'social_number': 'N° immatriculation sociale',
        }
        try:
            from core.models import CompanySetup
            from core.views import COUNTRY_PACKS

            setup = CompanySetup.objects.first()
            if setup and setup.country_code:
                country_info = COUNTRY_PACKS.get(setup.country_code, {})
                return country_info.get('payroll_labels', defaults)
        except Exception:
            pass
        return defaults

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

        # Taux resolus dynamiquement via les PaySlipLines (v3.26.0)

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

        # Labels dynamiques depuis COUNTRY_PACKS
        payroll_labels = PayrollPDFGenerator._get_payroll_labels()

        # Charger les lignes triees
        from payroll.models import PaySlipLine

        all_lines = list(
            PaySlipLine.objects.filter(payslip=payslip)
            .select_related('component')
            .order_by('display_order', 'component__code')
        )
        gain_lines = [
            ln for ln in all_lines if ln.amount > 0 and not ln.is_employer_contribution
        ]
        deduction_lines = [
            ln for ln in all_lines if ln.amount < 0 and not ln.is_employer_contribution
        ]
        employer_lines = [
            ln for ln in all_lines if ln.is_employer_contribution and ln.amount > 0
        ]

        # Precalculer abs_amount pour le template
        for ln in deduction_lines:
            ln.abs_amount = abs(ln.amount)

        total_gains = sum(ln.amount for ln in gain_lines)
        total_retenues = sum(abs(ln.amount) for ln in deduction_lines)
        total_employer_lines = sum(ln.amount for ln in employer_lines)

        context = {
            'payslip': payslip,
            'employee': employee,
            'payroll_info': payroll_info,
            'company': get_company_context(),
            'generation_date': timezone.now(),
            'currency_code': currency_code,
            'period_name': period_name,
            'gain_lines': gain_lines,
            'deduction_lines': deduction_lines,
            'employer_lines': employer_lines,
            'total_gains': total_gains,
            'total_retenues': total_retenues,
            'total_employer_lines': total_employer_lines,
            'total_deductions': total_deductions,
            'total_employer': total_employer,
            'contract_type_display': contract_type_display,
            'payment_method_display': payment_method_display,
            'label_social': payroll_labels.get('social', 'Cotisations sociales'),
            'label_health': payroll_labels.get('health', 'Cotisation complémentaire'),
            'label_tax': payroll_labels.get('tax', 'Impôt sur le revenu'),
            'label_social_number': payroll_labels.get(
                'social_number', 'N° immatriculation sociale'
            ),
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

        # Devise active
        from core.models import Currency

        try:
            currency = Currency.objects.filter(is_default=True).first()
            currency_code = currency.code if currency else 'XOF'
        except Exception:
            currency_code = 'XOF'

        from collections import Counter

        payslips_list = list(
            payroll_run.payslips.all().order_by(
                'employee__last_name', 'employee__first_name'
            )
        )

        for p in payslips_list:
            p.employee_contributions = (p.cnss_employee or Decimal('0')) + (
                p.amo_employee or Decimal('0')
            )

        total_gross = sum(p.gross_salary or Decimal('0') for p in payslips_list)
        total_net = sum(p.net_salary or Decimal('0') for p in payslips_list)
        total_employee_contributions = sum(
            p.employee_contributions for p in payslips_list
        )
        total_employer_contributions = sum(
            (p.cnss_employer or Decimal('0')) + (p.amo_employer or Decimal('0'))
            for p in payslips_list
        )
        total_income_tax = sum(p.income_tax or Decimal('0') for p in payslips_list)

        # Labels dynamiques
        _payroll_labels = PayrollPDFGenerator._get_payroll_labels()

        context = {
            'payroll_run': payroll_run,
            'period': payroll_run.period,
            'payslips': payslips_list,
            'label_social': _payroll_labels.get('social', 'Cotisations sociales'),
            'label_health': _payroll_labels.get('health', 'Cotisation complémentaire'),
            'label_tax': _payroll_labels.get('tax', 'Impôt sur le revenu'),
            'summary': {
                'total_gross': total_gross,
                'total_net': total_net,
                'total_employee_contributions': total_employee_contributions,
                'total_employer_contributions': total_employer_contributions,
                'total_income_tax': total_income_tax,
                'total_social_employee': total_employee_contributions
                + total_income_tax,
                'total_social_all': (
                    total_employee_contributions
                    + total_employer_contributions
                    + total_income_tax
                ),
                'status_counts': dict(Counter(p.status for p in payslips_list)),
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
