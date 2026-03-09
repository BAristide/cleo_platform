# payroll/services/salary_calculator.py
"""
Moteur de calcul de paie generique — v3.26.0.
Les cotisations sont resolues dynamiquement depuis SalaryComponent.category
et SalaryComponent.rate_parameter_code, sans aucun hardcoding pays.
"""

from decimal import Decimal

from django.db import models

from ..models import (
    EmployeePayroll,
    PaySlipLine,
    SalaryComponent,
    TaxBracket,
)
from .parameter_resolver import PayrollParameterResolver

# Categories de cotisations gerees par le moteur generique
_COTISATION_CATEGORIES = (
    'social_employee',
    'social_employer',
    'health_employee',
    'health_employer',
    'other_deduction',
    'other_employer',
)

_EMPLOYER_CATEGORIES = ('social_employer', 'health_employer', 'other_employer')


class SalaryCalculator:
    """Classe de service pour calculer les salaires."""

    @staticmethod
    def calculate_payslip(payslip, recalculate=False):
        """Calcule ou recalcule un bulletin de paie."""
        if payslip.status != 'draft' and not recalculate:
            raise ValueError(
                "Impossible de calculer un bulletin qui n'est pas en brouillon"
            )

        # Validation de completude du pack de paie
        pack_check = PayrollParameterResolver.validate_pack()
        if not pack_check['valid']:
            raise ValueError(
                f'Pack de paie incomplet — {len(pack_check["missing"])} parametre(s) manquant(s) : '
                f'{pack_check["missing"]}. '
                f"Lancez 'python manage.py init_payroll_data --locale <pack> --force'."
            )

        employee = payslip.employee
        payroll_info = EmployeePayroll.objects.get(employee=employee)

        # Date de reference pour la resolution des taux (PAIE-23)
        ref_date = None
        if payslip.payroll_run and payslip.payroll_run.period:
            ref_date = payslip.payroll_run.period.end_date

        # Supprimer les anciennes lignes si recalcul
        if recalculate:
            PaySlipLine.objects.filter(payslip=payslip).delete()

        # ── 1. Salaire de base ──
        base_salary = SalaryCalculator._calculate_base_salary(payslip, payroll_info)
        payslip.basic_salary = base_salary

        base_component = SalaryComponent.objects.get(code='SALBASE')
        PaySlipLine.objects.create(
            payslip=payslip,
            component=base_component,
            amount=base_salary,
            display_order=base_component.default_display_order or 10,
        )

        # ── 2. Heures supplementaires ──
        for rate_val, code, hours_field, order in [
            (Decimal('0.25'), 'HS25', 'overtime_25_hours', 20),
            (Decimal('0.50'), 'HS50', 'overtime_50_hours', 21),
            (Decimal('1.00'), 'HS100', 'overtime_100_hours', 22),
        ]:
            hours = getattr(payslip, hours_field, Decimal('0'))
            if hours > 0:
                amount = SalaryCalculator._calculate_overtime(payslip, rate_val)
                comp = SalaryComponent.objects.get(code=code)
                PaySlipLine.objects.create(
                    payslip=payslip,
                    component=comp,
                    amount=amount,
                    quantity=hours,
                    display_order=comp.default_display_order or order,
                )

        # ── 3. Prime d'anciennete ──
        seniority_amount = SalaryCalculator._calculate_seniority_bonus(
            payslip, base_salary
        )
        if seniority_amount > 0:
            seniority_comp = SalaryComponent.objects.get(code='ANCIENNETE')
            PaySlipLine.objects.create(
                payslip=payslip,
                component=seniority_comp,
                amount=seniority_amount,
                display_order=seniority_comp.default_display_order or 30,
            )

        # ── 4. Indemnites fixes ──
        if payroll_info.transport_allowance > 0:
            transport_comp = SalaryComponent.objects.get(code='TRANSPORT')
            PaySlipLine.objects.create(
                payslip=payslip,
                component=transport_comp,
                amount=payroll_info.transport_allowance,
                display_order=transport_comp.default_display_order or 40,
            )

        if payroll_info.meal_allowance > 0:
            meal_comp = SalaryComponent.objects.get(code='REPAS')
            PaySlipLine.objects.create(
                payslip=payslip,
                component=meal_comp,
                amount=payroll_info.meal_allowance,
                display_order=meal_comp.default_display_order or 41,
            )

        # ── 5. Primes dynamiques (EmployeeAllowance) ──
        for allowance in payroll_info.allowances.filter(is_active=True).select_related(
            'component'
        ):
            PaySlipLine.objects.create(
                payslip=payslip,
                component=allowance.component,
                amount=allowance.amount,
                display_order=allowance.component.default_display_order or 45,
            )

        # ── 6. Salaire brut ──
        gross_salary = SalaryCalculator._calculate_gross_salary(payslip)
        payslip.gross_salary = gross_salary

        # ── 7. Bases de cotisation ──
        cnss_base = SalaryCalculator._get_cnss_base(payslip)

        # ── 8. Cotisations generiques (moteur pack-agnostique) ──
        cotisation_components = (
            SalaryComponent.objects.filter(
                category__in=_COTISATION_CATEGORIES,
                is_active=True,
            )
            .exclude(rate_parameter_code='')
            .order_by('default_display_order', 'code')
        )

        for comp in cotisation_components:
            rate = PayrollParameterResolver.get_optional(
                comp.rate_parameter_code, reference_date=ref_date
            )
            if rate is None or rate <= 0:
                continue

            # Determiner la base selon base_rule
            if comp.base_rule == 'capped':
                cap_code = comp.cap_parameter_code
                if cap_code:
                    cap = PayrollParameterResolver.get_required(
                        comp.cap_parameter_code, reference_date=ref_date
                    )
                    base = min(cnss_base, cap)
                else:
                    base = cnss_base
            elif comp.base_rule == 'gross':
                base = gross_salary
            elif comp.base_rule == 'taxable':
                # taxable_salary pas encore calcule ici, utiliser estimation
                base = gross_salary
            else:
                base = gross_salary

            amount = base * rate / Decimal('100')
            is_employer = comp.category in _EMPLOYER_CATEGORIES

            PaySlipLine.objects.create(
                payslip=payslip,
                component=comp,
                amount=-amount if not is_employer else amount,
                base_amount=base,
                rate=rate,
                is_employer_contribution=is_employer,
                display_order=comp.default_display_order or 50,
            )

        # ── 9. Remplir les champs agreges pour retrocompatibilite ──
        _lines = PaySlipLine.objects.filter(payslip=payslip).select_related('component')

        payslip.cnss_employee = sum(
            abs(ln.amount)
            for ln in _lines
            if ln.component.category == 'social_employee'
        )
        payslip.amo_employee = sum(
            abs(ln.amount)
            for ln in _lines
            if ln.component.category == 'health_employee'
        )
        payslip.cnss_employer = sum(
            abs(ln.amount)
            for ln in _lines
            if ln.component.category == 'social_employer'
        )
        payslip.amo_employer = sum(
            abs(ln.amount)
            for ln in _lines
            if ln.component.category == 'health_employer'
        )

        # ── 10. Salaire imposable ──
        total_employee_cotisations = payslip.cnss_employee + payslip.amo_employee
        # Ajouter les other_deduction au total
        total_employee_cotisations += sum(
            abs(ln.amount)
            for ln in _lines
            if ln.component.category == 'other_deduction'
        )
        taxable_salary = gross_salary - total_employee_cotisations
        payslip.taxable_salary = taxable_salary

        # ── 11. Impot sur le revenu (moteur fiscal specialise) ──
        income_tax = SalaryCalculator._calculate_income_tax(payslip, taxable_salary)
        payslip.income_tax = income_tax

        ir_component = SalaryComponent.objects.get(code='IR')
        PaySlipLine.objects.create(
            payslip=payslip,
            component=ir_component,
            amount=-income_tax,
            base_amount=taxable_salary,
            display_order=ir_component.default_display_order or 60,
        )

        # ── 12. Acomptes ──
        advances = payslip.advances.filter(is_paid=True, payslip__isnull=True)
        advance_total = sum(a.amount for a in advances)

        if advance_total > 0:
            advance_component = SalaryComponent.objects.get(code='ACOMPTE')
            PaySlipLine.objects.create(
                payslip=payslip,
                component=advance_component,
                amount=-advance_total,
                display_order=advance_component.default_display_order or 70,
            )
            for advance in advances:
                advance.payslip = payslip
                advance.save(update_fields=['payslip'])

        # ── 13. Salaire net ──
        net_salary = (
            gross_salary
            - payslip.cnss_employee
            - payslip.amo_employee
            - sum(
                abs(ln.amount)
                for ln in _lines
                if ln.component.category == 'other_deduction'
            )
            - income_tax
            - advance_total
        )
        payslip.net_salary = net_salary

        # ── 14. Statut ──
        payslip.status = 'calculated'
        payslip.save()

        return payslip

    # ── Methodes de calcul inchangees ──

    @staticmethod
    def _calculate_base_salary(payslip, payroll_info):
        full_salary = payroll_info.base_salary
        base_days = PayrollParameterResolver.get_required('WORKING_DAYS_MONTH')
        actual_days = base_days - payslip.absence_days - payslip.unpaid_leave_days
        return (full_salary / base_days) * actual_days

    @staticmethod
    def _calculate_overtime(payslip, rate):
        employee = payslip.employee
        payroll_info = EmployeePayroll.objects.get(employee=employee)
        monthly_hours = PayrollParameterResolver.get_required('WORKING_HOURS_MONTH')
        hourly_rate = payroll_info.base_salary / monthly_hours
        if rate == Decimal('0.25'):
            hours = payslip.overtime_25_hours
        elif rate == Decimal('0.50'):
            hours = payslip.overtime_50_hours
        elif rate == Decimal('1.00'):
            hours = payslip.overtime_100_hours
        else:
            hours = Decimal('0.0')
        return hourly_rate * hours * (1 + rate)

    @staticmethod
    def _calculate_seniority_bonus(payslip, base_salary):
        employee = payslip.employee
        today = payslip.payroll_run.period.end_date
        hire_date = employee.hire_date
        years = today.year - hire_date.year
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
        return base_salary * rate

    @staticmethod
    def _calculate_gross_salary(payslip):
        positive_lines = PaySlipLine.objects.filter(payslip=payslip, amount__gt=0)
        return sum(line.amount for line in positive_lines)

    @staticmethod
    def _get_cnss_base(payslip):
        cnss_lines = PaySlipLine.objects.filter(
            payslip=payslip, component__is_cnss_eligible=True, amount__gt=0
        )
        return sum(line.amount for line in cnss_lines)

    # ── Moteur fiscal (inchange) ──

    TAX_METHOD_PROGRESSIVE = 0
    TAX_METHOD_QUOTIENT_FAMILIAL = 1
    TAX_METHOD_ABATEMENT = 2

    @staticmethod
    def _calculate_income_tax(payslip, taxable_salary):
        method = int(PayrollParameterResolver.get_optional('TAX_CALCULATION_METHOD'))
        if method == SalaryCalculator.TAX_METHOD_QUOTIENT_FAMILIAL:
            return SalaryCalculator._calculate_tax_quotient_familial(
                payslip, taxable_salary
            )
        elif method == SalaryCalculator.TAX_METHOD_ABATEMENT:
            return SalaryCalculator._calculate_tax_with_abatement(
                payslip, taxable_salary
            )
        else:
            return SalaryCalculator._calculate_tax_progressive_deduction(
                payslip, taxable_salary
            )

    @staticmethod
    def _get_tax_brackets(payslip):
        today = payslip.payroll_run.period.end_date
        return (
            TaxBracket.objects.filter(effective_date__lte=today)
            .filter(models.Q(end_date__isnull=True) | models.Q(end_date__gte=today))
            .order_by('min_amount')
        )

    @staticmethod
    def _apply_progressive_tax(taxable_annual, brackets):
        tax = Decimal('0.0')
        for bracket in brackets:
            if bracket.max_amount is None:
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
        return max(tax, Decimal('0.0'))

    @staticmethod
    def _calculate_tax_progressive_deduction(payslip, taxable_salary):
        brackets = SalaryCalculator._get_tax_brackets(payslip)
        employee = payslip.employee
        annual_salary = taxable_salary * 12
        family_deduction = Decimal('0')
        spouse_deduction = PayrollParameterResolver.get_optional('SPOUSE_DEDUCTION')
        child_deduction_unit = PayrollParameterResolver.get_optional('CHILD_DEDUCTION')
        max_children = int(
            PayrollParameterResolver.get_optional('MAX_DEPENDENT_CHILDREN')
        )
        if employee.marital_status == 'married':
            family_deduction += spouse_deduction
        child_count = (
            min(employee.dependent_children, max_children) if max_children > 0 else 0
        )
        family_deduction += child_count * child_deduction_unit
        taxable_annual = max(annual_salary - family_deduction, Decimal('0'))
        tax = SalaryCalculator._apply_progressive_tax(taxable_annual, brackets)
        monthly_tax = tax / 12
        return monthly_tax if monthly_tax > 0 else Decimal('0.0')

    @staticmethod
    def _calculate_tax_quotient_familial(payslip, taxable_salary):
        brackets = SalaryCalculator._get_tax_brackets(payslip)
        employee = payslip.employee
        annual_salary = taxable_salary * 12
        abatement_rate = PayrollParameterResolver.get_optional(
            'TAX_GROSS_ABATEMENT_RATE'
        )
        if abatement_rate > 0:
            abatement = annual_salary * abatement_rate / Decimal('100')
            abatement_cap = PayrollParameterResolver.get_optional('TAX_ABATEMENT_CAP')
            if abatement_cap > 0 and abatement > abatement_cap:
                abatement = abatement_cap
            annual_salary = max(annual_salary - abatement, Decimal('0'))
        parts_single = PayrollParameterResolver.get_optional('TAX_PARTS_SINGLE')
        parts_married = PayrollParameterResolver.get_optional('TAX_PARTS_MARRIED')
        parts_per_child = PayrollParameterResolver.get_optional('TAX_PARTS_PER_CHILD')
        max_parts = PayrollParameterResolver.get_optional('TAX_MAX_PARTS')
        if parts_single <= 0:
            parts_single = Decimal('1.0')
        if employee.marital_status == 'married':
            parts = parts_married if parts_married > 0 else Decimal('2.0')
        else:
            parts = parts_single
        parts += employee.dependent_children * parts_per_child
        if max_parts > 0:
            parts = min(parts, max_parts)
        revenue_per_part = annual_salary / parts if parts > 0 else annual_salary
        tax_per_part = SalaryCalculator._apply_progressive_tax(
            revenue_per_part, brackets
        )
        tax_brut = tax_per_part * parts
        reduction_rate = PayrollParameterResolver.get_optional(
            'TAX_FAMILY_REDUCTION_RATE'
        )
        if reduction_rate > 0 and parts > Decimal('1.0'):
            extra_half_parts = (parts - Decimal('1.0')) * 2
            reduction_pct = extra_half_parts * reduction_rate
            reduction_cap = PayrollParameterResolver.get_optional(
                'TAX_FAMILY_REDUCTION_CAP'
            )
            reduction = tax_brut * reduction_pct / Decimal('100')
            if reduction_cap > 0 and reduction > reduction_cap:
                reduction = reduction_cap
            tax_brut = max(tax_brut - reduction, Decimal('0'))
        monthly_tax = tax_brut / 12
        return monthly_tax if monthly_tax > 0 else Decimal('0.0')

    @staticmethod
    def _calculate_tax_with_abatement(payslip, taxable_salary):
        brackets = SalaryCalculator._get_tax_brackets(payslip)
        employee = payslip.employee
        annual_salary = taxable_salary * 12
        abatement_rate = PayrollParameterResolver.get_optional(
            'TAX_GROSS_ABATEMENT_RATE'
        )
        if abatement_rate > 0:
            abatement = annual_salary * abatement_rate / Decimal('100')
            annual_salary = max(annual_salary - abatement, Decimal('0'))
        tax_brut = SalaryCalculator._apply_progressive_tax(annual_salary, brackets)
        reduction_rate = PayrollParameterResolver.get_optional(
            'TAX_FAMILY_REDUCTION_RATE'
        )
        if reduction_rate > 0:
            reduction_pct = Decimal('0')
            if employee.marital_status == 'married':
                reduction_pct += reduction_rate
            child_rate = PayrollParameterResolver.get_optional('TAX_FAMILY_CHILD_RATE')
            reduction_pct += min(employee.dependent_children, 6) * child_rate
            reduction_cap = PayrollParameterResolver.get_optional(
                'TAX_FAMILY_REDUCTION_CAP'
            )
            if reduction_cap > 0:
                reduction_pct = min(reduction_pct, reduction_cap)
            tax_brut = tax_brut * (Decimal('100') - reduction_pct) / Decimal('100')
        monthly_tax = tax_brut / 12
        return monthly_tax if monthly_tax > 0 else Decimal('0.0')
