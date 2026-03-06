from django.contrib.auth.models import User
from rest_framework import serializers

from .models import (
    Announcement,
    Availability,
    Complaint,
    Department,
    Employee,
    EmployeeSkill,
    JobSkillRequirement,
    JobTitle,
    LeaveAllocation,
    LeaveRequest,
    LeaveType,
    Mission,
    Reward,
    RewardType,
    Skill,
    TrainingCourse,
    TrainingPlan,
    TrainingPlanItem,
    TrainingSkill,
    WorkCertificateRequest,
)


class UserSerializer(serializers.ModelSerializer):
    """Serializer pour les utilisateurs."""

    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name']

    def get_full_name(self, obj):
        return (
            f'{obj.first_name} {obj.last_name}'
            if obj.first_name or obj.last_name
            else obj.username
        )


class DepartmentSerializer(serializers.ModelSerializer):
    """Serializer pour les départements."""

    parent_name = serializers.SerializerMethodField()
    employee_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = [
            'id',
            'name',
            'code',
            'parent',
            'parent_name',
            'description',
            'employee_count',
        ]

    def get_parent_name(self, obj):
        return obj.parent.name if obj.parent else None

    def get_employee_count(self, obj):
        return obj.employees.count()


class JobTitleSerializer(serializers.ModelSerializer):
    """Serializer pour les postes."""

    department_name = serializers.SerializerMethodField()

    class Meta:
        model = JobTitle
        fields = [
            'id',
            'name',
            'department',
            'department_name',
            'description',
            'is_management',
        ]

    def get_department_name(self, obj):
        return obj.department.name if obj.department else None


class EmployeeListSerializer(serializers.ModelSerializer):
    """Serializer pour liste des employés."""

    department_name = serializers.SerializerMethodField()
    job_title_name = serializers.SerializerMethodField()
    manager_name = serializers.SerializerMethodField()
    contract_type_name = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            'id',
            'first_name',
            'last_name',
            'employee_id',
            'email',
            'job_title',
            'job_title_name',
            'department',
            'department_name',
            'manager',
            'manager_name',
            'is_active',
            'roles',
            'contract_type',
            'contract_type_name',
        ]

    def get_department_name(self, obj):
        return obj.department.name if obj.department else None

    def get_job_title_name(self, obj):
        return obj.job_title.name if obj.job_title else None

    def get_manager_name(self, obj):
        return obj.manager.full_name if obj.manager else None

    def get_contract_type_name(self, obj):
        return obj.contract_type.name if obj.contract_type else None

    def get_roles(self, obj):
        roles = []
        if obj.is_hr:
            roles.append('RH')
        if obj.is_finance:
            roles.append('Finance')
        if obj.is_manager:
            roles.append('Manager')
        return roles


class EmployeeSkillSerializer(serializers.ModelSerializer):
    """Serializer pour les compétences des employés."""

    skill_name = serializers.SerializerMethodField()
    skill_category = serializers.SerializerMethodField()
    level_display = serializers.SerializerMethodField()

    class Meta:
        model = EmployeeSkill
        fields = [
            'id',
            'skill',
            'skill_name',
            'skill_category',
            'level',
            'level_display',
            'certification',
            'certification_date',
            'notes',
        ]

    def get_skill_name(self, obj):
        return obj.skill.name if obj.skill else None

    def get_skill_category(self, obj):
        return obj.skill.get_category_display() if obj.skill else None

    def get_level_display(self, obj):
        return obj.get_level_display() if obj.level else None


class EmployeeDetailSerializer(serializers.ModelSerializer):
    """Serializer détaillé pour les employés."""

    user = UserSerializer(read_only=True)
    department = DepartmentSerializer(read_only=True)
    job_title = JobTitleSerializer(read_only=True)
    manager = EmployeeListSerializer(read_only=True)
    second_manager = EmployeeListSerializer(read_only=True)
    skills = EmployeeSkillSerializer(many=True, read_only=True)
    subordinates = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            'id',
            'user',
            'first_name',
            'last_name',
            'email',
            'phone',
            'address',
            'birth_date',
            'employee_id',
            'hire_date',
            'job_title',
            'department',
            'manager',
            'second_manager',
            'is_active',
            'is_hr',
            'is_finance',
            'skills',
            'subordinates',
            'contract_type',
            'contract_start_date',
            'contract_end_date',
            'probation_end_date',
        ]

    def get_subordinates(self, obj):
        return EmployeeListSerializer(
            obj.subordinates.all(), many=True, context=self.context
        ).data


