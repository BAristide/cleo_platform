# recruitment/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from hr.models import Employee, Department, JobTitle
from .models import (
    JobOpening, Candidate, Application, InterviewPanel, Interviewer,
    EvaluationCriterion, CandidateEvaluation, CriterionScore,
    RecruitmentStats, RecruitmentNotification
)

class UserSerializer(serializers.ModelSerializer):
    """Serializer pour les utilisateurs."""
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name']

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}" if obj.first_name or obj.last_name else obj.username


class EmployeeSerializer(serializers.ModelSerializer):
    """Serializer simplifié pour les employés."""
    class Meta:
        model = Employee
        fields = ['id', 'first_name', 'last_name', 'email', 'full_name']


class DepartmentSerializer(serializers.ModelSerializer):
    """Serializer simplifié pour les départements."""
    class Meta:
        model = Department
        fields = ['id', 'name', 'code']


class JobTitleSerializer(serializers.ModelSerializer):
    """Serializer simplifié pour les postes."""
    class Meta:
        model = JobTitle
        fields = ['id', 'name', 'department']


class JobOpeningSerializer(serializers.ModelSerializer):
    """Serializer pour les offres d'emploi."""
    department_name = serializers.SerializerMethodField()
    job_title_name = serializers.SerializerMethodField()
    applications_count = serializers.SerializerMethodField()

    class Meta:
        model = JobOpening
        fields = [
            'id', 'reference', 'title', 'department', 'department_name', 'job_title', 'job_title_name',
            'description', 'requirements', 'responsibilities', 'location', 'contract_type',
            'is_remote', 'salary_range', 'opening_date', 'closing_date', 'status',
            'created_at', 'updated_at', 'application_url', 'applications_count'
        ]
        read_only_fields = ['reference', 'application_url', 'created_at', 'updated_at']

    def get_department_name(self, obj):
        return obj.department.name if obj.department else None

    def get_job_title_name(self, obj):
        return obj.job_title.name if obj.job_title else None

    def get_applications_count(self, obj):
        return obj.applications.count()


class JobOpeningDetailSerializer(JobOpeningSerializer):
    """Serializer détaillé pour les offres d'emploi."""
    created_by = EmployeeSerializer(read_only=True)
    department = DepartmentSerializer(read_only=True)
    job_title = JobTitleSerializer(read_only=True)

    class Meta(JobOpeningSerializer.Meta):
        fields = JobOpeningSerializer.Meta.fields + ['created_by']


