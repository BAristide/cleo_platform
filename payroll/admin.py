# payroll/admin.py
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from django.db.models import Sum
from .models import (
    PayrollPeriod, PayrollParameter, ContractType, 
    SalaryComponent, TaxBracket, EmployeePayroll,
    PayrollRun, PaySlip, PaySlipLine, AdvanceSalary
)
from .services.salary_calculator import SalaryCalculator
from .services.pdf_generator import PayrollPDFGenerator

class PayrollParameterAdmin(admin.ModelAdmin):
    """Administration des paramètres de paie."""
    list_display = ('code', 'name', 'value', 'effective_date', 'end_date', 'is_active')
    list_filter = ('is_active', 'effective_date')
    search_fields = ('code', 'name', 'description')
    ordering = ('code',)
    
    fieldsets = (
        ('Identification', {
            'fields': ('code', 'name', 'description')
        }),
        ('Valeur', {
            'fields': ('value', 'effective_date', 'end_date')
        }),
        ('Statut', {
            'fields': ('is_active',)
        }),
    )

admin.site.register(PayrollParameter, PayrollParameterAdmin)

class PayrollPeriodAdmin(admin.ModelAdmin):
    """Administration des périodes de paie."""
    list_display = ('name', 'start_date', 'end_date', 'is_closed')
    list_filter = ('is_closed',)
    search_fields = ('name',)
    ordering = ('-start_date',)
    
    actions = ['close_periods']
    
    def close_periods(self, request, queryset):
        """Action pour clôturer les périodes sélectionnées."""
        for period in queryset:
            period.is_closed = True
            period.save()
        
        self.message_user(request, f"{queryset.count()} période(s) clôturée(s) avec succès.")
    close_periods.short_description = "Clôturer les périodes sélectionnées"

admin.site.register(PayrollPeriod, PayrollPeriodAdmin)

class ContractTypeAdmin(admin.ModelAdmin):
    """Administration des types de contrat."""
    list_display = ('code', 'name', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('code', 'name', 'description')
    ordering = ('name',)

admin.site.register(ContractType, ContractTypeAdmin)

class SalaryComponentAdmin(admin.ModelAdmin):
    """Administration des composants de salaire."""
    list_display = ('code', 'name', 'component_type', 'is_taxable', 'is_cnss_eligible', 'is_active')
    list_filter = ('component_type', 'is_taxable', 'is_cnss_eligible', 'is_active')
    search_fields = ('code', 'name', 'description')
    ordering = ('component_type', 'code')
    
    fieldsets = (
        ('Identification', {
            'fields': ('code', 'name', 'description')
        }),
        ('Classification', {
            'fields': ('component_type', 'is_taxable', 'is_cnss_eligible')
        }),
        ('Calcul', {
            'fields': ('formula',)
        }),
        ('Statut', {
            'fields': ('is_active',)
        }),
    )

admin.site.register(SalaryComponent, SalaryComponentAdmin)

class TaxBracketAdmin(admin.ModelAdmin):
    """Administration des tranches d'imposition."""
    list_display = ('range_display', 'rate', 'deduction', 'effective_date', 'end_date')
    list_filter = ('effective_date',)
    ordering = ('min_amount',)
    
    def range_display(self, obj):
        if obj.max_amount:
            return f"{obj.min_amount} à {obj.max_amount}"
        return f"Plus de {obj.min_amount}"
    range_display.short_description = "Tranche"

admin.site.register(TaxBracket, TaxBracketAdmin)

class EmployeePayrollAdmin(admin.ModelAdmin):
    """Administration des données de paie des employés."""
    list_display = ('employee_name', 'contract_type', 'base_salary', 'payment_method')
    list_filter = ('contract_type', 'payment_method')
    search_fields = ('employee__first_name', 'employee__last_name', 'employee__employee_id', 'cnss_number')
    ordering = ('employee__last_name', 'employee__first_name')
    
    fieldsets = (
        ('Employé', {
            'fields': ('employee',)
        }),
        ('Contrat et rémunération', {
            'fields': ('contract_type', 'base_salary', 'hourly_rate')
        }),
        ('Identification fiscale et sociale', {
            'fields': ('cnss_number',)
        }),
        ('Coordonnées bancaires', {
            'fields': ('bank_account', 'bank_name', 'bank_swift', 'payment_method')
        }),
        ('Primes et indemnités régulières', {
            'fields': ('transport_allowance', 'meal_allowance')
        }),
    )
    
    def employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}" if obj.employee else ""
    employee_name.short_description = "Employé"

