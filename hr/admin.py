from django.contrib import admin
from django.utils.safestring import mark_safe

from .models import (
    Availability,
    Department,
    Employee,
    EmployeeSkill,
    JobSkillRequirement,
    JobTitle,
    Mission,
    Skill,
    TrainingCourse,
    TrainingPlan,
    TrainingPlanItem,
    TrainingSkill,
)


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'parent', 'employee_count')
    search_fields = ('name', 'code')
    list_filter = ('parent',)

    def employee_count(self, obj):
        return obj.employees.count()

    employee_count.short_description = 'Employés'


@admin.register(JobTitle)
class JobTitleAdmin(admin.ModelAdmin):
    list_display = ('name', 'department', 'is_management', 'employee_count')
    search_fields = ('name',)
    list_filter = ('department', 'is_management')

    def employee_count(self, obj):
        return obj.employees.count()

    employee_count.short_description = 'Employés'


class EmployeeSkillInline(admin.TabularInline):
    model = EmployeeSkill
    extra = 1
    autocomplete_fields = ['skill']


class MissionInline(admin.TabularInline):
    model = Mission
    extra = 0
    fields = ('title', 'start_date', 'end_date', 'status')
    readonly_fields = ('status',)
    show_change_link = True
    fk_name = 'employee'


class TrainingPlanInline(admin.TabularInline):
    model = TrainingPlan
    extra = 0
    fields = ('year', 'status')
    readonly_fields = ('status',)
    show_change_link = True


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = (
        'full_name',
        'employee_id',
        'job_title',
        'department',
        'manager',
        'is_active',
        'role_icons',
        'marital_status_display',
        'dependent_children',
    )
    list_filter = (
        'is_active',
        'department',
        'job_title',
        'is_hr',
        'is_finance',
        'marital_status',
    )
    search_fields = ('first_name', 'last_name', 'email', 'employee_id')
    autocomplete_fields = ['user', 'manager', 'second_manager']
    inlines = [EmployeeSkillInline, MissionInline, TrainingPlanInline]
    fieldsets = (
        (
            'Informations personnelles',
            {
                'fields': (
                    'user',
                    'first_name',
                    'last_name',
                    'email',
                    'phone',
                    'address',
                    'birth_date',
                )
            },
        ),
        ('Situation familiale', {'fields': ('marital_status', 'dependent_children')}),
        (
            'Informations professionnelles',
            {'fields': ('employee_id', 'hire_date', 'job_title', 'department')},
        ),
        ('Hiérarchie', {'fields': ('manager', 'second_manager')}),
        ('Statut et rôles', {'fields': ('is_active', 'is_hr', 'is_finance')}),
    )

    def marital_status_display(self, obj):
        """Affiche le statut matrimonial plus lisible"""
        status_map = {
            'single': 'Célibataire',
            'married': 'Marié(e)',
            'divorced': 'Divorcé(e)',
            'widowed': 'Veuf/Veuve',
        }
        return status_map.get(obj.marital_status, obj.marital_status)

    marital_status_display.short_description = 'Statut matrimonial'

    def full_name(self, obj):
        return f'{obj.first_name} {obj.last_name}'

    full_name.short_description = 'Nom complet'

    def role_icons(self, obj):
        icons = []
        if obj.is_hr:
            icons.append('<span style="color: blue;">👤 RH</span>')
        if obj.is_finance:
            icons.append('<span style="color: green;">💰 Finance</span>')
        if obj.is_manager:
            icons.append('<span style="color: purple;">👑 Manager</span>')

        return mark_safe(' | '.join(icons)) if icons else '-'

    role_icons.short_description = 'Rôles'


@admin.register(Availability)
class AvailabilityAdmin(admin.ModelAdmin):
    list_display = (
        'employee',
        'type',
        'start_date',
        'end_date',
        'status',
        'approval_status',
    )
    list_filter = ('status', 'type', 'start_date')
    search_fields = ('employee__first_name', 'employee__last_name', 'reason')
    autocomplete_fields = ['employee', 'requested_by']
    date_hierarchy = 'start_date'

    def approval_status(self, obj):
        hr = 'Oui' if obj.approved_by_hr else 'Non'
        manager = 'Oui' if obj.approved_by_manager else 'Non'

        return mark_safe(f'Manager: {manager} | RH: {hr}')

    approval_status.short_description = 'Approbations'


