import os

from django.db.models import Avg, Count, Q
from django.http import FileResponse
from django.utils import timezone
from django_filters import rest_framework as django_filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from users.permissions import HasModulePermission, module_permission_required

from .models import (
    Announcement,
    Availability,
    Complaint,
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
    JobSkillRequirementSerializer,
    JobTitleSerializer,
    MissionSerializer,
    SkillSerializer,
    TrainingCourseSerializer,
    TrainingPlanItemSerializer,
    TrainingPlanSerializer,
    TrainingSkillSerializer,
    WorkCertificateRequestSerializer,
)


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


class DepartmentViewSet(viewsets.ModelViewSet):
    """API pour les départements."""

    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'hr'
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code', 'description']
    ordering_fields = ['name', 'code']
    ordering = ['name']

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


class EmployeeViewSet(viewsets.ModelViewSet):
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

    def get_serializer_class(self):
        if (
            self.action == 'retrieve'
            or self.action == 'update'
            or self.action == 'partial_update'
        ):
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

        # Obtenir les compétences requises pour le poste
        required_skills = JobSkillRequirement.objects.filter(job_title=job_title)

        # Obtenir les compétences de l'employé
        employee_skills = EmployeeSkill.objects.filter(employee=employee)

        # Calculer les écarts
        gaps = []
        for req in required_skills:
            # Chercher si l'employé a déjà cette compétence
            emp_skill = employee_skills.filter(skill=req.skill).first()

            if not emp_skill:
                # Compétence manquante
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
                # Niveau insuffisant
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


class MissionViewSet(viewsets.ModelViewSet):
    """API pour les missions."""

    queryset = Mission.objects.all()
    serializer_class = MissionSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'hr'
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
        # Si l'employé connecté crée sa propre mission
        user = self.request.user
        try:
            employee = Employee.objects.get(user=user)

            # Si c'est pour lui-même, il est aussi le demandeur
            if serializer.validated_data.get('employee') == employee:
                serializer.save(requested_by=employee, status='submitted')
            # S'il est manager de l'employé pour qui il crée la mission
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
            # Générer le PDF s'il n'existe pas
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


