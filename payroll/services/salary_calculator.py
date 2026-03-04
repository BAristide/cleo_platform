# payroll/services/salary_calculator.py
from decimal import Decimal

from django.db import models

from ..models import (
    EmployeePayroll,
    PaySlipLine,
    SalaryComponent,
    TaxBracket,
)
from .parameter_resolver import PayrollParameterResolver


class SalaryCalculator:
    """Classe de service pour calculer les salaires."""

    @staticmethod
    def calculate_payslip(payslip, recalculate=False):
        """Calcule ou recalcule un bulletin de paie."""
        if payslip.status != 'draft' and not recalculate:
            raise ValueError(
                "Impossible de calculer un bulletin qui n'est pas en brouillon"
            )

        # Validation de complétude du pack de paie
        pack_check = PayrollParameterResolver.validate_pack()
        if not pack_check['valid']:
            raise ValueError(
                f'Pack de paie incomplet — {len(pack_check["missing"])} paramètre(s) manquant(s) : '
                f'{pack_check["missing"]}. '
                f"Lancez 'python manage.py init_payroll_data --locale <pack> --force'."
            )

        employee = payslip.employee
        payroll_info = EmployeePayroll.objects.get(employee=employee)

        # Récupérer la période de paie
        _period = payslip.payroll_run.period

        # Calculer le salaire de base au prorata des jours travaillés
        base_salary = SalaryCalculator._calculate_base_salary(payslip, payroll_info)
        payslip.basic_salary = base_salary

        # Supprimer les anciennes lignes si recalcul
        if recalculate:
            PaySlipLine.objects.filter(payslip=payslip).delete()

        # Créer la ligne de salaire de base
        base_component = SalaryComponent.objects.get(code='SALBASE')
        PaySlipLine.objects.create(
            payslip=payslip,
            component=base_component,
            amount=base_salary,
            display_order=10,
        )

        # Calculer les heures supplémentaires
        hs_25_amount = SalaryCalculator._calculate_overtime(payslip, Decimal('0.25'))
        hs_50_amount = SalaryCalculator._calculate_overtime(payslip, Decimal('0.50'))
        hs_100_amount = SalaryCalculator._calculate_overtime(payslip, Decimal('1.00'))

        # Ajouter les lignes d'heures supplémentaires si nécessaire
        if payslip.overtime_25_hours > 0:
            hs_25_component = SalaryComponent.objects.get(code='HS25')
            PaySlipLine.objects.create(
                payslip=payslip,
                component=hs_25_component,
                amount=hs_25_amount,
                quantity=payslip.overtime_25_hours,
                display_order=20,
            )

        if payslip.overtime_50_hours > 0:
            hs_50_component = SalaryComponent.objects.get(code='HS50')
            PaySlipLine.objects.create(
                payslip=payslip,
                component=hs_50_component,
                amount=hs_50_amount,
                quantity=payslip.overtime_50_hours,
                display_order=21,
            )

        if payslip.overtime_100_hours > 0:
            hs_100_component = SalaryComponent.objects.get(code='HS100')
            PaySlipLine.objects.create(
                payslip=payslip,
                component=hs_100_component,
                amount=hs_100_amount,
                quantity=payslip.overtime_100_hours,
                display_order=22,
            )

        # Calculer la prime d'ancienneté
        seniority_amount = SalaryCalculator._calculate_seniority_bonus(
            payslip, base_salary
        )
        if seniority_amount > 0:
            seniority_component = SalaryComponent.objects.get(code='ANCIENNETE')
            PaySlipLine.objects.create(
                payslip=payslip,
                component=seniority_component,
                amount=seniority_amount,
                display_order=30,
            )

        # Ajouter les indemnités régulières
        if payroll_info.transport_allowance > 0:
            transport_component = SalaryComponent.objects.get(code='TRANSPORT')
            PaySlipLine.objects.create(
                payslip=payslip,
                component=transport_component,
                amount=payroll_info.transport_allowance,
                display_order=40,
            )

        if payroll_info.meal_allowance > 0:
            meal_component = SalaryComponent.objects.get(code='REPAS')
            PaySlipLine.objects.create(
                payslip=payslip,
                component=meal_component,
                amount=payroll_info.meal_allowance,
                display_order=41,
            )

        # Calculer le salaire brut
        gross_salary = SalaryCalculator._calculate_gross_salary(payslip)
        payslip.gross_salary = gross_salary

        # Calculer les cotisations CNSS et AMO
        cnss_base = SalaryCalculator._get_cnss_base(payslip)
        cnss_ceiling = PayrollParameterResolver.get_required('CNSS_CEILING')
        if cnss_base > cnss_ceiling:
            cnss_base = cnss_ceiling

        # Taux CNSS employé et employeur
        cnss_employee_rate = (
            PayrollParameterResolver.get_required('CNSS_EMPLOYEE_RATE') / 100
        )
        cnss_employer_rate = (
            PayrollParameterResolver.get_required('CNSS_EMPLOYER_RATE') / 100
        )

        # Taux AMO employé et employeur
        amo_employee_rate = (
            PayrollParameterResolver.get_required('AMO_EMPLOYEE_RATE') / 100
        )
        amo_employer_rate = (
            PayrollParameterResolver.get_required('AMO_EMPLOYER_RATE') / 100
        )

        # Calcul des cotisations
        cnss_employee_amount = cnss_base * cnss_employee_rate
        cnss_employer_amount = cnss_base * cnss_employer_rate
        amo_employee_amount = gross_salary * amo_employee_rate
        amo_employer_amount = gross_salary * amo_employer_rate

        # Enregistrer dans le bulletin
        payslip.cnss_employee = cnss_employee_amount
        payslip.cnss_employer = cnss_employer_amount
        payslip.amo_employee = amo_employee_amount
        payslip.amo_employer = amo_employer_amount

        # Créer les lignes de cotisations
        cnss_component = SalaryComponent.objects.get(code='CNSS_EMP')
        PaySlipLine.objects.create(
            payslip=payslip,
            component=cnss_component,
            amount=-cnss_employee_amount,
            base_amount=cnss_base,
            rate=cnss_employee_rate * 100,
            display_order=50,
        )

        amo_component = SalaryComponent.objects.get(code='AMO_EMP')
        PaySlipLine.objects.create(
            payslip=payslip,
            component=amo_component,
            amount=-amo_employee_amount,
            base_amount=gross_salary,
            rate=amo_employee_rate * 100,
            display_order=51,
        )

        # Calculer le salaire imposable
        taxable_salary = gross_salary - cnss_employee_amount - amo_employee_amount
        payslip.taxable_salary = taxable_salary

        # Calculer l'impôt sur le revenu (IR)
        income_tax = SalaryCalculator._calculate_income_tax(payslip, taxable_salary)
        payslip.income_tax = income_tax

        # Créer la ligne de l'IR
        ir_component = SalaryComponent.objects.get(code='IR')
        PaySlipLine.objects.create(
            payslip=payslip,
            component=ir_component,
            amount=-income_tax,
            base_amount=taxable_salary,
            display_order=60,
        )

        # Déduire les acomptes
        advances = payslip.advances.filter(is_paid=True, payslip__isnull=True)
        advance_total = sum(a.amount for a in advances)

        if advance_total > 0:
            advance_component = SalaryComponent.objects.get(code='ACOMPTE')
            PaySlipLine.objects.create(
                payslip=payslip,
                component=advance_component,
                amount=-advance_total,
                display_order=70,
            )

            # Marquer les acomptes comme utilisés
            for advance in advances:
                advance.payslip = payslip
                advance.save(update_fields=['payslip'])

        # Calculer le salaire net
        net_salary = (
            gross_salary
            - cnss_employee_amount
            - amo_employee_amount
            - income_tax
            - advance_total
        )
        payslip.net_salary = net_salary

        # Mettre à jour le statut et la date de calcul
        payslip.status = 'calculated'
        payslip.save()

        return payslip

    @staticmethod
    def _calculate_base_salary(payslip, payroll_info):
        """Calcule le salaire de base au prorata des jours travaillés."""
        full_salary = payroll_info.base_salary

        # Jours ouvrés par mois depuis les paramètres de paie
        base_days = PayrollParameterResolver.get_required('WORKING_DAYS_MONTH')

        actual_days = base_days - payslip.absence_days - payslip.unpaid_leave_days

        # Calcul proratisé
        return (full_salary / base_days) * actual_days

    @staticmethod
    def _calculate_overtime(payslip, rate):
        """Calcule la rémunération des heures supplémentaires."""
        employee = payslip.employee
        payroll_info = EmployeePayroll.objects.get(employee=employee)

        # Heures standard par mois depuis les paramètres de paie
        monthly_hours = PayrollParameterResolver.get_required('WORKING_HOURS_MONTH')

        hourly_rate = payroll_info.base_salary / monthly_hours

        # Déterminer les heures concernées
        if rate == Decimal('0.25'):
            hours = payslip.overtime_25_hours
        elif rate == Decimal('0.50'):
            hours = payslip.overtime_50_hours
        elif rate == Decimal('1.00'):
            hours = payslip.overtime_100_hours
        else:
            hours = Decimal('0.0')

        # Calculer le montant
        amount = hourly_rate * hours * (1 + rate)
        return amount

    @staticmethod
    def _calculate_seniority_bonus(payslip, base_salary):
        """Calcule la prime d'ancienneté selon les paramètres du locale_pack."""
        employee = payslip.employee

        # Calculer l'ancienneté en années
        today = payslip.payroll_run.period.end_date
        hire_date = employee.hire_date
        years = today.year - hire_date.year

        # Ajuster si l'anniversaire d'embauche n'est pas encore passé cette année
        if (today.month, today.day) < (hire_date.month, hire_date.day):
            years -= 1

        rate = Decimal('0.0')
        if years >= 25:
            rate = PayrollParameterResolver.get_optional('SENIORITY_25Y_RATE') / 100
        elif years >= 20:
            rate = PayrollParameterResolver.get_optional('SENIORITY_20Y_RATE') / 100
        elif years >= 12:
            rate = PayrollParameterResolver.get_optional('SENIORITY_12Y_RATE') / 100
        elif years >= 5:
            rate = PayrollParameterResolver.get_optional('SENIORITY_5Y_RATE') / 100
        elif years >= 2:
            rate = PayrollParameterResolver.get_optional('SENIORITY_2Y_RATE') / 100

        # Calculer la prime d'ancienneté
        return base_salary * rate

    @staticmethod
    def _calculate_gross_salary(payslip):
        """Calcule le salaire brut en additionnant toutes les composantes positives."""
        positive_lines = PaySlipLine.objects.filter(payslip=payslip, amount__gt=0)
        return sum(line.amount for line in positive_lines)

    @staticmethod
    def _get_cnss_base(payslip):
        """Récupère la base de calcul pour les cotisations CNSS."""
        # Récupérer les lignes soumises à CNSS
        cnss_lines = PaySlipLine.objects.filter(
            payslip=payslip, component__is_cnss_eligible=True, amount__gt=0
        )
        return sum(line.amount for line in cnss_lines)

    @staticmethod
    def _calculate_income_tax(payslip, taxable_salary):
        """Calcule l'impôt sur le revenu (IR)."""
        # Récupérer les tranches d'imposition en vigueur
        today = payslip.payroll_run.period.end_date
        brackets = (
            TaxBracket.objects.filter(effective_date__lte=today)
            .filter(models.Q(end_date__isnull=True) | models.Q(end_date__gte=today))
            .order_by('min_amount')
        )

        # Récupérer l'employé
        employee = payslip.employee

        # Calculer l'IR annuel
        annual_salary = taxable_salary * 12

        # Déductions pour charges de famille (depuis paramètres de paie)
        family_deduction = Decimal('0')

        spouse_deduction = PayrollParameterResolver.get_optional('SPOUSE_DEDUCTION')
        child_deduction_unit = PayrollParameterResolver.get_optional('CHILD_DEDUCTION')
        max_children = int(
            PayrollParameterResolver.get_optional('MAX_DEPENDENT_CHILDREN')
        )

        # Si marié, déduction pour le conjoint
        if employee.marital_status == 'married':
            family_deduction += spouse_deduction

        # Déduction pour enfants à charge
        child_count = (
            min(employee.dependent_children, max_children) if max_children > 0 else 0
        )
        child_deduction = child_count * child_deduction_unit
        family_deduction += child_deduction

        # Appliquer les déductions
        taxable_annual = annual_salary - family_deduction
        if taxable_annual < 0:
            taxable_annual = Decimal('0')

        # Calculer l'impôt selon les tranches
        tax = Decimal('0.0')
        for bracket in brackets:
            if bracket.max_amount is None:  # Dernière tranche
                if taxable_annual > bracket.min_amount:
                    tax += (taxable_annual - bracket.min_amount) * (
                        bracket.rate / Decimal('100')
                    )
            elif taxable_annual > bracket.min_amount:
                if taxable_annual > bracket.max_amount:
                    tax += (bracket.max_amount - bracket.min_amount) * (
                        bracket.rate / Decimal('100')
                    )
                else:
                    tax += (taxable_annual - bracket.min_amount) * (
                        bracket.rate / Decimal('100')
                    )

        # Soustraire la somme à déduire si applicable
        for bracket in brackets:
            if hasattr(bracket, 'deduction'):
                if bracket.max_amount is None and taxable_annual > bracket.min_amount:
                    tax -= bracket.deduction
                    break
                elif (
                    bracket.max_amount
                    and bracket.min_amount < taxable_annual <= bracket.max_amount
                ):
                    tax -= bracket.deduction
                    break

        # Impôt mensuel (diviser par 12)
        monthly_tax = tax / 12

        return monthly_tax if monthly_tax > 0 else Decimal('0.0')