@admin.register(Mission)
class MissionAdmin(admin.ModelAdmin):
    list_display = (
        'title',
        'employee',
        'start_date',
        'end_date',
        'status',
        'approval_status',
        'pdf_link',
    )
    list_filter = ('status', 'start_date')
    search_fields = (
        'title',
        'employee__first_name',
        'employee__last_name',
        'description',
        'location',
    )
    autocomplete_fields = ['employee', 'requested_by']
    date_hierarchy = 'start_date'
    fieldsets = (
        (
            'Informations générales',
            {'fields': ('employee', 'title', 'description', 'location')},
        ),
        ('Dates', {'fields': ('start_date', 'end_date')}),
        ('Statut et demande', {'fields': ('status', 'requested_by')}),
        (
            'Approbations',
            {
                'fields': (
                    'approved_by_manager',
                    'approved_by_hr',
                    'approved_by_finance',
                    'manager_notes',
                    'hr_notes',
                    'finance_notes',
                )
            },
        ),
        ('Rapport', {'fields': ('report', 'report_submitted', 'report_date')}),
        ('Documents', {'fields': ('order_pdf',)}),
    )

    def pdf_link(self, obj):
        """Affiche un lien vers le PDF s'il existe."""
        if obj.order_pdf:
            from django.utils.html import format_html

            return format_html(
                '<a href="/media/{}" target="_blank">Voir PDF</a>', obj.order_pdf
            )
        return '-'

    pdf_link.short_description = 'Ordre de mission PDF'

    def approval_status(self, obj):
        manager = 'Oui' if obj.approved_by_manager else 'Non'
        hr = 'Oui' if obj.approved_by_hr else 'Non'
        finance = 'Oui' if obj.approved_by_finance else 'Non'

        return mark_safe(f'Manager: {manager} | RH: {hr} | Finance: {finance}')

    approval_status.short_description = 'Approbations'

    actions = [
        'submit_mission',
        'approve_by_manager',
        'generate_order_pdf',
        'approve_by_hr',
        'approve_by_finance',
    ]

    def submit_mission(self, request, queryset):
        """Soumettre les missions sélectionnées pour approbation."""
        count = 0
        for mission in queryset:
            if mission.status == 'draft':
                mission.status = 'submitted'
                mission.save(update_fields=['status'])
                count += 1

        self.message_user(request, f'{count} mission(s) soumise(s) pour approbation.')

    submit_mission.short_description = 'Soumettre les missions sélectionnées'

    def approve_by_manager(self, request, queryset):
        """Approuver les missions sélectionnées en tant que manager."""
        count = 0
        for mission in queryset:
            if mission.status == 'submitted':
                mission.approved_by_manager = True
                mission.status = 'approved_manager'
                mission.save(update_fields=['approved_by_manager', 'status'])
                count += 1

        self.message_user(request, f'{count} mission(s) approuvée(s) par le manager.')

    approve_by_manager.short_description = 'Approuver par Manager'

    def generate_order_pdf(self, request, queryset):
        from .services.pdf_generator import PDFGenerator

        count = 0
        for mission in queryset:
            try:
                pdf_path = PDFGenerator.generate_mission_order_pdf(mission)
                mission.order_pdf = pdf_path
                mission.save(update_fields=['order_pdf'])
                count += 1
            except Exception as e:
                self.message_user(
                    request, f'Erreur pour {mission.title}: {str(e)}', level='ERROR'
                )

        self.message_user(request, f'{count} ordre(s) de mission générés en PDF.')

    generate_order_pdf.short_description = 'Générer les ordres de mission en PDF'

    def approve_by_hr(self, request, queryset):
        count = 0
        for mission in queryset:
            if mission.status == 'approved_manager' and not mission.approved_by_hr:
                mission.approve_hr()
                count += 1

        self.message_user(request, f'{count} mission(s) approuvées par RH.')

    approve_by_hr.short_description = 'Approuver par RH'

    def approve_by_finance(self, request, queryset):
        count = 0
        for mission in queryset:
            if mission.status == 'approved_hr' and not mission.approved_by_finance:
                mission.approve_finance()
                count += 1

        self.message_user(request, f'{count} mission(s) approuvées par Finance.')

    approve_by_finance.short_description = 'Approuver par Finance'


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ('name', 'category')
    list_filter = ('category',)
    search_fields = ('name', 'description')