class MissionSerializer(serializers.ModelSerializer):
    """Serializer pour les missions."""

    employee_name = serializers.SerializerMethodField()
    requested_by_name = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    approvals = serializers.SerializerMethodField()

    class Meta:
        model = Mission
        fields = [
            'id',
            'employee',
            'employee_name',
            'title',
            'description',
            'location',
            'start_date',
            'end_date',
            'status',
            'status_display',
            'requested_by',
            'requested_by_name',
            'approved_by_manager',
            'approved_by_hr',
            'approved_by_finance',
            'manager_notes',
            'hr_notes',
            'finance_notes',
            'approvals',
            'report',
            'report_submitted',
            'report_date',
            'order_pdf',
        ]

    def get_employee_name(self, obj):
        return obj.employee.full_name if obj.employee else None

    def get_requested_by_name(self, obj):
        return obj.requested_by.full_name if obj.requested_by else None

    def get_status_display(self, obj):
        return obj.get_status_display() if obj.status else None

    def get_approvals(self, obj):
        return {
            'manager': obj.approved_by_manager,
            'hr': obj.approved_by_hr,
            'finance': obj.approved_by_finance,
        }


class AvailabilitySerializer(serializers.ModelSerializer):
    """Serializer pour les mises en disponibilité."""

    employee_name = serializers.SerializerMethodField()
    requested_by_name = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    type_display = serializers.SerializerMethodField()
    duration_days = serializers.SerializerMethodField()

    class Meta:
        model = Availability
        fields = [
            'id',
            'employee',
            'employee_name',
            'status',
            'status_display',
            'type',
            'type_display',
            'start_date',
            'end_date',
            'duration_days',
            'reason',
            'requested_by',
            'requested_by_name',
            'approved_by_manager',
            'approved_by_hr',
            'manager_notes',
            'hr_notes',
        ]

    def get_employee_name(self, obj):
        return obj.employee.full_name if obj.employee else None

    def get_requested_by_name(self, obj):
        return obj.requested_by.full_name if obj.requested_by else None

    def get_status_display(self, obj):
        return obj.get_status_display() if obj.status else None

    def get_type_display(self, obj):
        return obj.get_type_display() if obj.type else None

    def get_duration_days(self, obj):
        if obj.start_date and obj.end_date:
            return (obj.end_date - obj.start_date).days + 1
        return None


class SkillSerializer(serializers.ModelSerializer):
    """Serializer pour les compétences."""

    category_display = serializers.SerializerMethodField()

    class Meta:
        model = Skill
        fields = ['id', 'name', 'description', 'category', 'category_display']

    def get_category_display(self, obj):
        return obj.get_category_display() if obj.category else None


class JobSkillRequirementSerializer(serializers.ModelSerializer):
    """Serializer pour les exigences de compétences des postes."""

    skill_data = SkillSerializer(source='skill', read_only=True)
    required_level_display = serializers.SerializerMethodField()
    importance_display = serializers.SerializerMethodField()

    class Meta:
        model = JobSkillRequirement
        fields = [
            'id',
            'job_title',
            'skill',
            'skill_data',
            'required_level',
            'required_level_display',
            'importance',
            'importance_display',
            'notes',
        ]

    def get_required_level_display(self, obj):
        return obj.get_required_level_display() if obj.required_level else None

    def get_importance_display(self, obj):
        return obj.get_importance_display() if obj.importance else None


class TrainingSkillSerializer(serializers.ModelSerializer):
    """Serializer pour les compétences développées par les formations."""

    skill_data = SkillSerializer(source='skill', read_only=True)
    level_provided_display = serializers.SerializerMethodField()

    class Meta:
        model = TrainingSkill
        fields = [
            'id',
            'skill',
            'skill_data',
            'level_provided',
            'level_provided_display',
        ]

    def get_level_provided_display(self, obj):
        return obj.get_level_provided_display() if obj.level_provided else None