admin.site.register(EmployeePayroll, EmployeePayrollAdmin)

class PaySlipLineInline(admin.TabularInline):
    """Inline pour les lignes de bulletin de paie."""
    model = PaySlipLine
    extra = 0
    fields = ('component', 'amount', 'base_amount', 'rate', 'quantity', 'is_employer_contribution', 'display_order')
    readonly_fields = ('component', 'amount', 'base_amount', 'rate', 'quantity', 'is_employer_contribution')
    can_delete = False
    
    def has_add_permission(self, request, obj=None):
        return False

class PaySlipAdmin(admin.ModelAdmin):
    """Administration des bulletins de paie."""
    list_display = ('number', 'employee_name', 'period_name', 'status', 'gross_salary', 'net_salary', 'is_paid')
    list_filter = ('status', 'is_paid', 'payroll_run__period')
    search_fields = ('number', 'employee__first_name', 'employee__last_name', 'employee__employee_id')
    ordering = ('-payroll_run__period__start_date', 'employee__last_name')
    inlines = [PaySlipLineInline]
    
    fieldsets = (
        ('Identification', {
            'fields': ('payroll_run', 'employee', 'number')
        }),
        ('Données de présence', {
            'fields': ('worked_days', 'absence_days', 'paid_leave_days', 'unpaid_leave_days')
        }),
        ('Heures supplémentaires', {
            'fields': ('overtime_25_hours', 'overtime_50_hours', 'overtime_100_hours')
        }),
        ('Totaux calculés', {
            'fields': ('basic_salary', 'gross_salary', 'taxable_salary', 'net_salary')
        }),
        ('Cotisations et impôts', {
            'fields': ('cnss_employee', 'cnss_employer', 'amo_employee', 'amo_employer', 'income_tax')
        }),
        ('Statut et paiement', {
            'fields': ('status', 'is_paid', 'payment_date', 'payment_reference')
        }),
        ('Documents', {
            'fields': ('pdf_file', 'notes')
        }),
    )
    
    readonly_fields = ('payroll_run', 'employee', 'number', 'gross_salary', 'taxable_salary', 'net_salary',
                      'cnss_employee', 'cnss_employer', 'amo_employee', 'amo_employer', 'income_tax',
                      'pdf_file')
    
    actions = ['calculate_payslips', 'mark_as_paid', 'generate_pdf', 'validate_payslips']
    
    def employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}" if obj.employee else ""
    employee_name.short_description = "Employé"
    
    def period_name(self, obj):
        return obj.payroll_run.period.name if obj.payroll_run and obj.payroll_run.period else ""
    period_name.short_description = "Période"
    
    def calculate_payslips(self, request, queryset):
        """Action pour calculer les bulletins sélectionnés."""
        calculated = 0
        errors = []
        
        for payslip in queryset:
            if payslip.status in ['draft', 'calculated']:
                try:
                    SalaryCalculator.calculate_payslip(payslip, recalculate=(payslip.status == 'calculated'))
                    calculated += 1
                except Exception as e:
                    errors.append(f"Erreur pour {payslip.number}: {str(e)}")
        
        if errors:
            for error in errors:
                self.message_user(request, error, level='ERROR')
        
        self.message_user(request, f"{calculated} bulletin(s) calculé(s) avec succès.")
    calculate_payslips.short_description = "Calculer les bulletins sélectionnés"
    
    def mark_as_paid(self, request, queryset):
        """Action pour marquer les bulletins comme payés."""
        from django.utils import timezone
        
        paid = 0
        for payslip in queryset:
            if payslip.status == 'validated' and not payslip.is_paid:
                payslip.status = 'paid'
                payslip.is_paid = True
                payslip.payment_date = timezone.now().date()
                payslip.save()
                paid += 1
        
        self.message_user(request, f"{paid} bulletin(s) marqué(s) comme payé(s).")
    mark_as_paid.short_description = "Marquer comme payés"
    
    def generate_pdf(self, request, queryset):
        """Action pour générer les PDF des bulletins sélectionnés."""
        generated = 0
        errors = []
        
        for payslip in queryset:
            if payslip.status in ['calculated', 'validated', 'paid']:
                try:
                    PayrollPDFGenerator.generate_payslip_pdf(payslip)
                    generated += 1
                except Exception as e:
                    errors.append(f"Erreur pour {payslip.number}: {str(e)}")
        
        if errors:
            for error in errors:
                self.message_user(request, error, level='ERROR')
        
        self.message_user(request, f"{generated} PDF généré(s) avec succès.")
    generate_pdf.short_description = "Générer les PDF"
    
    def validate_payslips(self, request, queryset):
        """Action pour valider les bulletins sélectionnés."""
        validated = 0
        for payslip in queryset:
            if payslip.status == 'calculated':
                payslip.status = 'validated'
                payslip.save()
                validated += 1
        
        self.message_user(request, f"{validated} bulletin(s) validé(s) avec succès.")
    validate_payslips.short_description = "Valider les bulletins"