class TrainingSkillInline(admin.TabularInline):
    model = TrainingSkill
    extra = 1
    autocomplete_fields = ['skill']


@admin.register(TrainingCourse)
class TrainingCourseAdmin(admin.ModelAdmin):
    list_display = (
        'title',
        'category',
        'duration_hours',
        'provider',
        'is_internal',
        'is_online',
        'cost',
    )
    list_filter = ('category', 'is_internal', 'is_online')
    search_fields = ('title', 'description', 'provider')
    inlines = [TrainingSkillInline]


class TrainingPlanItemInline(admin.TabularInline):
    model = TrainingPlanItem
    extra = 1
    autocomplete_fields = ['training_course']


@admin.register(TrainingPlan)
class TrainingPlanAdmin(admin.ModelAdmin):
    list_display = (
        'employee',
        'year',
        'status',
        'total_training_cost',
        'approval_status',
    )
    list_filter = ('year', 'status')
    search_fields = ('employee__first_name', 'employee__last_name', 'objectives')
    autocomplete_fields = ['employee']
    inlines = [TrainingPlanItemInline]

    def approval_status(self, obj):
        manager = 'Oui' if obj.approved_by_manager else 'Non'
        hr = 'Oui' if obj.approved_by_hr else 'Non'
        finance = 'Oui' if obj.approved_by_finance else 'Non'

        return mark_safe(f'Manager: {manager} | RH: {hr} | Finance: {finance}')

    approval_status.short_description = 'Approbations'

    actions = [
        'submit_plan',
        'approve_by_manager',
        'approve_by_hr',
        'approve_by_finance',
    ]

    def submit_plan(self, request, queryset):
        """Soumettre les plans de formation sélectionnés."""
        count = 0
        for plan in queryset:
            if plan.status == 'draft':
                plan.status = 'submitted'
                plan.save(update_fields=['status'])
                count += 1

        self.message_user(
            request, f'{count} plan(s) de formation soumis pour approbation.'
        )

    submit_plan.short_description = 'Soumettre les plans sélectionnés'

    def approve_by_manager(self, request, queryset):
        count = 0
        for plan in queryset:
            if plan.status == 'submitted' and not plan.approved_by_manager:
                plan.approved_by_manager = True
                plan.status = 'approved_manager'
                plan.save(update_fields=['approved_by_manager', 'status'])
                count += 1

        self.message_user(request, f'{count} plan(s) approuvés par le manager.')

    approve_by_manager.short_description = 'Approuver par Manager'

    def approve_by_hr(self, request, queryset):
        count = 0
        for plan in queryset:
            if plan.status == 'approved_manager' and not plan.approved_by_hr:
                plan.approved_by_hr = True
                plan.status = 'approved_hr'
                plan.save(update_fields=['approved_by_hr', 'status'])
                count += 1

        self.message_user(request, f'{count} plan(s) approuvés par RH.')

    approve_by_hr.short_description = 'Approuver par RH'

    def approve_by_finance(self, request, queryset):
        count = 0
        for plan in queryset:
            if plan.status == 'approved_hr' and not plan.approved_by_finance:
                plan.approved_by_finance = True
                plan.status = 'approved_finance'
                plan.save(update_fields=['approved_by_finance', 'status'])
                count += 1

        self.message_user(request, f'{count} plan(s) approuvés par Finance.')

    approve_by_finance.short_description = 'Approuver par Finance'


