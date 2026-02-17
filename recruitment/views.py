from django.conf import settings
from django.core.mail import send_mail
from django.db.models import Avg, Count, F
from django.template.loader import render_to_string
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .filters import ApplicationFilter, JobOpeningFilter
from .models import (
    Application,
    Candidate,
    CandidateEvaluation,
    EvaluationCriterion,
    Interviewer,
    InterviewPanel,
    JobOpening,
    RecruitmentNotification,
    RecruitmentStats,
)
from .permissions import IsHROrReadOnly
from .serializers import (
    ApplicationCreateSerializer,
    ApplicationSerializer,
    CandidateEvaluationSerializer,
    CandidateSerializer,
    EvaluationCriterionSerializer,
    InterviewerSerializer,
    InterviewPanelSerializer,
    JobOpeningDetailSerializer,
    JobOpeningSerializer,
    RecruitmentNotificationSerializer,
    RecruitmentStatsSerializer,
)


class JobOpeningViewSet(viewsets.ModelViewSet):
    queryset = JobOpening.objects.all()
    serializer_class = JobOpeningSerializer
    permission_classes = [permissions.IsAuthenticated, IsHROrReadOnly]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = JobOpeningFilter
    search_fields = ['title', 'reference', 'description', 'requirements']
    ordering_fields = ['opening_date', 'closing_date', 'created_at', 'title']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return JobOpeningDetailSerializer
        return JobOpeningSerializer

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        job_opening = self.get_object()
        if job_opening.status != 'draft':
            return Response(
                {'error': 'Seuls les postes en brouillon peuvent être publiés.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        job_opening.status = 'published'
        job_opening.save()

        return Response({'status': 'Offre publiée'})

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        job_opening = self.get_object()
        if job_opening.status == 'closed':
            return Response(
                {'error': 'Cette offre est déjà clôturée.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        job_opening.status = 'closed'
        job_opening.closing_date = timezone.now().date()
        job_opening.save()

        return Response({'status': 'Offre clôturée'})

    @action(detail=False, methods=['get'])
    def public(self, request):
        """Liste des offres publiées pour la page publique."""
        queryset = JobOpening.objects.filter(status='published')

        # Filtres
        department = request.query_params.get('department')
        if department:
            queryset = queryset.filter(department__id=department)

        location = request.query_params.get('location')
        if location:
            queryset = queryset.filter(location__icontains=location)

        queryset = queryset.order_by('-opening_date')

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = JobOpeningSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = JobOpeningSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def applications(self, request, pk=None):
        """Liste des candidatures pour une offre d'emploi."""
        job_opening = self.get_object()
        applications = job_opening.applications.all()

        # Filtres
        status_filter = request.query_params.get('status')
        if status_filter:
            applications = applications.filter(status=status_filter)

        applications = applications.order_by('-application_date')

        page = self.paginate_queryset(applications)
        if page is not None:
            serializer = ApplicationSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = ApplicationSerializer(applications, many=True)
        return Response(serializer.data)


class CandidateViewSet(viewsets.ModelViewSet):
    queryset = Candidate.objects.all()
    serializer_class = CandidateSerializer
    permission_classes = [permissions.IsAuthenticated, IsHROrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        'first_name',
        'last_name',
        'email',
        'current_position',
        'current_company',
    ]
    ordering_fields = ['last_name', 'first_name', 'created_at']
    ordering = ['last_name', 'first_name']

    @action(detail=True, methods=['get'])
    def applications(self, request, pk=None):
        """Liste des candidatures d'un candidat."""
        candidate = self.get_object()
        applications = candidate.applications.all().order_by('-application_date')

        page = self.paginate_queryset(applications)
        if page is not None:
            serializer = ApplicationSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = ApplicationSerializer(applications, many=True)
        return Response(serializer.data)


class ApplicationViewSet(viewsets.ModelViewSet):
    queryset = Application.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsHROrReadOnly]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = ApplicationFilter
    search_fields = [
        'candidate__first_name',
        'candidate__last_name',
        'job_opening__title',
    ]
    ordering_fields = ['application_date', 'status', 'interview_date']
    ordering = ['-application_date']

    def get_serializer_class(self):
        if self.action == 'create':
            return ApplicationCreateSerializer
        return ApplicationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Vérifier si le candidat existe déjà
        candidate_data = serializer.validated_data.pop('candidate')
        candidate, created = Candidate.objects.get_or_create(
            email=candidate_data['email'], defaults=candidate_data
        )

        # Créer la candidature
        application = Application(candidate=candidate, **serializer.validated_data)
        application.save()

        headers = self.get_success_headers(serializer.data)
        return Response(
            ApplicationSerializer(application).data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    @action(detail=True, methods=['post'])
    def preselect(self, request, pk=None):
        application = self.get_object()
        if application.status != 'received':
            return Response(
                {
                    'error': 'Seules les candidatures reçues peuvent être présélectionnées.'
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        application.status = 'preselected'
        application.save()

        return Response({'status': 'Candidature présélectionnée'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        application = self.get_object()
        if application.status in ['selected', 'hired', 'withdrawn']:
            return Response(
                {'error': 'Cette candidature ne peut pas être rejetée.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Rejeter en fonction du statut actuel
        if application.status == 'received':
            application.status = 'rejected_screening'
        elif application.status in ['preselected', 'analysis']:
            application.status = 'rejected_analysis'
        elif application.status in ['selected_for_interview', 'interviewed']:
            application.status = 'rejected_interview'

        application.save()

        return Response({'status': 'Candidature rejetée'})

    @action(detail=True, methods=['post'])
    def schedule_interview(self, request, pk=None):
        application = self.get_object()
        if application.status not in ['preselected', 'analysis']:
            return Response(
                {
                    'error': 'Cette candidature ne peut pas être programmée pour un entretien.'
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Vérifier si la date d'entretien est fournie
        interview_date = request.data.get('interview_date')
        interview_location = request.data.get('interview_location')

        if not interview_date:
            return Response(
                {'error': "La date d'entretien est requise."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        application.status = 'selected_for_interview'
        application.interview_date = interview_date
        application.interview_location = interview_location or ''
        application.save()

        # Envoyer un email au candidat pour l'informer de l'entretien
        # (cette partie serait implémentée en fonction des besoins spécifiques)

        return Response({'status': 'Entretien programmé'})

    @action(detail=True, methods=['post'])
    def mark_interviewed(self, request, pk=None):
        application = self.get_object()
        if application.status != 'selected_for_interview':
            return Response(
                {
                    'error': 'Seules les candidatures programmées pour un entretien peuvent être marquées comme interviewées.'
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        application.status = 'interviewed'
        application.save()

        return Response({'status': 'Candidature marquée comme interviewée'})

    @action(detail=True, methods=['post'])
    def select(self, request, pk=None):
        application = self.get_object()
        if application.status != 'interviewed':
            return Response(
                {
                    'error': 'Seules les candidatures interviewées peuvent être sélectionnées.'
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        application.status = 'selected'
        application.save()

        return Response({'status': 'Candidat sélectionné'})

    @action(detail=True, methods=['post'])
    def hire(self, request, pk=None):
        application = self.get_object()
        if application.status != 'selected':
            return Response(
                {
                    'error': 'Seules les candidatures sélectionnées peuvent être embauchées.'
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        application.status = 'hired'
        application.save()

        # Mettre à jour le statut de l'offre d'emploi si nécessaire
        job_opening = application.job_opening
        job_opening.status = 'closed'
        job_opening.save()

        return Response({'status': 'Candidat embauché'})


class InterviewPanelViewSet(viewsets.ModelViewSet):
    queryset = InterviewPanel.objects.all()
    serializer_class = InterviewPanelSerializer
    permission_classes = [permissions.IsAuthenticated, IsHROrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['job_opening']
    search_fields = ['name', 'job_opening__title']

    @action(detail=True, methods=['post'])
    def notify_interviewers(self, request, pk=None):
        """Envoyer une notification aux évaluateurs du panel."""
        panel = self.get_object()

        # Vérifier si des données d'entretien sont fournies
        interview_date = request.data.get('interview_date')
        interview_location = request.data.get('interview_location')
        candidate_name = request.data.get('candidate_name')
        job_title = request.data.get('job_title')

        if not all([interview_date, interview_location, candidate_name, job_title]):
            return Response(
                {'error': "Données d'entretien incomplètes."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Envoyer des notifications à chaque évaluateur
        for interviewer in panel.interviewers.all():
            # Créer une notification dans le système
            RecruitmentNotification.objects.create(
                recipient=interviewer.employee,
                title=f'Entretien programmé: {job_title}',
                message=f'Vous êtes convié(e) à un entretien pour le poste de {job_title} avec {candidate_name} le {interview_date} à {interview_location}.',
                type='interview',
                job_opening_id=panel.job_opening.id,
            )

            # Envoyer un email (si configuré)
            if hasattr(settings, 'EMAIL_HOST_USER') and settings.EMAIL_HOST_USER:
                context = {
                    'interviewer_name': interviewer.employee.full_name,
                    'candidate_name': candidate_name,
                    'job_title': job_title,
                    'interview_date': interview_date,
                    'interview_location': interview_location,
                    'role': interviewer.role,
                }
                html_message = render_to_string(
                    'recruitment/emails/interview_notification.html', context
                )

                try:
                    send_mail(
                        subject=f'Entretien programmé: {job_title}',
                        message=f'Vous êtes convié(e) à un entretien pour le poste de {job_title} avec {candidate_name} le {interview_date} à {interview_location}.',
                        from_email=settings.EMAIL_HOST_USER,
                        recipient_list=[interviewer.employee.email],
                        html_message=html_message,
                        fail_silently=False,
                    )
                except Exception:
                    # Continuer même si l'envoi d'email échoue
                    pass

        return Response({'status': 'Notifications envoyées aux évaluateurs'})


class InterviewerViewSet(viewsets.ModelViewSet):
    queryset = Interviewer.objects.all()
    serializer_class = InterviewerSerializer
    permission_classes = [permissions.IsAuthenticated, IsHROrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['panel', 'employee']


class EvaluationCriterionViewSet(viewsets.ModelViewSet):
    queryset = EvaluationCriterion.objects.all()
    serializer_class = EvaluationCriterionSerializer
    permission_classes = [permissions.IsAuthenticated, IsHROrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['category']
    ordering_fields = ['category', 'display_order', 'name']
    ordering = ['category', 'display_order', 'name']


class CandidateEvaluationViewSet(viewsets.ModelViewSet):
    queryset = CandidateEvaluation.objects.all()
    serializer_class = CandidateEvaluationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['application', 'interviewer', 'evaluation_date']
    ordering_fields = ['evaluation_date']
    ordering = ['-evaluation_date']

    @action(detail=False, methods=['get'])
    def my_evaluations(self, request):
        """Liste des évaluations attribuées à l'employé connecté."""
        # Récupérer l'employé associé à l'utilisateur connecté
        try:
            employee = request.user.employee
        except Exception:
            return Response(
                {'error': 'Aucun employé associé à cet utilisateur.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Récupérer les instances d'Interviewer pour cet employé
        interviewer_ids = Interviewer.objects.filter(employee=employee).values_list(
            'id', flat=True
        )

        # Filtrer les évaluations
        evaluations = CandidateEvaluation.objects.filter(
            interviewer_id__in=interviewer_ids
        ).order_by('-evaluation_date')

        page = self.paginate_queryset(evaluations)
        if page is not None:
            serializer = CandidateEvaluationSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = CandidateEvaluationSerializer(evaluations, many=True)
        return Response(serializer.data)


class RecruitmentStatsViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = RecruitmentStats.objects.all()
    serializer_class = RecruitmentStatsSerializer
    permission_classes = [permissions.IsAuthenticated, IsHROrReadOnly]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['period_start', 'period_end']
    ordering = ['-period_end']

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Données de tableau de bord pour le recrutement."""
        # Statistiques générales
        total_openings = JobOpening.objects.count()
        active_openings = JobOpening.objects.filter(
            status__in=['published', 'in_progress', 'interviewing']
        ).count()
        total_applications = Application.objects.count()

        # Candidatures par statut
        applications_by_status = (
            Application.objects.values('status')
            .annotate(count=Count('id'))
            .order_by('status')
        )

        # Offres par département
        openings_by_department = (
            JobOpening.objects.values('department__name')
            .annotate(count=Count('id'))
            .order_by('department__name')
        )

        # Candidats recrutés récemment
        recent_hires = Application.objects.filter(status='hired').order_by(
            '-updated_at'
        )[:5]

        # Entretiens à venir
        upcoming_interviews = Application.objects.filter(
            status='selected_for_interview', interview_date__gte=timezone.now()
        ).order_by('interview_date')[:5]

        # Préparation de la réponse
        response_data = {
            'general': {
                'total_openings': total_openings,
                'active_openings': active_openings,
                'total_applications': total_applications,
                'applications_per_opening': round(
                    total_applications / total_openings if total_openings else 0, 2
                ),
            },
            'applications_by_status': applications_by_status,
            'openings_by_department': openings_by_department,
            'recent_hires': ApplicationSerializer(recent_hires, many=True).data,
            'upcoming_interviews': ApplicationSerializer(
                upcoming_interviews, many=True
            ).data,
        }

        return Response(response_data)

    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Générer les statistiques pour une période spécifique."""
        # Récupérer la période
        period_start = request.data.get('period_start')
        period_end = request.data.get('period_end')

        if not period_start or not period_end:
            return Response(
                {'error': 'Les dates de début et de fin sont requises.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Calculer les statistiques
        total_job_openings = JobOpening.objects.filter(
            opening_date__gte=period_start, opening_date__lte=period_end
        ).count()

        total_applications = Application.objects.filter(
            application_date__gte=period_start, application_date__lte=period_end
        ).count()

        preselected_applications = Application.objects.filter(
            status__in=[
                'preselected',
                'analysis',
                'selected_for_interview',
                'interviewed',
                'selected',
                'hired',
            ],
            application_date__gte=period_start,
            application_date__lte=period_end,
        ).count()

        interviewed_candidates = Application.objects.filter(
            status__in=['interviewed', 'selected', 'hired'],
            application_date__gte=period_start,
            application_date__lte=period_end,
        ).count()

        hired_candidates = Application.objects.filter(
            status='hired',
            application_date__gte=period_start,
            application_date__lte=period_end,
        ).count()

        # Calculer les taux
        preselection_rate = (
            round((preselected_applications / total_applications) * 100, 2)
            if total_applications
            else 0
        )
        interview_rate = (
            round((interviewed_candidates / preselected_applications) * 100, 2)
            if preselected_applications
            else 0
        )
        hiring_rate = (
            round((hired_candidates / interviewed_candidates) * 100, 2)
            if interviewed_candidates
            else 0
        )

        # Calculer le temps moyen d'embauche
        avg_time = (
            Application.objects.filter(
                status='hired',
                application_date__gte=period_start,
                application_date__lte=period_end,
            )
            .annotate(days_to_hire=F('updated_at') - F('application_date'))
            .aggregate(avg_days=Avg('days_to_hire'))['avg_days']
        )

        avg_time_to_hire = avg_time.days if avg_time else 0

        # Créer ou mettre à jour les statistiques
        stats, created = RecruitmentStats.objects.update_or_create(
            period_start=period_start,
            period_end=period_end,
            defaults={
                'total_job_openings': total_job_openings,
                'total_applications': total_applications,
                'applications_per_opening': round(
                    total_applications / total_job_openings, 2
                )
                if total_job_openings
                else 0,
                'preselected_applications': preselected_applications,
                'interviewed_candidates': interviewed_candidates,
                'hired_candidates': hired_candidates,
                'preselection_rate': preselection_rate,
                'interview_rate': interview_rate,
                'hiring_rate': hiring_rate,
                'avg_time_to_hire': avg_time_to_hire,
            },
        )

        return Response(RecruitmentStatsSerializer(stats).data)


class RecruitmentNotificationViewSet(viewsets.ModelViewSet):
    queryset = RecruitmentNotification.objects.all()
    serializer_class = RecruitmentNotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['recipient', 'is_read', 'type']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filtrer les notifications pour n'afficher que celles de l'utilisateur connecté."""
        queryset = super().get_queryset()

        # Si l'utilisateur n'est pas un RH, ne montrer que ses notifications
        if self.request.user.employee and not self.request.user.employee.is_hr:
            queryset = queryset.filter(recipient=self.request.user.employee)

        return queryset

    @action(detail=False, methods=['get'])
    def my_notifications(self, request):
        """Liste des notifications de l'employé connecté."""
        try:
            employee = request.user.employee
        except Exception:
            return Response(
                {'error': 'Aucun employé associé à cet utilisateur.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        notifications = RecruitmentNotification.objects.filter(
            recipient=employee
        ).order_by('-created_at')

        # Filtre par statut de lecture
        is_read = request.query_params.get('is_read')
        if is_read is not None:
            is_read = is_read.lower() == 'true'
            notifications = notifications.filter(is_read=is_read)

        page = self.paginate_queryset(notifications)
        if page is not None:
            serializer = RecruitmentNotificationSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = RecruitmentNotificationSerializer(notifications, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """Marquer une notification comme lue."""
        notification = self.get_object()
        notification.is_read = True
        notification.save()

        return Response({'status': 'Notification marquée comme lue'})

    @action(detail=True, methods=['post'])
    def mark_as_unread(self, request, pk=None):
        """Marquer une notification comme non lue."""
        notification = self.get_object()
        notification.is_read = False
        notification.save()

        return Response({'status': 'Notification marquée comme non lue'})

    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        """Marquer toutes les notifications de l'utilisateur comme lues."""
        try:
            employee = request.user.employee
        except Exception:
            return Response(
                {'error': 'Aucun employé associé à cet utilisateur.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        updated = RecruitmentNotification.objects.filter(
            recipient=employee, is_read=False
        ).update(is_read=True)

        return Response(
            {'status': f'{updated} notification(s) marquée(s) comme lue(s)'}
        )
