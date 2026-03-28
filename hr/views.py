# hr/views.py
import os

from django.db.models import Avg, Count, Q
from django.http import FileResponse
from django.utils import timezone
from django_filters import rest_framework as django_filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from users.mixins import SelfServicePermissionMixin
from users.permissions import (
    CanSubmitOwnCertificate,
    HasModulePermission,
    module_permission_required,
)

from .models import (
    Announcement,
    Availability,
    Complaint,
    Department,
    Employee,
    EmployeeSkill,
    ExpenseCategory,
    ExpenseItem,
    ExpenseReport,
    JobSkillRequirement,
    JobTitle,
    LeaveAllocation,
    LeaveRequest,
    LeaveType,
    Mission,
    PublicHoliday,
    Reward,
    RewardType,
    Skill,
    TrainingCourse,
    TrainingPlan,
    TrainingPlanItem,
    TrainingSkill,
    WorkCertificateRequest,
)
from .serializers import (
    AnnouncementSerializer,
    AvailabilitySerializer,
    ComplaintSerializer,
    DepartmentSerializer,
    EmployeeDetailSerializer,
    EmployeeListSerializer,
    EmployeeSkillSerializer,
    ExpenseCategorySerializer,
    ExpenseItemSerializer,
    ExpenseReportSerializer,
    JobSkillRequirementSerializer,
    JobTitleSerializer,
    LeaveAllocationSerializer,
    LeaveRequestSerializer,
    LeaveTypeSerializer,
    MissionSerializer,
    PublicHolidaySerializer,
    RewardSerializer,
    RewardTypeSerializer,
    SkillSerializer,
    TrainingCourseSerializer,
    TrainingPlanItemSerializer,
    TrainingPlanSerializer,
    TrainingSkillSerializer,
    WorkCertificateRequestSerializer,
)
from .services.workflow_notification_service import WorkflowNotificationService


# Filtres personnalisés
class EmployeeFilter(django_filters.FilterSet):
    """Filtre personnalisé pour les employés."""

    department = django_filters.NumberFilter(field_name='department')
    manager = django_filters.NumberFilter(field_name='manager')
    job_title = django_filters.NumberFilter(field_name='job_title')
    is_active = django_filters.BooleanFilter(field_name='is_active')
    is_hr = django_filters.BooleanFilter(field_name='is_hr')
    is_finance = django_filters.BooleanFilter(field_name='is_finance')

    class Meta:
        model = Employee
        fields = [
            'department',
            'manager',
            'job_title',
            'is_active',
            'is_hr',
            'is_finance',
        ]


class MissionFilter(django_filters.FilterSet):
    """Filtre personnalisé pour les missions."""

    employee = django_filters.NumberFilter(field_name='employee')
    status = django_filters.CharFilter(field_name='status')
    start_date_after = django_filters.DateFilter(
        field_name='start_date', lookup_expr='gte'
    )
    start_date_before = django_filters.DateFilter(
        field_name='start_date', lookup_expr='lte'
    )

    class Meta:
        model = Mission
        fields = ['employee', 'status', 'start_date_after', 'start_date_before']


class TrainingPlanFilter(django_filters.FilterSet):
    """Filtre personnalisé pour les plans de formation."""

    employee = django_filters.NumberFilter(field_name='employee')
    year = django_filters.NumberFilter(field_name='year')
    status = django_filters.CharFilter(field_name='status')

    class Meta:
        model = TrainingPlan
        fields = ['employee', 'year', 'status']