admin.site.register(PaySlip, PaySlipAdmin)

class PaySlipInline(admin.TabularInline):
    """Inline pour les bulletins d'un lancement de paie."""
    model = PaySlip
    extra = 0
    fields = ('number', 'employee', 'gross_salary', 'net_salary', 'status', 'is_paid')
    readonly_fields = ('number', 'employee', 'gross_salary', 'net_salary', 'status', 'is_paid')
    can_delete = False
    
    def has_add_permission(self, request, obj=None):
        return False

class PayrollRunAdmin(admin.ModelAdmin):
    """Administration des lancements de paie."""
    list_display = ('name', 'period', 'department_name', 'status', 'run_date', 'payslips_count', 'totals')
    list_filter = ('status', 'period', 'department')
    search_fields = ('name', 'description')
    ordering = ('-period__start_date', '-run_date')
    inlines = [PaySlipInline]
    
    fieldsets = (
        ('Identification', {
            'fields': ('period', 'name', 'description', 'department')
        }),
        ('Statut et dates', {
            'fields': ('status', 'run_date', 'calculated_date', 'validated_date', 'paid_date')
        }),
        ('Validation', {
            'fields': ('created_by', 'validated_by', 'notes')
        }),
    )
    
    readonly_fields = ('run_date', 'calculated_date', 'validated_date', 'paid_date', 'created_by')
    
    actions = ['generate_all_payslips', 'calculate_all_payslips', 'validate_payroll', 'mark_as_paid', 'generate_summary_pdf']
    
    def department_name(self, obj):
        return obj.department.name if obj.department else "Tous les départements"
    department_name.short_description = "Département"
    
    def payslips_count(self, obj):
        return obj.payslips.count()
    payslips_count.short_description = "Bulletins"
    
    def totals(self, obj):
        payslips = obj.payslips.all()
        if not payslips:
            return "-"
        
        totals = payslips.aggregate(
            gross=Sum('gross_salary'),
            net=Sum('net_salary')
        )
        
        return format_html("Brut: <b>{}</b> | Net: <b>{}</b>", 
                          totals['gross'] or 0, 
                          totals['net'] or 0)
    totals.short_description = "Totaux (MAD)"
    
    def generate_all_payslips(self, request, queryset):
        """Action pour générer tous les bulletins pour les lancements sélectionnés."""
        from hr.models import Employee
        
        total_created = 0
        for payroll_run in queryset:
            if payroll_run.status != 'draft':
                self.message_user(request, f"Le lancement '{payroll_run.name}' n'est pas en brouillon, bulletins non générés.", level='WARNING')
                continue
                
            # Récupérer les employés concernés
            employees = Employee.objects.filter(is_active=True)
            if payroll_run.department:
                employees = employees.filter(department=payroll_run.department)
            
            # Générer les bulletins
            period = payroll_run.period
            months = ["", "JAN", "FEV", "MAR", "AVR", "MAI", "JUN", "JUL", "AOU", "SEP", "OCT", "NOV", "DEC"]
            month_code = months[period.start_date.month]
            year_code = str(period.start_date.year)[-2:]
            
            created_count = 0
            for employee in employees:
                # Vérifier que l'employé a des infos de paie
                try:
                    payroll_info = employee.payroll_info
                except:
                    continue
                
                # Vérifier si un bulletin existe déjà
                if PaySlip.objects.filter(payroll_run=payroll_run, employee=employee).exists():
                    continue
                    
                # Générer un numéro unique
                number = f"BUL-{month_code}{year_code}-{employee.employee_id}"
                
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
                    status='draft'
                )
                created_count += 1
            
            # Mettre à jour le statut
            payroll_run.status = 'in_progress'
            payroll_run.save()
            
            self.message_user(request, f"{created_count} bulletin(s) créé(s) pour le lancement '{payroll_run.name}'.")
            total_created += created_count
        
        self.message_user(request, f"Total: {total_created} bulletin(s) créé(s).")
    generate_all_payslips.short_description = "Générer tous les bulletins"
    
    def calculate_all_payslips(self, request, queryset):
        """Action pour calculer tous les bulletins des lancements sélectionnés."""
        total_calculated = 0
        for payroll_run in queryset:
            if payroll_run.status not in ['in_progress', 'calculated']:
                self.message_user(request, f"Le lancement '{payroll_run.name}' n'est pas en cours ou calculé, bulletins non calculés.", level='WARNING')
                continue
            
            # Récupérer les bulletins en brouillon
            payslips = PaySlip.objects.filter(payroll_run=payroll_run, status='draft')
            
            # Calculer chaque bulletin
            calculated_count = 0
            errors = []
            
            for payslip in payslips:
                try:
                    SalaryCalculator.calculate_payslip(payslip)
                    calculated_count += 1
                except Exception as e:
                    errors.append(f"Erreur pour {payslip.number}: {str(e)}")
            
            # Mettre à jour le statut du lancement
            if not PaySlip.objects.filter(payroll_run=payroll_run, status='draft').exists():
                payroll_run.status = 'calculated'
                payroll_run.calculated_date = timezone.now()
                payroll_run.save()
            
            if errors:
                for error in errors:
                    self.message_user(request, error, level='ERROR')
            
            self.message_user(request, f"{calculated_count} bulletin(s) calculé(s) pour le lancement '{payroll_run.name}'.")
            total_calculated += calculated_count
        
        self.message_user(request, f"Total: {total_calculated} bulletin(s) calculé(s).")
    calculate_all_payslips.short_description = "Calculer tous les bulletins"
    
    def validate_payroll(self, request, queryset):
        """Action pour valider les lancements de paie sélectionnés."""
        from django.utils import timezone
        
        validated = 0
        for payroll_run in queryset:
            if payroll_run.status != 'calculated':
                self.message_user(request, f"Le lancement '{payroll_run.name}' n'est pas calculé, non validé.", level='WARNING')
                continue
            
            # Vérifier que tous les bulletins sont calculés
            if PaySlip.objects.filter(payroll_run=payroll_run).exclude(status='calculated').exists():
                self.message_user(request, f"Tous les bulletins du lancement '{payroll_run.name}' ne sont pas calculés, non validé.", level='WARNING')
                continue
            
            # Mettre à jour le statut
            payroll_run.status = 'validated'
            payroll_run.validated_date = timezone.now()
            try:
                payroll_run.validated_by = request.user.employee
            except:
                pass
            payroll_run.save()
            
            # Mettre à jour les bulletins
            PaySlip.objects.filter(payroll_run=payroll_run).update(status='validated')
            
            validated += 1
        
        self.message_user(request, f"{validated} lancement(s) validé(s) avec succès.")
    validate_payroll.short_description = "Valider les lancements"
    
    def mark_as_paid(self, request, queryset):
        """Action pour marquer les lancements comme payés."""
        from django.utils import timezone
        
        paid = 0
        for payroll_run in queryset:
            if payroll_run.status != 'validated':
                self.message_user(request, f"Le lancement '{payroll_run.name}' n'est pas validé, non marqué comme payé.", level='WARNING')
                continue
            
            # Mettre à jour le statut
            payroll_run.status = 'paid'
            payroll_run.paid_date = timezone.now()
            payroll_run.save()
            
            # Mettre à jour les bulletins
            PaySlip.objects.filter(payroll_run=payroll_run).update(
                status='paid',
                is_paid=True,
                payment_date=timezone.now().date()
            )
            
            paid += 1
        
        self.message_user(request, f"{paid} lancement(s) marqué(s) comme payé(s).")
    mark_as_paid.short_description = "Marquer comme payés"
    
    def generate_summary_pdf(self, request, queryset):
        """Action pour générer les PDF récapitulatifs des lancements sélectionnés."""
        generated = 0
        errors = []
        
        for payroll_run in queryset:
            if payroll_run.status not in ['calculated', 'validated', 'paid']:
                self.message_user(request, f"Le lancement '{payroll_run.name}' n'est pas calculé, validé ou payé, PDF non généré.", level='WARNING')
                continue
            
            try:
                pdf_path = PayrollPDFGenerator.generate_payroll_run_summary(payroll_run)
                generated += 1
            except Exception as e:
                errors.append(f"Erreur pour '{payroll_run.name}': {str(e)}")
        
        if errors:
            for error in errors:
                self.message_user(request, error, level='ERROR')
        
        self.message_user(request, f"{generated} PDF récapitulatif(s) généré(s) avec succès.")
    generate_summary_pdf.short_description = "Générer les PDF récapitulatifs"

