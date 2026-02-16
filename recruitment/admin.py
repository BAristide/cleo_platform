from django.contrib import admin
from django.utils.html import format_html, mark_safe
from django.utils.safestring import mark_safe
from django.urls import reverse
from .models import (
    JobOpening, Candidate, Application, InterviewPanel, Interviewer,
    EvaluationCriterion, CandidateEvaluation, CriterionScore,
    RecruitmentStats, RecruitmentNotification
)

@admin.register(JobOpening)
class JobOpeningAdmin(admin.ModelAdmin):
    list_display = ('reference', 'title', 'department', 'job_title', 'opening_date', 'status', 'applications_count')
    list_filter = ('status', 'department', 'job_title', 'opening_date')
    search_fields = ('title', 'reference', 'description')
    readonly_fields = ('reference', 'application_url', 'created_at', 'updated_at')
    fieldsets = (
        ('Informations générales', {
            'fields': ('reference', 'title', 'job_title', 'department', 'created_by')
        }),
        ('Détails du poste', {
            'fields': ('description', 'requirements', 'responsibilities')
        }),
        ('Informations pratiques', {
            'fields': ('location', 'contract_type', 'is_remote', 'salary_range')
        }),
        ('Processus de recrutement', {
            'fields': ('opening_date', 'closing_date', 'status')
        }),
        ('URL de candidature', {
            'fields': ('application_url',)
        }),
        ('Métadonnées', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def applications_count(self, obj):
        count = obj.applications.count()
        return format_html('<a href="{}?job_opening__id__exact={}">{} candidature(s)</a>',
                         reverse('admin:recruitment_application_changelist'),
                         obj.id, count)
    applications_count.short_description = "Candidatures"
    
    actions = ['publish_job_openings', 'close_job_openings']
    
    def publish_job_openings(self, request, queryset):
        updated = queryset.filter(status='draft').update(status='published')
        self.message_user(request, f"{updated} offre(s) d'emploi publiée(s).")
    publish_job_openings.short_description = "Publier les offres sélectionnées"
    
    def close_job_openings(self, request, queryset):
        updated = queryset.exclude(status='closed').update(status='closed')
        self.message_user(request, f"{updated} offre(s) d'emploi clôturée(s).")
    close_job_openings.short_description = "Clôturer les offres sélectionnées"


@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'email', 'phone', 'current_position', 'current_company', 'applications_count')
    search_fields = ('first_name', 'last_name', 'email', 'current_position', 'current_company')
    readonly_fields = ('created_at', 'updated_at')
    
    def applications_count(self, obj):
        count = obj.applications.count()
        return format_html('<a href="{}?candidate__id__exact={}">{} candidature(s)</a>',
                         reverse('admin:recruitment_application_changelist'),
                         obj.id, count)
    applications_count.short_description = "Candidatures"


class CandidateEvaluationInline(admin.TabularInline):
    model = CandidateEvaluation
    extra = 0
    readonly_fields = ('interviewer', 'general_impression', 'total_score', 'evaluation_form_link')
    fields = ('interviewer', 'general_impression', 'total_score', 'evaluation_form_link')
    show_change_link = True
    
    def evaluation_form_link(self, obj):
        if obj.evaluation_form:
            return format_html('<a href="{}" target="_blank">Voir la fiche</a>', obj.evaluation_form.url)
        return '-'
    evaluation_form_link.short_description = "Fiche d'évaluation"
    
    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ('candidate', 'job_opening', 'application_date', 'status', 'interview_date', 'resume_link')
    list_filter = ('status', 'job_opening', 'application_date')
    search_fields = ('candidate__first_name', 'candidate__last_name', 'job_opening__title', 'job_opening__reference')
    readonly_fields = ('application_date', 'created_at', 'updated_at', 'resume_link', 'cover_letter_link')
    inlines = [CandidateEvaluationInline]
    
    fieldsets = (
        ('Candidature', {
            'fields': ('job_opening', 'candidate', 'status', 'application_date')
        }),
        ('Documents', {
            'fields': ('resume', 'resume_link', 'cover_letter', 'cover_letter_link')
        }),
        ('Entretien', {
            'fields': ('interview_date', 'interview_location', 'notes')
        }),
        ('Métadonnées', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def resume_link(self, obj):
        if obj.resume:
            return format_html('<a href="{}" target="_blank">Télécharger</a>', obj.resume.url)
        return '-'
    resume_link.short_description = "CV"
    
    def cover_letter_link(self, obj):
        if obj.cover_letter:
            return format_html('<a href="{}" target="_blank">Télécharger</a>', obj.cover_letter.url)
        return '-'
    cover_letter_link.short_description = "Lettre de motivation"
    
    actions = ['preselect_applications', 'reject_applications', 'schedule_interview']
    
    def preselect_applications(self, request, queryset):
        updated = queryset.filter(status='received').update(status='preselected')
        self.message_user(request, f"{updated} candidature(s) présélectionnée(s).")
    preselect_applications.short_description = "Présélectionner les candidatures"
    
    def reject_applications(self, request, queryset):
        # Marquer les candidatures comme rejetées en fonction de leur statut actuel
        rejected_screening = queryset.filter(status='received').update(status='rejected_screening')
        rejected_analysis = queryset.filter(status='preselected').update(status='rejected_analysis')
        rejected_interview = queryset.filter(status='interviewed').update(status='rejected_interview')
        
        total_rejected = rejected_screening + rejected_analysis + rejected_interview
        self.message_user(request, f"{total_rejected} candidature(s) rejetée(s).")
    reject_applications.short_description = "Rejeter les candidatures"
    
    def schedule_interview(self, request, queryset):
        updated = queryset.filter(status='preselected').update(status='selected_for_interview')
        self.message_user(request, f"{updated} candidature(s) sélectionnée(s) pour entretien.")
    schedule_interview.short_description = "Sélectionner pour entretien"


class InterviewerInline(admin.TabularInline):
    model = Interviewer
    extra = 1
    autocomplete_fields = ['employee']


@admin.register(InterviewPanel)
class InterviewPanelAdmin(admin.ModelAdmin):
    list_display = ('name', 'job_opening', 'created_by', 'interviewers_count')
    list_filter = ('job_opening',)
    search_fields = ('name', 'job_opening__title')
    inlines = [InterviewerInline]
    
    def interviewers_count(self, obj):
        return obj.interviewers.count()
    interviewers_count.short_description = "Nombre d'évaluateurs"


@admin.register(EvaluationCriterion)
class EvaluationCriterionAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'weight', 'display_order')
    list_filter = ('category',)
    search_fields = ('name', 'description')
    ordering = ['category', 'display_order', 'name']


class CriterionScoreInline(admin.TabularInline):
    model = CriterionScore
    extra = 1
    autocomplete_fields = ['criterion']


@admin.register(CandidateEvaluation)
class CandidateEvaluationAdmin(admin.ModelAdmin):
    list_display = ('candidate_name', 'job_opening_title', 'interviewer_name', 'general_impression', 'evaluation_date')
    list_filter = ('general_impression', 'evaluation_date')
    search_fields = ('application__candidate__first_name', 'application__candidate__last_name', 
                    'interviewer__employee__first_name', 'interviewer__employee__last_name')
    readonly_fields = ('created_at', 'updated_at', 'total_score')
    inlines = [CriterionScoreInline]
    
    fieldsets = (
        ('Évaluation', {
            'fields': ('application', 'interviewer', 'evaluation_date', 'general_impression', 'english_level')
        }),
        ('Notes', {
            'fields': ('strengths', 'weaknesses', 'total_score')
        }),
        ('Document', {
            'fields': ('evaluation_form',)
        }),
        ('Métadonnées', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def candidate_name(self, obj):
        return obj.application.candidate.full_name
    candidate_name.short_description = "Candidat"
    
    def job_opening_title(self, obj):
        return obj.application.job_opening.title
    job_opening_title.short_description = "Poste"
    
    def interviewer_name(self, obj):
        return obj.interviewer.employee.full_name
    interviewer_name.short_description = "Évaluateur"


@admin.register(RecruitmentStats)
class RecruitmentStatsAdmin(admin.ModelAdmin):
    list_display = ('period_start', 'period_end', 'total_job_openings', 'total_applications', 
                   'hired_candidates', 'hiring_rate')
    readonly_fields = ('generated_at',)


@admin.register(RecruitmentNotification)
class RecruitmentNotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'recipient', 'type', 'is_read', 'created_at')
    list_filter = ('is_read', 'type', 'created_at')
    search_fields = ('title', 'message', 'recipient__first_name', 'recipient__last_name')
    readonly_fields = ('created_at',)
    
    actions = ['mark_as_read', 'mark_as_unread']
    
    def mark_as_read(self, request, queryset):
        updated = queryset.update(is_read=True)
        self.message_user(request, f"{updated} notification(s) marquée(s) comme lue(s).")
    mark_as_read.short_description = "Marquer comme lu"
    
    def mark_as_unread(self, request, queryset):
        updated = queryset.update(is_read=False)
        self.message_user(request, f"{updated} notification(s) marquée(s) comme non lue(s).")
    mark_as_unread.short_description = "Marquer comme non lu"