class TrainingCourseSerializer(serializers.ModelSerializer):
    """Serializer pour les formations."""

    category_display = serializers.SerializerMethodField()
    skills_provided = TrainingSkillSerializer(
        source='training_skills', many=True, read_only=True
    )

    class Meta:
        model = TrainingCourse
        fields = [
            'id',
            'title',
            'description',
            'category',
            'category_display',
            'duration_hours',
            'provider',
            'location',
            'is_internal',
            'is_online',
            'cost',
            'skills_provided',
        ]

    def get_category_display(self, obj):
        return obj.get_category_display() if obj.category else None


class TrainingPlanItemSerializer(serializers.ModelSerializer):
    """Serializer pour les éléments du plan de formation."""

    training_course_data = TrainingCourseSerializer(
        source='training_course', read_only=True
    )
    status_display = serializers.SerializerMethodField()
    priority_display = serializers.SerializerMethodField()

    class Meta:
        model = TrainingPlanItem
        fields = [
            'id',
            'training_plan',
            'training_course',
            'training_course_data',
            'planned_quarter',
            'priority',
            'priority_display',
            'status',
            'status_display',
            'scheduled_date',
            'completion_date',
            'employee_rating',
            'manager_rating',
            'employee_comments',
            'manager_comments',
        ]

    def get_status_display(self, obj):
        return obj.get_status_display() if obj.status else None

    def get_priority_display(self, obj):
        return obj.get_priority_display() if obj.priority else None


class TrainingPlanSerializer(serializers.ModelSerializer):
    """Serializer pour les plans de formation."""

    employee_data = EmployeeListSerializer(source='employee', read_only=True)
    status_display = serializers.SerializerMethodField()
    training_items = TrainingPlanItemSerializer(many=True, read_only=True)
    total_cost = serializers.SerializerMethodField()
    approvals = serializers.SerializerMethodField()

    class Meta:
        model = TrainingPlan
        fields = [
            'id',
            'employee',
            'employee_data',
            'year',
            'status',
            'status_display',
            'objectives',
            'approved_by_manager',
            'approved_by_hr',
            'approved_by_finance',
            'manager_notes',
            'hr_notes',
            'finance_notes',
            'approvals',
            'training_items',
            'total_cost',
        ]

    def get_status_display(self, obj):
        return obj.get_status_display() if obj.status else None

    def get_total_cost(self, obj):
        return obj.total_training_cost

    def get_approvals(self, obj):
        return {
            'manager': obj.approved_by_manager,
            'hr': obj.approved_by_hr,
            'finance': obj.approved_by_finance,
        }


class AnnouncementSerializer(serializers.ModelSerializer):
    """Serializer pour les annonces internes."""

    author_name = serializers.SerializerMethodField()
    target_audience_display = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = [
            'id',
            'title',
            'content',
            'author',
            'author_name',
            'target_audience',
            'target_audience_display',
            'target_departments',
            'target_employees',
            'is_pinned',
            'is_auto_generated',
            'expires_at',
            'created_at',
        ]

    def get_author_name(self, obj):
        return obj.author.full_name if obj.author else None

    def get_target_audience_display(self, obj):
        return obj.get_target_audience_display()


class WorkCertificateRequestSerializer(serializers.ModelSerializer):
    """Serializer pour les demandes d attestation de travail."""

    employee_name = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    purpose_display = serializers.SerializerMethodField()

    class Meta:
        model = WorkCertificateRequest
        fields = [
            'id',
            'employee',
            'employee_name',
            'purpose',
            'purpose_display',
            'purpose_detail',
            'status',
            'status_display',
            'hr_notes',
            'pdf_file',
            'created_at',
        ]
        extra_kwargs = {
            'employee': {'required': False, 'read_only': False},
        }

    def get_employee_name(self, obj):
        return obj.employee.full_name

    def get_status_display(self, obj):
        return obj.get_status_display()

    def get_purpose_display(self, obj):
        return obj.get_purpose_display()