class DepartmentViewSet(SelfServicePermissionMixin, viewsets.ModelViewSet):
    """API pour les départements."""

    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'hr'
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code', 'description']
    ordering_fields = ['name', 'code']
    ordering = ['name']
    self_service_actions = ['list', 'retrieve']

    @action(detail=True, methods=['get'])
    def employees(self, request, pk=None):
        """Récupérer tous les employés d'un département."""
        department = self.get_object()
        employees = Employee.objects.filter(department=department)
        serializer = EmployeeListSerializer(employees, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def job_titles(self, request, pk=None):
        """Récupérer tous les postes d'un département."""
        department = self.get_object()
        job_titles = JobTitle.objects.filter(department=department)
        serializer = JobTitleSerializer(job_titles, many=True)
        return Response(serializer.data)


class JobTitleViewSet(viewsets.ModelViewSet):
    """API pour les postes."""

    queryset = JobTitle.objects.all()
    serializer_class = JobTitleSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'hr'
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ['department', 'is_management']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'department__name']
    ordering = ['department__name', 'name']

    @action(detail=True, methods=['get'])
    def employees(self, request, pk=None):
        """Récupérer tous les employés ayant ce poste."""
        job_title = self.get_object()
        employees = Employee.objects.filter(job_title=job_title)
        serializer = EmployeeListSerializer(employees, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def skills_required(self, request, pk=None):
        """Récupérer toutes les compétences requises pour ce poste."""
        job_title = self.get_object()
        requirements = JobSkillRequirement.objects.filter(job_title=job_title)
        serializer = JobSkillRequirementSerializer(requirements, many=True)
        return Response(serializer.data)


class EmployeeViewSet(SelfServicePermissionMixin, viewsets.ModelViewSet):
    """API pour les employés."""

    queryset = Employee.objects.all()
    serializer_class = EmployeeListSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'hr'
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = EmployeeFilter
    search_fields = ['first_name', 'last_name', 'email', 'employee_id']
    ordering_fields = [
        'last_name',
        'first_name',
        'hire_date',
        'department__name',
        'job_title__name',
    ]
    ordering = ['last_name', 'first_name']
    self_service_actions = [
        'me',
        'missions',
        'availabilities',
        'training_plans',
        'subordinates',
    ]

    def get_serializer_class(self):
        if self.action in ('retrieve', 'create', 'update', 'partial_update'):
            return EmployeeDetailSerializer
        return EmployeeListSerializer

    @action(detail=True, methods=['get'])
    def skills(self, request, pk=None):
        """Récupérer toutes les compétences d'un employé."""
        employee = self.get_object()
        skills = EmployeeSkill.objects.filter(employee=employee)
        serializer = EmployeeSkillSerializer(skills, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def missions(self, request, pk=None):
        """Récupérer toutes les missions d'un employé."""
        employee = self.get_object()
        missions = Mission.objects.filter(employee=employee)
        serializer = MissionSerializer(missions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def training_plans(self, request, pk=None):
        """Récupérer tous les plans de formation d'un employé."""
        employee = self.get_object()
        plans = TrainingPlan.objects.filter(employee=employee)
        serializer = TrainingPlanSerializer(plans, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def availabilities(self, request, pk=None):
        """Récupérer toutes les mises en disponibilité d'un employé."""
        employee = self.get_object()
        availabilities = Availability.objects.filter(employee=employee)
        serializer = AvailabilitySerializer(availabilities, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def subordinates(self, request, pk=None):
        """Récupérer tous les subordonnés directs d'un employé."""
        employee = self.get_object()
        subordinates = Employee.objects.filter(manager=employee)
        serializer = EmployeeListSerializer(subordinates, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def skill_gaps(self, request, pk=None):
        """Récupérer les écarts de compétences pour un employé par rapport à son poste."""
        employee = self.get_object()
        job_title = employee.job_title

        required_skills = JobSkillRequirement.objects.filter(job_title=job_title)
        employee_skills = EmployeeSkill.objects.filter(employee=employee)

        gaps = []
        for req in required_skills:
            emp_skill = employee_skills.filter(skill=req.skill).first()

            if not emp_skill:
                gap = {
                    'skill': SkillSerializer(req.skill).data,
                    'required_level': req.required_level,
                    'required_level_display': req.get_required_level_display(),
                    'importance': req.importance,
                    'importance_display': req.get_importance_display(),
                    'current_level': 0,
                    'current_level_display': 'Non acquise',
                    'gap': req.required_level,
                    'status': 'missing',
                }
                gaps.append(gap)
            elif emp_skill.level < req.required_level:
                gap = {
                    'skill': SkillSerializer(req.skill).data,
                    'required_level': req.required_level,
                    'required_level_display': req.get_required_level_display(),
                    'importance': req.importance,
                    'importance_display': req.get_importance_display(),
                    'current_level': emp_skill.level,
                    'current_level_display': emp_skill.get_level_display(),
                    'gap': req.required_level - emp_skill.level,
                    'status': 'insufficient',
                }
                gaps.append(gap)

        return Response(gaps)

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Récupérer les informations de l'employé connecté."""
        user = request.user
        if user.is_authenticated:
            try:
                employee = Employee.objects.get(user=user)
                serializer = EmployeeDetailSerializer(employee)
                return Response(serializer.data)
            except Employee.DoesNotExist:
                return Response(
                    {'error': "Aucun employé n'est associé à cet utilisateur."},
                    status=status.HTTP_404_NOT_FOUND,
                )
        else:
            return Response(
                {'error': 'Utilisateur non authentifié.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )


class MissionViewSet(SelfServicePermissionMixin, viewsets.ModelViewSet):
    """API pour les missions."""

    queryset = Mission.objects.all()
    serializer_class = MissionSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'hr'
    self_service_actions = [
        'list',
        'retrieve',
        'submit',
        'approve_manager',
        'approve_hr',
        'approve_finance',
        'reject',
        'submit_report',
    ]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = MissionFilter
    search_fields = [
        'title',
        'description',
        'location',
        'employee__first_name',
        'employee__last_name',
    ]
    ordering_fields = ['start_date', 'end_date', 'status', 'employee__last_name']
    ordering = ['-start_date']

    def perform_create(self, serializer):
        """Personnalisation de la création d'une mission."""
        user = self.request.user
        try:
            employee = Employee.objects.get(user=user)

            if serializer.validated_data.get('employee') == employee:
                serializer.save(requested_by=employee, status='submitted')
            elif (
                serializer.validated_data.get('employee')
                and serializer.validated_data.get('employee').manager == employee
            ):
                serializer.save(requested_by=employee, status='submitted')
            else:
                serializer.save(requested_by=employee)
        except Employee.DoesNotExist:
            serializer.save()

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Soumettre une mission pour approbation."""
        mission = self.get_object()

        if mission.status != 'draft':
            return Response(
                {'error': "Cette mission n'est pas en mode brouillon."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        mission.status = 'submitted'
        mission.save(update_fields=['status'])
        WorkflowNotificationService.mission_submitted(mission)

        return Response(
            {'success': True, 'message': 'Mission soumise pour approbation.'}
        )

    @action(detail=True, methods=['post'])
    def approve_manager(self, request, pk=None):
        """Approuver une mission en tant que manager."""
        mission = self.get_object()

        if mission.status != 'submitted':
            return Response(
                {'error': "Cette mission n'est pas soumise pour approbation."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        notes = request.data.get('notes', '')
        mission.approve_manager(notes)

        WorkflowNotificationService.mission_approved_manager(mission)
        return Response(
            {'success': True, 'message': 'Mission approuvée par le manager.'}
        )

    @action(detail=True, methods=['post'])
    def approve_hr(self, request, pk=None):
        """Approuver une mission en tant que RH."""
        mission = self.get_object()

        if mission.status != 'approved_manager':
            return Response(
                {'error': "Cette mission n'est pas approuvée par le manager."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        notes = request.data.get('notes', '')
        mission.approve_hr(notes)

        WorkflowNotificationService.mission_approved_hr(mission)
        return Response({'success': True, 'message': 'Mission approuvée par les RH.'})

    @action(detail=True, methods=['post'])
    def approve_finance(self, request, pk=None):
        """Approuver une mission en tant que Finance."""
        mission = self.get_object()

        if mission.status != 'approved_hr':
            return Response(
                {'error': "Cette mission n'est pas approuvée par les RH."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        notes = request.data.get('notes', '')
        mission.approve_finance(notes)

        WorkflowNotificationService.mission_approved_finance(mission)
        return Response(
            {'success': True, 'message': 'Mission approuvée par la Finance.'}
        )

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Rejeter une mission."""
        mission = self.get_object()

        if mission.status in ['draft', 'completed', 'rejected', 'cancelled']:
            return Response(
                {'error': 'Impossible de rejeter cette mission dans son état actuel.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        notes = request.data.get('notes', '')
        rejected_by = request.data.get('rejected_by', '')

        mission.reject(notes, rejected_by)
        WorkflowNotificationService.mission_rejected(mission)

        return Response({'success': True, 'message': 'Mission rejetée.'})

    @action(detail=True, methods=['post'])
    def submit_report(self, request, pk=None):
        """Soumettre un rapport de mission."""
        mission = self.get_object()

        if mission.status != 'approved_finance':
            return Response(
                {'error': "Cette mission n'est pas approuvée par toutes les parties."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        report = request.data.get('report', '')
        if not report:
            return Response(
                {'error': 'Le rapport ne peut pas être vide.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        mission.report = report
        mission.report_submitted = True
        mission.report_date = timezone.now().date()
        mission.status = 'completed'
        mission.save(
            update_fields=['report', 'report_submitted', 'report_date', 'status']
        )

        return Response(
            {'success': True, 'message': 'Rapport de mission soumis avec succès.'}
        )

    @action(detail=True, methods=['post'])
    def generate_order_pdf(self, request, pk=None):
        """Générer un PDF d'ordre de mission."""
        mission = self.get_object()

        try:
            from .services.pdf_generator import PDFGenerator

            pdf_path = PDFGenerator.generate_mission_order_pdf(mission)
            mission.order_pdf = pdf_path
            mission.save(update_fields=['order_pdf'])

            return Response(
                {
                    'success': True,
                    'message': "PDF d'ordre de mission généré avec succès.",
                    'path': pdf_path,
                }
            )
        except Exception as e:
            return Response(
                {'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def download_order_pdf(self, request, pk=None):
        """Télécharger le PDF d'ordre de mission."""
        mission = self.get_object()

        if not mission.order_pdf:
            try:
                from .services.pdf_generator import PDFGenerator

                pdf_path = PDFGenerator.generate_mission_order_pdf(mission)
                mission.order_pdf = pdf_path
                mission.save(update_fields=['order_pdf'])
            except Exception as e:
                return Response(
                    {'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        from django.conf import settings

        pdf_path = os.path.join(settings.MEDIA_ROOT, mission.order_pdf)

        if os.path.exists(pdf_path):
            response = FileResponse(
                open(pdf_path, 'rb'), content_type='application/pdf'
            )
            response['Content-Disposition'] = (
                f'attachment; filename="Ordre_de_mission_{mission.id}.pdf"'
            )
            return response
        else:
            return Response(
                {'error': "Le fichier PDF n'existe pas."},
                status=status.HTTP_404_NOT_FOUND,
            )


class AvailabilityViewSet(viewsets.ModelViewSet):
    """API pour les mises en disponibilité."""

    queryset = Availability.objects.all()
    serializer_class = AvailabilitySerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'hr'
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ['employee', 'status', 'type']
    search_fields = ['employee__first_name', 'employee__last_name', 'reason']
    ordering_fields = ['start_date', 'end_date', 'status', 'employee__last_name']
    ordering = ['-start_date']

    def perform_create(self, serializer):
        """Personnalisation de la création d'une mise en disponibilité."""
        user = self.request.user
        try:
            employee = Employee.objects.get(user=user)

            if serializer.validated_data.get('employee') == employee:
                serializer.save(requested_by=employee, status='requested')
            elif (
                serializer.validated_data.get('employee')
                and serializer.validated_data.get('employee').manager == employee
            ):
                serializer.save(requested_by=employee, status='requested')
            else:
                serializer.save(requested_by=employee)
        except Employee.DoesNotExist:
            serializer.save()

    @action(detail=True, methods=['post'])
    def approve_manager(self, request, pk=None):
        availability = self.get_object()

        if availability.status != 'requested':
            return Response(
                {'error': "Cette mise en disponibilité n'est pas en demande."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        notes = request.data.get('notes', '')
        availability.approved_by_manager = True
        availability.manager_notes = notes
        availability.save(update_fields=['approved_by_manager', 'manager_notes'])

        if availability.approved_by_manager and availability.approved_by_hr:
            availability.status = 'approved'
            availability.save(update_fields=['status'])

        WorkflowNotificationService.availability_approved_manager(availability)

        return Response(
            {
                'success': True,
                'message': 'Mise en disponibilité approuvée par le manager.',
            }
        )

    @action(detail=True, methods=['post'])
    def approve_hr(self, request, pk=None):
        availability = self.get_object()

        if availability.status != 'requested':
            return Response(
                {'error': "Cette mise en disponibilité n'est pas en demande."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        notes = request.data.get('notes', '')
        availability.approved_by_hr = True
        availability.hr_notes = notes
        availability.save(update_fields=['approved_by_hr', 'hr_notes'])

        if availability.approved_by_manager and availability.approved_by_hr:
            availability.status = 'approved'
            availability.save(update_fields=['status'])

        WorkflowNotificationService.availability_approved_hr(availability)

        return Response(
            {
                'success': True,
                'message': 'Mise en disponibilité approuvée par les RH.',
            }
        )

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        availability = self.get_object()

        if availability.status != 'requested':
            return Response(
                {'error': "Cette mise en disponibilité n'est pas en demande."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rejected_by = request.data.get('rejected_by', '')
        notes = request.data.get('notes', '')

        if rejected_by == 'manager':
            availability.manager_notes = notes
        elif rejected_by == 'hr':
            availability.hr_notes = notes

        availability.status = 'rejected'
        availability.save()

        WorkflowNotificationService.availability_rejected(availability)

        return Response({'success': True, 'message': 'Mise en disponibilité rejetée.'})

    @action(detail=False, methods=['get'])
    def pending_approvals(self, request):
        """Retourne les mises en disponibilité en attente d'approbation."""
        qs = Availability.objects.filter(status='requested').order_by('-created_at')

        try:
            employee = Employee.objects.get(user=request.user)
            if employee.is_hr:
                pass
            elif employee.is_manager:
                qs = qs.filter(employee__manager=employee)
            else:
                qs = qs.filter(employee=employee)
        except Employee.DoesNotExist:
            pass

        serializer = AvailabilitySerializer(qs, many=True)
        return Response(serializer.data)


class SkillViewSet(viewsets.ModelViewSet):
    """API pour les compétences."""

    queryset = Skill.objects.all()
    serializer_class = SkillSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'hr'
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ['category']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'category']
    ordering = ['category', 'name']

    @action(detail=True, methods=['get'])
    def employees(self, request, pk=None):
        """Récupérer tous les employés ayant cette compétence."""
        skill = self.get_object()
        employee_skills = EmployeeSkill.objects.filter(skill=skill)

        min_level = request.query_params.get('min_level')
        if min_level and min_level.isdigit():
            employee_skills = employee_skills.filter(level__gte=int(min_level))

        serializer = EmployeeSkillSerializer(employee_skills, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def job_requirements(self, request, pk=None):
        """Récupérer tous les postes qui exigent cette compétence."""
        skill = self.get_object()
        requirements = JobSkillRequirement.objects.filter(skill=skill)
        serializer = JobSkillRequirementSerializer(requirements, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def training_courses(self, request, pk=None):
        """Récupérer toutes les formations qui développent cette compétence."""
        skill = self.get_object()
        training_skills = TrainingSkill.objects.filter(skill=skill)

        min_level = request.query_params.get('min_level')
        if min_level and min_level.isdigit():
            training_skills = training_skills.filter(level_provided__gte=int(min_level))

        serializer = TrainingSkillSerializer(training_skills, many=True)
        return Response(serializer.data)


class TrainingCourseViewSet(SelfServicePermissionMixin, viewsets.ModelViewSet):
    """API pour les formations."""

    queryset = TrainingCourse.objects.all()
    serializer_class = TrainingCourseSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'hr'
    self_service_actions = ['list', 'retrieve']
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ['category', 'is_internal', 'is_online']
    search_fields = ['title', 'description', 'provider']
    ordering_fields = ['title', 'category', 'duration_hours', 'cost']
    ordering = ['category', 'title']

    @action(detail=True, methods=['get'])
    def skills_provided(self, request, pk=None):
        """Récupérer toutes les compétences développées par cette formation."""
        course = self.get_object()
        training_skills = TrainingSkill.objects.filter(training_course=course)
        serializer = TrainingSkillSerializer(training_skills, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def training_plans(self, request, pk=None):
        """Récupérer tous les plans de formation qui incluent cette formation."""
        course = self.get_object()
        plan_items = TrainingPlanItem.objects.filter(training_course=course)

        year = request.query_params.get('year')
        if year and year.isdigit():
            plan_items = plan_items.filter(training_plan__year=int(year))

        plans = {}
        for item in plan_items:
            plan_id = item.training_plan.id
            if plan_id not in plans:
                plans[plan_id] = {'plan': item.training_plan, 'items': []}
            plans[plan_id]['items'].append(item)

        result = []
        for plan_data in plans.values():
            plan_serializer = TrainingPlanSerializer(plan_data['plan'])
            items_serializer = TrainingPlanItemSerializer(plan_data['items'], many=True)
            result.append(
                {'plan': plan_serializer.data, 'items': items_serializer.data}
            )

        return Response(result)


class TrainingPlanViewSet(SelfServicePermissionMixin, viewsets.ModelViewSet):
    """API pour les plans de formation."""

    queryset = TrainingPlan.objects.all()
    serializer_class = TrainingPlanSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'hr'
    self_service_actions = [
        'create',
        'list',
        'retrieve',
        'submit',
        'cancel',
        'approve_manager',
        'approve_hr',
        'approve_finance',
        'reject',
    ]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = TrainingPlanFilter
    search_fields = ['employee__first_name', 'employee__last_name', 'objectives']
    ordering_fields = ['year', 'employee__last_name', 'status']
    ordering = ['-year', 'employee__last_name']

    def get_queryset(self):
        user = self.request.user
        qs = TrainingPlan.objects.select_related('employee')
        try:
            emp = Employee.objects.get(user=user)
            if emp.is_hr or user.is_superuser:
                return qs
            return qs.filter(employee=emp)
        except Employee.DoesNotExist:
            return qs

    def perform_create(self, serializer):
        """Auto-assigne l'employe connecte si non specifie."""
        try:
            emp = Employee.objects.get(user=self.request.user)
            if not serializer.validated_data.get('employee'):
                serializer.save(employee=emp)
                return
        except Employee.DoesNotExist:
            pass
        serializer.save()

    @action(detail=True, methods=['get'])
    def items(self, request, pk=None):
        """Récupérer tous les éléments d'un plan de formation."""
        plan = self.get_object()
        items = TrainingPlanItem.objects.filter(training_plan=plan)
        serializer = TrainingPlanItemSerializer(items, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Soumettre un plan de formation pour approbation."""
        plan = self.get_object()

        if plan.status != 'draft':
            return Response(
                {'error': "Ce plan n'est pas en mode brouillon."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not plan.training_items.exists():
            return Response(
                {'error': 'Le plan ne contient aucune formation.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        plan.status = 'submitted'
        plan.save(update_fields=['status'])
        WorkflowNotificationService.training_submitted(plan)

        return Response(
            {'success': True, 'message': 'Plan de formation soumis pour approbation.'}
        )

    @action(detail=True, methods=['post'])
    def approve_manager(self, request, pk=None):
        """Approuver un plan de formation en tant que manager."""
        plan = self.get_object()

        if plan.status != 'submitted':
            return Response(
                {'error': "Ce plan n'est pas soumis pour approbation."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        notes = request.data.get('notes', '')
        plan.approved_by_manager = True
        plan.manager_notes = notes
        plan.status = 'approved_manager'
        plan.save(update_fields=['approved_by_manager', 'manager_notes', 'status'])

        WorkflowNotificationService.training_approved_manager(plan)
        return Response(
            {'success': True, 'message': 'Plan de formation approuvé par le manager.'}
        )

    @action(detail=True, methods=['post'])
    def approve_hr(self, request, pk=None):
        """Approuver un plan de formation en tant que RH."""
        plan = self.get_object()

        if plan.status != 'approved_manager':
            return Response(
                {'error': "Ce plan n'est pas approuvé par le manager."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        notes = request.data.get('notes', '')
        plan.approved_by_hr = True
        plan.hr_notes = notes
        plan.status = 'approved_hr'
        plan.save(update_fields=['approved_by_hr', 'hr_notes', 'status'])

        WorkflowNotificationService.training_approved_hr(plan)
        return Response(
            {'success': True, 'message': 'Plan de formation approuvé par les RH.'}
        )

    @action(detail=True, methods=['post'])
    def approve_finance(self, request, pk=None):
        """Approuver un plan de formation en tant que Finance."""
        plan = self.get_object()

        if plan.status != 'approved_hr':
            return Response(
                {'error': "Ce plan n'est pas approuvé par les RH."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        notes = request.data.get('notes', '')
        plan.approved_by_finance = True
        plan.finance_notes = notes
        plan.status = 'approved_finance'
        plan.save(update_fields=['approved_by_finance', 'finance_notes', 'status'])

        WorkflowNotificationService.training_approved_finance(plan)
        return Response(
            {'success': True, 'message': 'Plan de formation approuvé par la Finance.'}
        )

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Rejeter un plan de formation."""
        plan = self.get_object()

        if plan.status in ['draft', 'completed', 'rejected']:
            return Response(
                {'error': 'Impossible de rejeter ce plan dans son état actuel.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        notes = request.data.get('notes', '')
        rejected_by = request.data.get('rejected_by', '')

        if rejected_by == 'manager':
            plan.manager_notes = notes
        elif rejected_by == 'hr':
            plan.hr_notes = notes
        elif rejected_by == 'finance':
            plan.finance_notes = notes

        plan.status = 'rejected'
        plan.save()
        WorkflowNotificationService.training_rejected(plan)

        return Response({'success': True, 'message': 'Plan de formation rejeté.'})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Annuler un plan de formation (brouillon ou soumis uniquement)."""
        plan = self.get_object()
        if plan.status not in ['draft', 'submitted']:
            return Response(
                {'error': "Impossible d'annuler dans cet état."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        plan.status = 'rejected'
        plan.save(update_fields=['status'])
        return Response({'success': True, 'message': 'Plan de formation annulé.'})

    @action(detail=False, methods=['get'])
    def skills_gap_analysis(self, request):
        """Analyser les écarts de compétences pour les employés."""
        department_id = request.query_params.get('department')

        employees = Employee.objects.filter(is_active=True)
        if department_id:
            employees = employees.filter(department_id=department_id)

        results = []
        for employee in employees:
            job_title = employee.job_title
            if not job_title:
                continue

            required_skills = JobSkillRequirement.objects.filter(job_title=job_title)
            employee_skills = EmployeeSkill.objects.filter(employee=employee)

            gaps = []
            for req in required_skills:
                emp_skill = employee_skills.filter(skill=req.skill).first()

                if not emp_skill:
                    gaps.append(
                        {
                            'skill': req.skill.name,
                            'required_level': req.required_level,
                            'current_level': 0,
                            'gap': req.required_level,
                            'importance': req.importance,
                        }
                    )
                elif emp_skill.level < req.required_level:
                    gaps.append(
                        {
                            'skill': req.skill.name,
                            'required_level': req.required_level,
                            'current_level': emp_skill.level,
                            'gap': req.required_level - emp_skill.level,
                            'importance': req.importance,
                        }
                    )

            if gaps:
                results.append(
                    {
                        'employee': {
                            'id': employee.id,
                            'name': employee.full_name,
                            'job_title': job_title.name,
                            'department': employee.department.name
                            if employee.department
                            else None,
                        },
                        'gaps': gaps,
                    }
                )

        return Response(results)


class TrainingPlanItemViewSet(SelfServicePermissionMixin, viewsets.ModelViewSet):
    """API pour les éléments des plans de formation."""

    queryset = TrainingPlanItem.objects.all()
    serializer_class = TrainingPlanItemSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'hr'
    self_service_actions = ['create', 'list', 'retrieve', 'update', 'destroy']
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ['training_plan', 'training_course', 'status', 'planned_quarter']
    search_fields = ['training_course__title', 'employee_comments', 'manager_comments']
    ordering_fields = ['planned_quarter', 'priority', 'status']
    ordering = ['training_plan__year', 'planned_quarter', '-priority']

    @action(detail=True, methods=['post'])
    def schedule(self, request, pk=None):
        """Programmer une formation."""
        item = self.get_object()

        if item.status != 'planned':
            return Response(
                {'error': "Cette formation n'est pas en statut planifiée."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        scheduled_date = request.data.get('scheduled_date')
        if not scheduled_date:
            return Response(
                {'error': 'La date de programmation est requise.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        item.scheduled_date = scheduled_date
        item.status = 'scheduled'
        item.save(update_fields=['scheduled_date', 'status'])

        return Response(
            {'success': True, 'message': 'Formation programmée avec succès.'}
        )

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Marquer une formation comme étant en cours."""
        item = self.get_object()

        if item.status != 'scheduled':
            return Response(
                {'error': "Cette formation n'est pas programmée."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        item.status = 'in_progress'
        item.save(update_fields=['status'])

        return Response(
            {'success': True, 'message': 'Formation marquée comme en cours.'}
        )

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Marquer une formation comme terminée."""
        item = self.get_object()

        if item.status not in ['scheduled', 'in_progress']:
            return Response(
                {'error': "Cette formation n'est pas programmée ou en cours."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        completion_date = request.data.get('completion_date')
        employee_rating = request.data.get('employee_rating')
        employee_comments = request.data.get('employee_comments', '')

        if not completion_date:
            return Response(
                {'error': 'La date de fin est requise.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        item.completion_date = completion_date
        item.status = 'completed'

        if employee_rating:
            item.employee_rating = employee_rating

        if employee_comments:
            item.employee_comments = employee_comments

        item.save()

        return Response(
            {'success': True, 'message': 'Formation marquée comme terminée.'}
        )

    @action(detail=True, methods=['post'])
    def manager_evaluation(self, request, pk=None):
        """Ajouter l'évaluation du manager pour une formation terminée."""
        item = self.get_object()

        if item.status != 'completed':
            return Response(
                {'error': "Cette formation n'est pas terminée."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        manager_rating = request.data.get('manager_rating')
        manager_comments = request.data.get('manager_comments', '')

        if not manager_rating:
            return Response(
                {'error': "L'évaluation du manager est requise."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        item.manager_rating = manager_rating
        item.manager_comments = manager_comments
        item.save(update_fields=['manager_rating', 'manager_comments'])

        return Response(
            {'success': True, 'message': 'Évaluation du manager ajoutée avec succès.'}
        )


class AnnouncementViewSet(SelfServicePermissionMixin, viewsets.ModelViewSet):
    """API pour les annonces internes."""

    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'hr'
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'content']
    ordering = ['-is_pinned', '-created_at']
    self_service_actions = ['list', 'retrieve']

    def get_queryset(self):
        """Filtre les annonces selon l'audience et l'expiration."""
        from django.utils import timezone

        qs = Announcement.objects.filter(
            Q(expires_at__isnull=True) | Q(expires_at__gte=timezone.now())
        )

        try:
            employee = Employee.objects.get(user=self.request.user)
            qs = qs.filter(
                Q(target_audience='all')
                | Q(
                    target_audience='department', target_departments=employee.department
                )
                | Q(target_audience='individual', target_employees=employee)
            ).distinct()
        except Employee.DoesNotExist:
            pass

        return qs

    def perform_create(self, serializer):
        try:
            employee = Employee.objects.get(user=self.request.user)
            serializer.save(author=employee)
        except Employee.DoesNotExist:
            serializer.save()


class WorkCertificateRequestViewSet(SelfServicePermissionMixin, viewsets.ModelViewSet):
    """API pour les demandes d attestation de travail."""

    queryset = WorkCertificateRequest.objects.all()
    serializer_class = WorkCertificateRequestSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'hr'
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['employee', 'status', 'purpose']
    ordering = ['-created_at']
    self_service_actions = ['create', 'list', 'retrieve']
    self_service_permissions = [
        permissions.IsAuthenticated,
        CanSubmitOwnCertificate,
    ]

    def get_queryset(self):
        try:
            employee = Employee.objects.get(user=self.request.user)
            if employee.is_hr:
                return WorkCertificateRequest.objects.all()
            return WorkCertificateRequest.objects.filter(employee=employee)
        except Employee.DoesNotExist:
            return WorkCertificateRequest.objects.all()

    def perform_create(self, serializer):
        try:
            employee = Employee.objects.get(user=self.request.user)
            instance = serializer.save(employee=employee)
        except Employee.DoesNotExist:
            instance = serializer.save()
        WorkflowNotificationService.certificate_requested(instance)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approuve la demande et genere le PDF."""
        cert = self.get_object()
        if cert.status != 'pending':
            return Response(
                {'error': 'Cette demande ne peut plus etre approuvee.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        notes = request.data.get('hr_notes', '')
        cert.status = 'approved'
        cert.hr_notes = notes
        cert.save(update_fields=['status', 'hr_notes'])

        try:
            from .services.pdf_generator import PDFGenerator

            pdf_path = PDFGenerator.generate_work_certificate_pdf(cert)
            cert.pdf_file = pdf_path
            cert.save(update_fields=['pdf_file'])
        except Exception as e:
            return Response(
                {'error': f'Approbation enregistree mais erreur PDF : {e}'},
                status=status.HTTP_200_OK,
            )

        WorkflowNotificationService.certificate_approved(cert)

        return Response(
            {'success': True, 'message': 'Attestation approuvee et PDF genere.'}
        )

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Rejette la demande."""
        cert = self.get_object()
        if cert.status != 'pending':
            return Response(
                {'error': 'Cette demande ne peut plus etre rejetee.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        notes = request.data.get('hr_notes', '')
        cert.status = 'rejected'
        cert.hr_notes = notes
        cert.save(update_fields=['status', 'hr_notes'])
        WorkflowNotificationService.certificate_rejected(cert)
        return Response({'success': True, 'message': 'Demande rejetee.'})

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Telecharge le PDF de l attestation."""
        from django.conf import settings
        from django.http import FileResponse

        cert = self.get_object()
        if not cert.pdf_file:
            return Response(
                {'error': 'Aucun PDF disponible pour cette demande.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        pdf_path = os.path.join(settings.MEDIA_ROOT, cert.pdf_file)
        if not os.path.exists(pdf_path):
            return Response(
                {'error': 'Fichier PDF introuvable.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        response = FileResponse(open(pdf_path, 'rb'), content_type='application/pdf')
        response['Content-Disposition'] = (
            f'attachment; filename="Attestation_{cert.employee.employee_id}_{cert.id}.pdf"'
        )
        return response


class ComplaintViewSet(SelfServicePermissionMixin, viewsets.ModelViewSet):
    """API pour les doleances."""

    queryset = Complaint.objects.all()
    serializer_class = ComplaintSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'hr'
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'category']
    ordering = ['-created_at']
    self_service_actions = ['create', 'list', 'retrieve']
    self_service_permissions = [
        permissions.IsAuthenticated,
        CanSubmitOwnCertificate,
    ]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Complaint.objects.all()
        try:
            emp = Employee.objects.get(user=user)
            if emp.is_hr:
                return Complaint.objects.all()
            return Complaint.objects.filter(employee=emp)
        except Employee.DoesNotExist:
            return Complaint.objects.all()

    def perform_create(self, serializer):
        try:
            emp = Employee.objects.get(user=self.request.user)
            serializer.save(employee=emp)
        except Employee.DoesNotExist:
            serializer.save()

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        complaint = self.get_object()
        new_status = request.data.get('status')
        valid = [s[0] for s in Complaint.STATUS_CHOICES]
        if new_status not in valid:
            return Response(
                {'error': f'Statut invalide. Valeurs : {valid}'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        notes = request.data.get('hr_notes', complaint.hr_notes)
        resolution = request.data.get('resolution_notes', complaint.resolution_notes)
        complaint.status = new_status
        complaint.hr_notes = notes
        complaint.resolution_notes = resolution
        complaint.save(update_fields=['status', 'hr_notes', 'resolution_notes'])
        return Response({'success': True, 'status': new_status})


class RewardTypeViewSet(viewsets.ModelViewSet):
    """API pour les types de recompenses."""

    queryset = RewardType.objects.filter(is_active=True)
    serializer_class = RewardTypeSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'hr'


class RewardViewSet(SelfServicePermissionMixin, viewsets.ModelViewSet):
    """API pour les recompenses."""

    queryset = Reward.objects.all()
    serializer_class = RewardSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'hr'
    self_service_actions = ['board']

    def get_queryset(self):
        if self.action == 'board':
            return Reward.objects.filter(is_public=True)
        return Reward.objects.all()

    def perform_create(self, serializer):
        try:
            emp = Employee.objects.get(user=self.request.user)
            serializer.save(awarded_by=emp)
        except Employee.DoesNotExist:
            serializer.save()

    @action(detail=False, methods=['get'])
    def board(self, request):
        """Reward board public."""
        rewards = Reward.objects.filter(is_public=True).select_related(
            'employee', 'reward_type', 'awarded_by'
        )
        serializer = self.get_serializer(rewards, many=True)
        return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
@module_permission_required('hr')
def dashboard_view(request):
    """Vue du tableau de bord RH avec statistiques et informations importantes."""
    total_employees = Employee.objects.filter(is_active=True).count()
    employees_by_department = (
        Employee.objects.filter(is_active=True)
        .values('department__name')
        .annotate(count=Count('id'))
        .order_by('-count')
    )
    employees_by_job_title = (
        Employee.objects.filter(is_active=True)
        .values('job_title__name', 'job_title__department__name')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    missions_by_status = (
        Mission.objects.values('status').annotate(count=Count('id')).order_by('status')
    )
    upcoming_missions = Mission.objects.filter(
        start_date__gte=timezone.now().date()
    ).order_by('start_date')[:5]
    upcoming_missions_data = MissionSerializer(upcoming_missions, many=True).data

    training_plans_by_status = (
        TrainingPlan.objects.filter(year=timezone.now().year)
        .values('status')
        .annotate(count=Count('id'))
        .order_by('status')
    )
    training_items_by_status = (
        TrainingPlanItem.objects.filter(training_plan__year=timezone.now().year)
        .values('status')
        .annotate(count=Count('id'))
        .order_by('status')
    )

    skills_count = Skill.objects.count()
    avg_skills_per_employee = (
        EmployeeSkill.objects.values('employee')
        .annotate(count=Count('id'))
        .aggregate(avg=Avg('count'))['avg']
        or 0
    )

    coverage_data = []
    for dept in Department.objects.all():
        employees = Employee.objects.filter(department=dept, is_active=True)
        dept_data = {
            'department': dept.name,
            'employee_count': employees.count(),
            'skill_coverage': 0,
        }

        if dept_data['employee_count'] > 0:
            coverage_sum = 0
            for employee in employees:
                if not employee.job_title:
                    continue

                required_skills = JobSkillRequirement.objects.filter(
                    job_title=employee.job_title
                )
                if not required_skills.exists():
                    continue

                employee_skills = EmployeeSkill.objects.filter(employee=employee)

                covered = 0
                total = required_skills.count()

                for req in required_skills:
                    emp_skill = employee_skills.filter(skill=req.skill).first()
                    if emp_skill and emp_skill.level >= req.required_level:
                        covered += 1

                if total > 0:
                    coverage_sum += (covered / total) * 100

            dept_data['skill_coverage'] = coverage_sum / dept_data['employee_count']

        coverage_data.append(dept_data)

    return Response(
        {
            'general': {
                'total_employees': total_employees,
                'employees_by_department': employees_by_department,
                'employees_by_job_title': employees_by_job_title,
            },
            'missions': {
                'by_status': missions_by_status,
                'upcoming': upcoming_missions_data,
            },
            'training': {
                'plans_by_status': training_plans_by_status,
                'items_by_status': training_items_by_status,
            },
            'skills': {
                'total': skills_count,
                'avg_per_employee': avg_skills_per_employee,
                'coverage_by_department': coverage_data,
            },
        }
    )


# ── Congés ────────────────────────────────────────────────────────────────────


class LeaveTypeViewSet(SelfServicePermissionMixin, viewsets.ModelViewSet):
    """API pour les types de congés."""

    queryset = LeaveType.objects.filter(is_active=True)
    serializer_class = LeaveTypeSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'hr'
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'code']
    self_service_actions = ['list', 'retrieve']


class LeaveAllocationViewSet(viewsets.ReadOnlyModelViewSet):
    """API pour les soldes de congés (lecture seule — alimenté par Celery)."""

    queryset = LeaveAllocation.objects.select_related('employee', 'leave_type')
    serializer_class = LeaveAllocationSerializer
    permission_classes = [permissions.IsAuthenticated]
    module_name = 'hr'
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['employee', 'leave_type', 'year']

    def get_queryset(self):
        user = self.request.user
        qs = LeaveAllocation.objects.select_related('employee', 'leave_type')
        try:
            emp = Employee.objects.get(user=user)
            if emp.is_hr or user.is_superuser:
                return qs
            return qs.filter(employee=emp)
        except Employee.DoesNotExist:
            return qs

    @action(detail=False, methods=['get'], url_path='my_balance')
    def my_balance(self, request):
        """Soldes de l'employé connecté pour l'année en cours."""
        from datetime import date

        year = int(request.query_params.get('year', date.today().year))
        try:
            emp = Employee.objects.get(user=request.user)
        except Employee.DoesNotExist:
            return Response(
                {'error': 'Aucun dossier employé associé à ce compte.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        allocations = LeaveAllocation.objects.filter(
            employee=emp, year=year
        ).select_related('leave_type')
        serializer = LeaveAllocationSerializer(allocations, many=True)
        return Response(serializer.data)


class LeaveRequestViewSet(SelfServicePermissionMixin, viewsets.ModelViewSet):
    """API pour les demandes de congé avec workflow manager → RH."""

    queryset = LeaveRequest.objects.select_related(
        'employee', 'leave_type', 'allocation'
    )
    serializer_class = LeaveRequestSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'hr'
    self_service_actions = [
        'create',
        'list',
        'retrieve',
        'submit',
        'cancel',
        'pending_approvals',
        'team_calendar',
        'approve_manager',
        'approve_hr',
        'reject',
    ]

    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['employee', 'leave_type', 'status']
    ordering = ['-start_date']

    def get_queryset(self):
        user = self.request.user
        qs = LeaveRequest.objects.select_related('employee', 'leave_type', 'allocation')
        try:
            emp = Employee.objects.get(user=user)
            if not (emp.is_hr or user.is_superuser):
                if emp.is_manager:
                    qs = qs.filter(Q(employee=emp) | Q(employee__manager=emp))
                else:
                    qs = qs.filter(employee=emp)
        except Employee.DoesNotExist:
            pass
        status_in = self.request.query_params.get('status__in')
        if status_in:
            qs = qs.filter(status__in=status_in.split(','))
        return qs

    def perform_create(self, serializer):
        from hr.services.leave_service import calculate_working_days

        start = serializer.validated_data['start_date']
        end = serializer.validated_data['end_date']
        nb_days = calculate_working_days(start, end)
        try:
            emp = Employee.objects.get(user=self.request.user)
            serializer.save(employee=emp, nb_days=nb_days)
        except Employee.DoesNotExist:
            serializer.save(nb_days=nb_days)

    def _get_or_create_allocation(self, leave_request):
        alloc, _ = LeaveAllocation.objects.get_or_create(
            employee=leave_request.employee,
            leave_type=leave_request.leave_type,
            year=leave_request.start_date.year,
            defaults={'total_days': 0},
        )
        return alloc

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Soumettre une demande en brouillon."""
        req = self.get_object()
        if req.status != 'draft':
            return Response(
                {'error': "La demande n'est pas en brouillon."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        req.status = 'submitted'
        req.save(update_fields=['status'])
        WorkflowNotificationService.leave_submitted(req)
        return Response(
            {'success': True, 'message': 'Demande soumise pour approbation.'}
        )

    @action(detail=True, methods=['post'])
    def approve_manager(self, request, pk=None):
        """Approbation N+1 — crédite les jours en attente."""
        from decimal import Decimal

        req = self.get_object()
        if req.status != 'submitted':
            return Response(
                {'error': "La demande n'est pas soumise."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        alloc = self._get_or_create_allocation(req)
        alloc.pending_days = (alloc.pending_days + req.nb_days).quantize(Decimal('0.1'))
        alloc.save(update_fields=['pending_days'])
        req.approved_by_manager = True
        req.manager_notes = request.data.get('notes', '')
        req.status = 'approved_manager'
        req.allocation = alloc
        req.save(
            update_fields=[
                'approved_by_manager',
                'manager_notes',
                'status',
                'allocation',
            ]
        )
        WorkflowNotificationService.leave_approved_manager(req)
        return Response(
            {'success': True, 'message': 'Demande approuvée par le manager.'}
        )

    @action(detail=True, methods=['post'])
    def approve_hr(self, request, pk=None):
        """Validation RH — transfert pending → used et notifie l'employé."""
        from decimal import Decimal

        req = self.get_object()
        if req.status != 'approved_manager':
            return Response(
                {'error': "La demande n'est pas approuvée par le manager."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        alloc = req.allocation or self._get_or_create_allocation(req)
        alloc.pending_days = max(Decimal('0'), alloc.pending_days - req.nb_days)
        alloc.used_days = (alloc.used_days + req.nb_days).quantize(Decimal('0.1'))
        alloc.save(update_fields=['pending_days', 'used_days'])
        req.approved_by_hr = True
        req.hr_notes = request.data.get('notes', '')
        req.status = 'approved_hr'
        req.save(update_fields=['approved_by_hr', 'hr_notes', 'status'])
        WorkflowNotificationService.leave_approved_hr(req)
        return Response({'success': True, 'message': 'Demande validée par les RH.'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Rejet à n'importe quelle étape — libère les jours en attente."""
        from decimal import Decimal

        req = self.get_object()
        if req.status in ['draft', 'rejected', 'cancelled', 'approved_hr']:
            return Response(
                {'error': 'Impossible de rejeter dans cet état.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if req.allocation and req.status == 'approved_manager':
            req.allocation.pending_days = max(
                Decimal('0'), req.allocation.pending_days - req.nb_days
            )
            req.allocation.save(update_fields=['pending_days'])
        notes = request.data.get('notes', '')
        rejected_by = request.data.get('rejected_by', '')
        if rejected_by == 'manager':
            req.manager_notes = notes
        else:
            req.hr_notes = notes
        req.status = 'rejected'
        req.save()
        WorkflowNotificationService.leave_rejected(req)
        return Response({'success': True, 'message': 'Demande rejetée.'})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Annulation par l'employé — libère les jours en attente."""
        from decimal import Decimal

        req = self.get_object()
        if req.status in ['approved_hr', 'rejected', 'cancelled']:
            return Response(
                {'error': "Impossible d'annuler dans cet état."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if req.allocation and req.status == 'approved_manager':
            req.allocation.pending_days = max(
                Decimal('0'), req.allocation.pending_days - req.nb_days
            )
            req.allocation.save(update_fields=['pending_days'])
        req.status = 'cancelled'
        req.save(update_fields=['status'])
        WorkflowNotificationService.leave_cancelled(req)
        return Response({'success': True, 'message': 'Demande annulée.'})

    @action(detail=False, methods=['get'])
    def pending_approvals(self, request):
        """Demandes en attente selon le rôle de l'utilisateur connecté."""
        try:
            emp = Employee.objects.get(user=request.user)
        except Employee.DoesNotExist:
            return Response([])
        if emp.is_hr or request.user.is_superuser:
            qs = LeaveRequest.objects.filter(status='approved_manager')
        elif emp.is_manager:
            qs = LeaveRequest.objects.filter(status='submitted', employee__manager=emp)
        else:
            return Response([])
        serializer = LeaveRequestSerializer(qs.order_by('-created_at'), many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def team_calendar(self, request):
        """Congés approuvés de l'équipe — données pour le calendrier."""
        from datetime import date

        year = int(request.query_params.get('year', date.today().year))
        month = request.query_params.get('month')
        qs = LeaveRequest.objects.filter(
            status='approved_hr', start_date__year=year
        ).select_related('employee', 'leave_type')
        if month:
            qs = qs.filter(start_date__month=int(month))
        department = request.query_params.get('department')
        if department and department.isdigit():
            qs = qs.filter(employee__department_id=int(department))
        serializer = LeaveRequestSerializer(qs, many=True)
        return Response(serializer.data)


# ── Notes de frais ────────────────────────────────────────────────────────────


class ExpenseCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """Catégories de frais — lecture seule, chargées via _load_locale_pack()."""

    queryset = ExpenseCategory.objects.filter(is_active=True)
    serializer_class = ExpenseCategorySerializer
    permission_classes = [permissions.IsAuthenticated]


class ExpenseReportViewSet(SelfServicePermissionMixin, viewsets.ModelViewSet):
    """Notes de frais avec workflow Manager → Finance."""

    queryset = ExpenseReport.objects.select_related('employee')
    serializer_class = ExpenseReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'employee']
    ordering = ['-created_at']
    self_service_actions = [
        'create',
        'list',
        'retrieve',
        'update',
        'partial_update',
        'submit',
        'cancel',
        'pending_approvals',
        'approve_manager',
        'approve_finance',
        'reimburse',
        'reject',
    ]

    def get_queryset(self):
        user = self.request.user
        qs = ExpenseReport.objects.select_related('employee')
        try:
            emp = Employee.objects.get(user=user)
            if not (user.is_superuser or emp.is_hr):
                visible = Q(employee=emp)
                if emp.is_manager:
                    visible |= Q(status='submitted', employee__manager=emp)
                    visible |= Q(status='approved_manager', employee__manager=emp)
                if emp.is_finance:
                    visible |= Q(status='approved_manager')
                qs = qs.filter(visible).distinct()
        except Employee.DoesNotExist:
            pass
        status_in = self.request.query_params.get('status__in')
        if status_in:
            qs = qs.filter(status__in=status_in.split(','))
        return qs

    def perform_create(self, serializer):
        try:
            emp = Employee.objects.get(user=self.request.user)
            serializer.save(employee=emp)
        except Employee.DoesNotExist:
            serializer.save()

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status != 'draft':
            return Response(
                {'error': 'Seules les notes en brouillon peuvent être modifiées.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status != 'draft':
            return Response(
                {'error': 'Seules les notes en brouillon peuvent être supprimées.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Soumettre une note en brouillon."""
        report = self.get_object()
        if report.status != 'draft':
            return Response(
                {'error': "La note n'est pas en brouillon."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not report.items.exists():
            return Response(
                {'error': 'La note ne contient aucune ligne de frais.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        report.status = 'submitted'
        report.save(update_fields=['status'])
        WorkflowNotificationService.expense_submitted(report)
        return Response({'success': True, 'message': 'Note soumise pour approbation.'})

    @action(detail=True, methods=['post'])
    def approve_manager(self, request, pk=None):
        """Approbation N+1."""
        report = self.get_object()
        if report.status != 'submitted':
            return Response(
                {'error': "La note n'est pas soumise."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        report.approved_by_manager = True
        report.manager_notes = request.data.get('notes', '')
        report.status = 'approved_manager'
        report.save(update_fields=['approved_by_manager', 'manager_notes', 'status'])
        WorkflowNotificationService.expense_approved_manager(report)
        return Response({'success': True, 'message': 'Note approuvée par le manager.'})

    @action(detail=True, methods=['post'])
    def approve_finance(self, request, pk=None):
        """Approbation Finance."""
        report = self.get_object()
        if report.status != 'approved_manager':
            return Response(
                {'error': "La note n'est pas approuvée par le manager."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        report.approved_by_finance = True
        report.finance_notes = request.data.get('notes', '')
        report.status = 'approved_finance'
        report.save(update_fields=['approved_by_finance', 'finance_notes', 'status'])

        # Générer l'écriture comptable (non-bloquant)
        accounting_message = ''
        try:
            from accounting.services.journal_entry_service import JournalEntryService

            entry = JournalEntryService.create_expense_entry(report, user=request.user)
            accounting_message = f'Écriture comptable {entry.name} générée.'
        except Exception as e:
            accounting_message = f'Écriture comptable non générée : {e}'

        WorkflowNotificationService.expense_approved_finance(report)
        return Response(
            {
                'success': True,
                'message': f'Note approuvée par la Finance. {accounting_message}'.strip(),
            }
        )

    @action(detail=True, methods=['post'])
    def reimburse(self, request, pk=None):
        """Marquer comme remboursée."""
        report = self.get_object()
        if report.status != 'approved_finance':
            return Response(
                {'error': "La note n'est pas approuvée par la Finance."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        report.status = 'reimbursed'
        report.save(update_fields=['status'])
        WorkflowNotificationService.expense_reimbursed(report)
        return Response({'success': True, 'message': 'Note marquée comme remboursée.'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Rejeter à n'importe quelle étape."""
        report = self.get_object()
        if report.status in ['draft', 'reimbursed', 'rejected', 'cancelled']:
            return Response(
                {'error': 'Impossible de rejeter dans cet état.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        notes = request.data.get('notes', '')
        if not notes:
            return Response(
                {'error': 'Les notes de rejet sont obligatoires.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        rejected_by = request.data.get('rejected_by', '')
        if rejected_by == 'manager':
            report.manager_notes = notes
        else:
            report.finance_notes = notes
        report.status = 'rejected'
        report.save()
        WorkflowNotificationService.expense_rejected(report)
        return Response({'success': True, 'message': 'Note rejetée.'})

    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        """Télécharger le PDF de la note de frais."""
        import os

        from django.conf import settings
        from django.http import FileResponse

        from hr.services.pdf_generator import PDFGenerator

        report = self.get_object()
        if report.status not in ['approved_finance', 'reimbursed']:
            from rest_framework import status as http_status
            from rest_framework.response import Response

            return Response(
                {
                    'error': 'Le PDF est disponible uniquement pour les notes approuvées Finance ou remboursées.'
                },
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        if not report.pdf_file:
            report.pdf_file = PDFGenerator.generate_expense_report_pdf(report)
            report.save(update_fields=['pdf_file'])

        pdf_path = os.path.join(settings.MEDIA_ROOT, report.pdf_file)
        if not os.path.exists(pdf_path):
            report.pdf_file = PDFGenerator.generate_expense_report_pdf(report)
            report.save(update_fields=['pdf_file'])
            pdf_path = os.path.join(settings.MEDIA_ROOT, report.pdf_file)

        response = FileResponse(
            open(pdf_path, 'rb'),
            content_type='application/pdf',
        )
        response['Content-Disposition'] = (
            f'attachment; filename="note_frais_{report.id}.pdf"'
        )
        return response

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Annuler par l'employé propriétaire (draft ou submitted uniquement)."""
        report = self.get_object()
        if report.status not in ['draft', 'submitted']:
            return Response(
                {'error': "Impossible d'annuler dans cet état."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            emp = Employee.objects.get(user=self.request.user)
            if report.employee != emp and not self.request.user.is_superuser:
                return Response(
                    {'error': 'Vous ne pouvez annuler que vos propres notes.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
        except Employee.DoesNotExist:
            pass
        report.status = 'cancelled'
        report.save(update_fields=['status'])
        return Response({'success': True, 'message': 'Note annulée.'})

    @action(detail=False, methods=['get'])
    def pending_approvals(self, request):
        """Notes en attente selon le rôle de l'utilisateur connecté."""
        try:
            emp = Employee.objects.get(user=request.user)
        except Employee.DoesNotExist:
            return Response([])
        qs = ExpenseReport.objects.none()
        if emp.is_manager:
            qs = qs | ExpenseReport.objects.filter(
                status='submitted', employee__manager=emp
            )
        if emp.is_finance or request.user.is_superuser:
            qs = qs | ExpenseReport.objects.filter(status='approved_manager')
        if not qs.exists() and not emp.is_manager and not emp.is_finance:
            return Response([])
        serializer = ExpenseReportSerializer(qs.order_by('-created_at'), many=True)
        return Response(serializer.data)


class ExpenseItemViewSet(viewsets.ModelViewSet):
    """Lignes de frais — CRUD bloqué si la note n'est pas en brouillon."""

    queryset = ExpenseItem.objects.select_related(
        'expense_report', 'category', 'currency'
    )
    serializer_class = ExpenseItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['expense_report']

    def _check_draft(self, report):
        if report.status != 'draft':
            return Response(
                {
                    'error': "Modifications impossibles : la note n'est plus en brouillon."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        return None

    def create(self, request, *args, **kwargs):
        report_id = request.data.get('expense_report')
        try:
            report = ExpenseReport.objects.get(pk=report_id)
        except ExpenseReport.DoesNotExist:
            return Response(
                {'error': 'Note de frais introuvable.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        err = self._check_draft(report)
        if err:
            return err
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        err = self._check_draft(instance.expense_report)
        if err:
            return err
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        err = self._check_draft(instance.expense_report)
        if err:
            return err
        return super().destroy(request, *args, **kwargs)


# ── Dashboard approbations ────────────────────────────────────────────────────


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def pending_approvals_summary(request):
    """Compteurs d'approbations en attente pour l'utilisateur connecte."""
    try:
        emp = Employee.objects.get(user=request.user)
    except Employee.DoesNotExist:
        return Response(
            {
                'leaves': 0,
                'expenses': 0,
                'training': 0,
                'missions': 0,
                'total': 0,
            }
        )

    leaves = 0
    expenses = 0
    training = 0
    missions = 0

    # Manager : demandes soumises par ses subordonnes
    if emp.is_manager:
        leaves += LeaveRequest.objects.filter(
            status='submitted',
            employee__manager=emp,
        ).count()
        expenses += ExpenseReport.objects.filter(
            status='submitted',
            employee__manager=emp,
        ).count()
        training += TrainingPlan.objects.filter(
            status='submitted',
            employee__manager=emp,
        ).count()
        missions += Mission.objects.filter(
            status='submitted',
            employee__manager=emp,
        ).count()

    # RH : conges approuves par N+1, formations et missions approuvees par N+1
    if emp.is_hr or request.user.is_superuser:
        leaves += LeaveRequest.objects.filter(status='approved_manager').count()
        training += TrainingPlan.objects.filter(status='approved_manager').count()
        missions += Mission.objects.filter(status='approved_manager').count()

    # Finance : notes approuvees par N+1, formations et missions approuvees par RH
    if emp.is_finance or request.user.is_superuser:
        expenses += ExpenseReport.objects.filter(status='approved_manager').count()
        training += TrainingPlan.objects.filter(status='approved_hr').count()
        missions += Mission.objects.filter(status='approved_hr').count()

    total = leaves + expenses + training + missions
    return Response(
        {
            'leaves': leaves,
            'expenses': expenses,
            'training': training,
            'missions': missions,
            'total': total,
        }
    )


# ── Jours feries ──────────────────────────────────────────────────────────────


class PublicHolidayViewSet(viewsets.ModelViewSet):
    """
    CRUD des jours feries — accessible aux admins RH uniquement.
    Pack-independant : aucun filtre par country_code en lecture.
    Tous les enregistrements en base s'appliquent a l'instance courante.
    """

    queryset = PublicHoliday.objects.all().order_by('date')
    serializer_class = PublicHolidaySerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'hr'
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ['is_recurring', 'country_code']
    search_fields = ['name']
    ordering_fields = ['date', 'name']
    ordering = ['date']