admin.site.register(PayrollRun, PayrollRunAdmin)

class AdvanceSalaryAdmin(admin.ModelAdmin):
    """Administration des acomptes sur salaire."""
    list_display = ('employee_name', 'amount', 'payment_date', 'is_paid', 'period', 'payslip_link')
    list_filter = ('is_paid', 'payment_date', 'period')
    search_fields = ('employee__first_name', 'employee__last_name', 'notes')
    ordering = ('-payment_date',)
    
    fieldsets = (
        ('Employé et période', {
            'fields': ('employee', 'period')
        }),
        ('Montant et paiement', {
            'fields': ('amount', 'payment_date', 'is_paid')
        }),
        ('Bulletin', {
            'fields': ('payslip', 'notes')
        }),
    )
    
    readonly_fields = ('payslip',)
    
    actions = ['mark_as_paid']
    
    def employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}" if obj.employee else ""
    employee_name.short_description = "Employé"
    
    def payslip_link(self, obj):
        if obj.payslip:
            url = reverse('admin:payroll_payslip_change', args=[obj.payslip.id])
            return format_html('<a href="{}">{}</a>', url, obj.payslip.number)
        return "-"
    payslip_link.short_description = "Bulletin"
    
    def mark_as_paid(self, request, queryset):
        """Action pour marquer les acomptes comme payés."""
        paid = 0
        for advance in queryset:
            if not advance.is_paid:
                advance.is_paid = True
                advance.save()
                paid += 1
        
        self.message_user(request, f"{paid} acompte(s) marqué(s) comme payé(s).")
    mark_as_paid.short_description = "Marquer comme payés"

admin.site.register(AdvanceSalary, AdvanceSalaryAdmin)