def _notify_availability(availability, action_type):
    """Envoie une notification in-app lors d'une action sur une disponibilité."""
    from django.utils import timezone

    from notifications.tasks import _create_notification

    employee = availability.employee
    if not employee or not employee.user:
        return

    today = timezone.now().date()

    if action_type == 'approve_manager':
        title = 'Disponibilité approuvée par votre N+1'
        message = (
            f'Votre demande de {availability.get_type_display()} '
            f'du {availability.start_date} au {availability.end_date} '
            f'a été approuvée par votre manager.'
        )
        level = 'success'
    elif action_type == 'approve_hr':
        title = 'Disponibilité approuvée par les RH'
        message = (
            f'Votre demande de {availability.get_type_display()} '
            f'du {availability.start_date} au {availability.end_date} '
            f'a été approuvée par les RH.'
        )
        level = 'success'
    elif action_type == 'reject':
        title = 'Disponibilité rejetée'
        message = (
            f'Votre demande de {availability.get_type_display()} '
            f'du {availability.start_date} au {availability.end_date} '
            f'a été rejetée.'
        )
        level = 'warning'
    else:
        return

    dedup_key = f'avail_{availability.pk}_{action_type}_{today.isoformat()}'
    _create_notification(
        user=employee.user,
        level=level,
        title=title,
        message=message,
        module='hr',
        link=f'/hr/availabilities/{availability.pk}',
        dedup_key=dedup_key,
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
        # Si l'employé connecté crée sa propre mise en disponibilité
        user = self.request.user
        try:
            employee = Employee.objects.get(user=user)

            # Si c'est pour lui-même, il est aussi le demandeur
            if serializer.validated_data.get('employee') == employee:
                serializer.save(requested_by=employee, status='requested')
            # S'il est manager de l'employé pour qui il crée la mise en disponibilité
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

        # Notification à l'employé
        _notify_availability(availability, 'approve_manager')

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

        # Notification à l'employé
        _notify_availability(availability, 'approve_hr')

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

        # Notification à l'employé
        _notify_availability(availability, 'reject')

        return Response({'success': True, 'message': 'Mise en disponibilité rejetée.'})

    @action(detail=False, methods=['get'])
    def pending_approvals(self, request):
        """Retourne les mises en disponibilité en attente d'approbation."""
        qs = Availability.objects.filter(status='requested').order_by('-created_at')

        # Filtrer selon le rôle : un manager ne voit que ses subordonnés
        try:
            employee = Employee.objects.get(user=request.user)
            if employee.is_hr:
                pass  # Voit tout
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

        # Filtrer par niveau minimum si spécifié
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

        # Filtrer par niveau minimum fourni si spécifié
        min_level = request.query_params.get('min_level')
        if min_level and min_level.isdigit():
            training_skills = training_skills.filter(level_provided__gte=int(min_level))

        serializer = TrainingSkillSerializer(training_skills, many=True)
        return Response(serializer.data)


class TrainingCourseViewSet(viewsets.ModelViewSet):
    """API pour les formations."""

    queryset = TrainingCourse.objects.all()
    serializer_class = TrainingCourseSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'hr'
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

        # Filtrer par année si spécifiée
        year = request.query_params.get('year')
        if year and year.isdigit():
            plan_items = plan_items.filter(training_plan__year=int(year))

        # Grouper par plan de formation
        plans = {}
        for item in plan_items:
            plan_id = item.training_plan.id
            if plan_id not in plans:
                plans[plan_id] = {'plan': item.training_plan, 'items': []}
            plans[plan_id]['items'].append(item)

        # Sérialiser les résultats
        result = []
        for plan_data in plans.values():
            plan_serializer = TrainingPlanSerializer(plan_data['plan'])
            items_serializer = TrainingPlanItemSerializer(plan_data['items'], many=True)
            result.append(
                {'plan': plan_serializer.data, 'items': items_serializer.data}
            )

        return Response(result)


class TrainingPlanViewSet(viewsets.ModelViewSet):
    """API pour les plans de formation."""

    queryset = TrainingPlan.objects.all()
    serializer_class = TrainingPlanSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'hr'
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = TrainingPlanFilter
    search_fields = ['employee__first_name', 'employee__last_name', 'objectives']
    ordering_fields = ['year', 'employee__last_name', 'status']
    ordering = ['-year', 'employee__last_name']

    def perform_create(self, serializer):
        user = self.request.user
        try:
            employee = Employee.objects.get(user=user)
            serializer.save(created_by=employee)
        except Employee.DoesNotExist:
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

        # Vérifier que le plan contient au moins un élément
        if not plan.training_items.exists():
            return Response(
                {'error': 'Le plan ne contient aucune formation.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        plan.status = 'submitted'
        plan.save(update_fields=['status'])

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

        return Response({'success': True, 'message': 'Plan de formation rejeté.'})

    @action(detail=False, methods=['get'])
    def skills_gap_analysis(self, request):
        """Analyser les écarts de compétences pour les employés."""
        department_id = request.query_params.get('department')

        # Filtrer les employés
        employees = Employee.objects.filter(is_active=True)
        if department_id:
            employees = employees.filter(department_id=department_id)

        # Analyser les écarts pour chaque employé
        results = []
        for employee in employees:
            job_title = employee.job_title
            if not job_title:
                continue

            # Obtenir les compétences requises pour le poste
            required_skills = JobSkillRequirement.objects.filter(job_title=job_title)

            # Obtenir les compétences de l'employé
            employee_skills = EmployeeSkill.objects.filter(employee=employee)

            # Calculer les écarts
            gaps = []
            for req in required_skills:
                # Chercher si l'employé a déjà cette compétence
                emp_skill = employee_skills.filter(skill=req.skill).first()

                if not emp_skill:
                    # Compétence manquante
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
                    # Niveau insuffisant
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


class TrainingPlanItemViewSet(viewsets.ModelViewSet):
    """API pour les éléments des plans de formation."""

    queryset = TrainingPlanItem.objects.all()
    serializer_class = TrainingPlanItemSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'hr'
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


class AnnouncementViewSet(viewsets.ModelViewSet):
    """API pour les annonces internes."""

    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'hr'
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'content']
    ordering = ['-is_pinned', '-created_at']

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
            # Admin sans dossier employe voit tout
            pass

        return qs

    def perform_create(self, serializer):
        try:
            employee = Employee.objects.get(user=self.request.user)
            serializer.save(author=employee)
        except Employee.DoesNotExist:
            serializer.save()


class WorkCertificateRequestViewSet(viewsets.ModelViewSet):
    """API pour les demandes d attestation de travail."""

    queryset = WorkCertificateRequest.objects.all()
    serializer_class = WorkCertificateRequestSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'hr'
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['employee', 'status', 'purpose']
    ordering = ['-created_at']

    def get_permissions(self):
        """
        create/list/retrieve : tout employe authentifie.
        approve/reject/destroy/update : niveau HR requis.
        """
        from users.permissions import CanSubmitOwnCertificate

        if self.action in ('create', 'list', 'retrieve'):
            return [permissions.IsAuthenticated(), CanSubmitOwnCertificate()]
        return [permissions.IsAuthenticated(), HasModulePermission()]

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
            serializer.save(employee=employee)
        except Employee.DoesNotExist:
            serializer.save()

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

        # Notification a l employe
        if cert.employee.user:
            from notifications.tasks import _create_notification

            _create_notification(
                user=cert.employee.user,
                level='success',
                title='Attestation de travail disponible',
                message='Votre attestation de travail a ete approuvee et est disponible au telechargement.',
                module='hr',
                link=f'/hr/certificates/{cert.pk}',
                dedup_key=f'cert_approved_{cert.pk}',
            )

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


class ComplaintViewSet(viewsets.ModelViewSet):
    """API pour les doleances."""

    queryset = Complaint.objects.all()
    serializer_class = ComplaintSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'category']
    ordering = ['-created_at']

    def get_permissions(self):
        from users.permissions import CanSubmitOwnCertificate

        if self.action in ('create', 'list', 'retrieve'):
            return [permissions.IsAuthenticated(), CanSubmitOwnCertificate()]
        return [permissions.IsAuthenticated(), HasModulePermission()]

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


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
@module_permission_required('hr')
def dashboard_view(request):
    """Vue du tableau de bord RH avec statistiques et informations importantes."""
    # Statistiques de base
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

    # Missions en cours et à venir
    missions_by_status = (
        Mission.objects.values('status').annotate(count=Count('id')).order_by('status')
    )
    upcoming_missions = Mission.objects.filter(
        start_date__gte=timezone.now().date()
    ).order_by('start_date')[:5]
    upcoming_missions_data = MissionSerializer(upcoming_missions, many=True).data

    # Formations
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

    # Compétences
    skills_count = Skill.objects.count()
    avg_skills_per_employee = (
        EmployeeSkill.objects.values('employee')
        .annotate(count=Count('id'))
        .aggregate(avg=Avg('count'))['avg']
        or 0
    )

    # Calcul du taux de couverture des compétences requises
    coverage_data = []
    for dept in Department.objects.all():
        employees = Employee.objects.filter(department=dept, is_active=True)
        dept_data = {
            'department': dept.name,
            'employee_count': employees.count(),
            'skill_coverage': 0,
        }

        if dept_data['employee_count'] > 0:
            # Calculer le taux de couverture pour chaque employé du département
            coverage_sum = 0
            for employee in employees:
                if not employee.job_title:
                    continue

                # Trouver les compétences requises pour le poste
                required_skills = JobSkillRequirement.objects.filter(
                    job_title=employee.job_title
                )
                if not required_skills.exists():
                    continue

                # Trouver les compétences de l'employé
                employee_skills = EmployeeSkill.objects.filter(employee=employee)

                # Compter les compétences couvertes
                covered = 0
                total = required_skills.count()

                for req in required_skills:
                    emp_skill = employee_skills.filter(skill=req.skill).first()
                    if emp_skill and emp_skill.level >= req.required_level:
                        covered += 1

                # Ajouter le taux de couverture de cet employé
                if total > 0:
                    coverage_sum += (covered / total) * 100

            # Calculer la moyenne pour le département
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