class ComplaintSerializer(serializers.ModelSerializer):
    """Serializer pour les doleances."""

    employee_name = serializers.SerializerMethodField()
    category_display = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = Complaint
        fields = [
            'id',
            'employee',
            'employee_name',
            'category',
            'category_display',
            'description',
            'is_anonymous',
            'status',
            'status_display',
            'assigned_to',
            'assigned_to_name',
            'hr_notes',
            'resolution_notes',
            'created_at',
        ]
        extra_kwargs = {
            'employee': {'required': False},
            'hr_notes': {'write_only': False},
        }

    def get_employee_name(self, obj):
        if obj.is_anonymous:
            request = self.context.get('request')
            if request and (
                request.user.is_superuser
                or hasattr(request.user, 'employee')
                and getattr(request.user.employee, 'is_hr', False)
            ):
                return f'{obj.employee.full_name} (anonyme)'
            return 'Anonyme'
        return obj.employee.full_name

    def get_category_display(self, obj):
        return obj.get_category_display()

    def get_status_display(self, obj):
        return obj.get_status_display()

    def get_assigned_to_name(self, obj):
        return obj.assigned_to.full_name if obj.assigned_to else None


class RewardTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = RewardType
        fields = ['id', 'name', 'description', 'icon', 'is_active', 'created_at']


class RewardSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    reward_type_name = serializers.SerializerMethodField()
    reward_type_icon = serializers.SerializerMethodField()
    awarded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Reward
        fields = [
            'id',
            'employee',
            'employee_name',
            'reward_type',
            'reward_type_name',
            'reward_type_icon',
            'awarded_date',
            'awarded_by',
            'awarded_by_name',
            'description',
            'is_public',
            'created_at',
        ]
        extra_kwargs = {'awarded_by': {'required': False}}

    def get_employee_name(self, obj):
        return obj.employee.full_name

    def get_reward_type_name(self, obj):
        return obj.reward_type.name

    def get_reward_type_icon(self, obj):
        return obj.reward_type.icon

    def get_awarded_by_name(self, obj):
        return obj.awarded_by.full_name if obj.awarded_by else None


# ── Congés ────────────────────────────────────────────────────────────────────


class LeaveTypeSerializer(serializers.ModelSerializer):
    accrual_method_display = serializers.SerializerMethodField()

    class Meta:
        model = LeaveType
        fields = [
            'id',
            'name',
            'code',
            'description',
            'is_paid',
            'accrual_method',
            'accrual_method_display',
            'max_days_carry',
            'requires_document',
            'is_active',
            'color',
        ]

    def get_accrual_method_display(self, obj):
        return obj.get_accrual_method_display()


class LeaveAllocationSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    leave_type_name = serializers.SerializerMethodField()
    leave_type_color = serializers.SerializerMethodField()
    remaining_days = serializers.SerializerMethodField()

    class Meta:
        model = LeaveAllocation
        fields = [
            'id',
            'employee',
            'employee_name',
            'leave_type',
            'leave_type_name',
            'leave_type_color',
            'year',
            'total_days',
            'used_days',
            'pending_days',
            'carried_days',
            'remaining_days',
        ]

    def get_employee_name(self, obj):
        return obj.employee.full_name

    def get_leave_type_name(self, obj):
        return obj.leave_type.name

    def get_leave_type_color(self, obj):
        return obj.leave_type.color

    def get_remaining_days(self, obj):
        return obj.remaining_days


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    leave_type_name = serializers.SerializerMethodField()
    leave_type_color = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()

    class Meta:
        model = LeaveRequest
        fields = [
            'id',
            'employee',
            'employee_name',
            'leave_type',
            'leave_type_name',
            'leave_type_color',
            'allocation',
            'start_date',
            'end_date',
            'nb_days',
            'reason',
            'document',
            'status',
            'status_display',
            'approved_by_manager',
            'approved_by_hr',
            'manager_notes',
            'hr_notes',
            'created_at',
            'updated_at',
        ]
        extra_kwargs = {
            'nb_days': {'required': False},
            'allocation': {'required': False, 'read_only': True},
            'employee': {'required': False},
        }

    def get_employee_name(self, obj):
        return obj.employee.full_name

    def get_leave_type_name(self, obj):
        return obj.leave_type.name

    def get_leave_type_color(self, obj):
        return obj.leave_type.color

    def get_status_display(self, obj):
        return obj.get_status_display()