@admin.register(EmployeeSkill)
class EmployeeSkillAdmin(admin.ModelAdmin):
    list_display = ('employee', 'skill', 'level', 'certification', 'certification_date')
    list_filter = ('level', 'skill__category', 'certification_date')
    search_fields = (
        'employee__first_name',
        'employee__last_name',
        'skill__name',
        'certification',
    )
    autocomplete_fields = ['employee', 'skill']

    fieldsets = (
        ('Employé et compétence', {'fields': ('employee', 'skill')}),
        ('Niveau et évaluation', {'fields': ('level', 'notes')}),
        ('Certification', {'fields': ('certification', 'certification_date')}),
    )


@admin.register(JobSkillRequirement)
class JobSkillRequirementAdmin(admin.ModelAdmin):
    list_display = ('job_title', 'skill', 'required_level', 'importance')
    list_filter = ('required_level', 'importance', 'job_title__department')
    search_fields = ('job_title__name', 'skill__name')
    autocomplete_fields = ['job_title', 'skill']


# Ajout à hr/admin.py pour enregistrer le modèle TrainingPlanItem

# Correction des actions pour TrainingPlanItem sans formulaires personnalisés


@admin.register(TrainingPlanItem)
class TrainingPlanItemAdmin(admin.ModelAdmin):
    list_display = (
        'training_plan',
        'training_course',
        'planned_quarter',
        'priority',
        'status',
        'scheduled_date',
        'completion_date',
        'employee_rating',
        'manager_rating',
    )
    list_filter = ('status', 'planned_quarter', 'priority')
    search_fields = (
        'training_plan__employee__first_name',
        'training_plan__employee__last_name',
        'training_course__title',
    )

    # Actions simplifiées sans formulaires personnalisés
    actions = [
        'schedule_training',
        'mark_as_in_progress',
        'complete_training',
        'add_manager_evaluation',
    ]

    def schedule_training(self, request, queryset):
        """Programmer les formations sélectionnées."""
        from django.utils import timezone

        today = timezone.now().date()
        count = 0
        for item in queryset:
            if item.status == 'planned':
                item.scheduled_date = today
                item.status = 'scheduled'
                item.save(update_fields=['scheduled_date', 'status'])
                count += 1

        self.message_user(
            request, f"{count} formation(s) programmée(s) pour aujourd'hui ({today})."
        )

    schedule_training.short_description = 'Programmer les formations sélectionnées'

    def mark_as_in_progress(self, request, queryset):
        """Marquer les formations sélectionnées comme en cours."""
        count = 0
        for item in queryset:
            if item.status == 'scheduled':
                item.status = 'in_progress'
                item.save(update_fields=['status'])
                count += 1

        self.message_user(request, f'{count} formation(s) marquée(s) comme en cours.')

    mark_as_in_progress.short_description = 'Marquer comme en cours'

    def complete_training(self, request, queryset):
        """Terminer les formations sélectionnées."""
        from django.utils import timezone

        today = timezone.now().date()
        count = 0
        for item in queryset:
            if item.status in ['scheduled', 'in_progress']:
                item.completion_date = today
                item.employee_rating = 4  # 'Satisfait' par défaut
                item.employee_comments = 'Formation terminée avec succès.'
                item.status = 'completed'
                item.save(
                    update_fields=[
                        'completion_date',
                        'employee_rating',
                        'employee_comments',
                        'status',
                    ]
                )
                count += 1

        self.message_user(
            request, f'{count} formation(s) terminée(s) avec date de fin {today}.'
        )

    complete_training.short_description = 'Terminer les formations sélectionnées'

    def add_manager_evaluation(self, request, queryset):
        """Ajouter l'évaluation du manager."""
        count = 0
        for item in queryset:
            if item.status == 'completed':
                item.manager_rating = 5  # 'Très satisfait' par défaut
                item.manager_comments = (
                    "Formation bien suivie avec d'excellents résultats."
                )
                item.save(update_fields=['manager_rating', 'manager_comments'])
                count += 1

        self.message_user(
            request, f'Évaluation du manager ajoutée pour {count} formation(s).'
        )

    add_manager_evaluation.short_description = "Ajouter l'évaluation du manager"