class CandidateSerializer(serializers.ModelSerializer):
    """Serializer pour les candidats."""
    applications_count = serializers.SerializerMethodField()

    class Meta:
        model = Candidate
        fields = [
            'id', 'first_name', 'last_name', 'email', 'phone', 'address',
            'current_position', 'current_company', 'years_of_experience',
            'highest_degree', 'created_at', 'updated_at', 'applications_count'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_applications_count(self, obj):
        return obj.applications.count()


class ApplicationSerializer(serializers.ModelSerializer):
    """Serializer pour les candidatures."""
    candidate_name = serializers.SerializerMethodField()
    candidate_email = serializers.SerializerMethodField()
    candidate_phone = serializers.SerializerMethodField()
    job_opening_title = serializers.SerializerMethodField()
    job_opening_id = serializers.SerializerMethodField()
    evaluations_count = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = [
            'id', 'job_opening', 'job_opening_title', 'job_opening_id',
            'candidate', 'candidate_name', 'candidate_email', 'candidate_phone',
            'resume', 'cover_letter', 'application_date', 'status',
            'interview_date', 'interview_location', 'notes',
            'created_at', 'updated_at', 'evaluations_count'
        ]
        read_only_fields = ['application_date', 'created_at', 'updated_at']

    def get_candidate_name(self, obj):
        return obj.candidate.full_name if obj.candidate else None

    def get_candidate_email(self, obj):
        return obj.candidate.email if obj.candidate else None

    def get_candidate_phone(self, obj):
        return obj.candidate.phone if obj.candidate else None

    def get_job_opening_title(self, obj):
        return obj.job_opening.title if obj.job_opening else None

    def get_job_opening_id(self, obj):
        return obj.job_opening.id if obj.job_opening else None

    def get_evaluations_count(self, obj):
        return obj.evaluations.count()


class ApplicationCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de candidatures."""
    candidate = CandidateSerializer()

    class Meta:
        model = Application
        fields = [
            'job_opening', 'candidate', 'resume', 'cover_letter',
            'status', 'notes'
        ]


class InterviewerSerializer(serializers.ModelSerializer):
    """Serializer pour les évaluateurs."""
    employee_name = serializers.SerializerMethodField()

    class Meta:
        model = Interviewer
        fields = ['id', 'panel', 'employee', 'employee_name', 'role']

    def get_employee_name(self, obj):
        return obj.employee.full_name if obj.employee else None


class InterviewPanelSerializer(serializers.ModelSerializer):
    """Serializer pour les panels d'entretien."""
    interviewers = InterviewerSerializer(many=True, read_only=True)
    job_opening_title = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = InterviewPanel
        fields = [
            'id', 'job_opening', 'job_opening_title', 'name',
            'created_by', 'created_by_name', 'created_at',
            'updated_at', 'interviewers'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_job_opening_title(self, obj):
        return obj.job_opening.title if obj.job_opening else None

    def get_created_by_name(self, obj):
        return obj.created_by.full_name if obj.created_by else None


class EvaluationCriterionSerializer(serializers.ModelSerializer):
    """Serializer pour les critères d'évaluation."""
    category_display = serializers.SerializerMethodField()

    class Meta:
        model = EvaluationCriterion
        fields = [
            'id', 'name', 'description', 'category', 'category_display',
            'weight', 'display_order'
        ]

    def get_category_display(self, obj):
        return obj.get_category_display() if obj.category else None


class CriterionScoreSerializer(serializers.ModelSerializer):
    """Serializer pour les scores de critères."""
    criterion_name = serializers.SerializerMethodField()
    criterion_category = serializers.SerializerMethodField()
    criterion_weight = serializers.SerializerMethodField()

    class Meta:
        model = CriterionScore
        fields = [
            'id', 'evaluation', 'criterion', 'criterion_name', 'criterion_category',
            'criterion_weight', 'score', 'comment'
        ]

    def get_criterion_name(self, obj):
        return obj.criterion.name if obj.criterion else None

    def get_criterion_category(self, obj):
        return obj.criterion.get_category_display() if obj.criterion else None

    def get_criterion_weight(self, obj):
        return obj.criterion.weight if obj.criterion else 1


class CandidateEvaluationSerializer(serializers.ModelSerializer):
    """Serializer pour les évaluations de candidats."""
    interviewer_name = serializers.SerializerMethodField()
    application_details = serializers.SerializerMethodField()
    criterion_scores = CriterionScoreSerializer(many=True, read_only=True)
    general_impression_display = serializers.SerializerMethodField()
    total_score = serializers.SerializerMethodField()

    class Meta:
        model = CandidateEvaluation
        fields = [
            'id', 'application', 'application_details', 'interviewer', 'interviewer_name',
            'general_impression', 'general_impression_display', 'english_level',
            'strengths', 'weaknesses', 'evaluation_date', 'created_at',
            'updated_at', 'evaluation_form', 'criterion_scores', 'total_score'
        ]
        read_only_fields = ['created_at', 'updated_at', 'total_score']

    def get_interviewer_name(self, obj):
        return obj.interviewer.employee.full_name if obj.interviewer and obj.interviewer.employee else None

    def get_application_details(self, obj):
        if not obj.application:
            return None
        return {
            'candidate_name': obj.application.candidate.full_name if obj.application.candidate else None,
            'job_title': obj.application.job_opening.title if obj.application.job_opening else None,
            'job_opening_id': obj.application.job_opening.id if obj.application.job_opening else None,
        }

    def get_general_impression_display(self, obj):
        return obj.get_general_impression_display() if obj.general_impression else None

    def get_total_score(self, obj):
        if not hasattr(obj, 'criterion_scores'):
            return 0
        
        total = 0
        for score in obj.criterion_scores.all():
            total += float(score.score) * (score.criterion.weight if score.criterion else 1)
        return total


class RecruitmentStatsSerializer(serializers.ModelSerializer):
    """Serializer pour les statistiques de recrutement."""
    period_description = serializers.SerializerMethodField()

    class Meta:
        model = RecruitmentStats
        fields = [
            'id', 'period_start', 'period_end', 'period_description',
            'total_job_openings', 'total_applications', 'applications_per_opening',
            'preselected_applications', 'interviewed_candidates', 'hired_candidates',
            'preselection_rate', 'interview_rate', 'hiring_rate',
            'avg_time_to_hire', 'generated_at'
        ]
        read_only_fields = ['generated_at']

    def get_period_description(self, obj):
        from django.utils.formats import date_format
        return f"{date_format(obj.period_start, 'SHORT_DATE_FORMAT')} - {date_format(obj.period_end, 'SHORT_DATE_FORMAT')}"


class RecruitmentNotificationSerializer(serializers.ModelSerializer):
    """Serializer pour les notifications de recrutement."""
    recipient_name = serializers.SerializerMethodField()
    type_display = serializers.SerializerMethodField()

    class Meta:
        model = RecruitmentNotification
        fields = [
            'id', 'recipient', 'recipient_name', 'title', 'message',
            'is_read', 'type', 'type_display', 'job_opening_id',
            'application_id', 'created_at'
        ]
        read_only_fields = ['created_at']

    def get_recipient_name(self, obj):
        return obj.recipient.full_name if obj.recipient else None

    def get_type_display(self, obj):
        return obj.get_type_display() if obj.type else None
