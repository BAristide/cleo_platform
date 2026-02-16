from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import api_view, action, permission_classes
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Sum
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated

from .models import (
    Tag, Industry, Company, Contact, SalesStage, 
    Opportunity, ActivityType, Activity, StageHistory
)
from .serializers import (
    TagSerializer, IndustrySerializer, 
    CompanyListSerializer, CompanyDetailSerializer,
    ContactListSerializer, ContactDetailSerializer,
    SalesStageSerializer, ActivityTypeSerializer,
    OpportunityListSerializer, OpportunityDetailSerializer,
    ActivityListSerializer, ActivityDetailSerializer,
    StageHistorySerializer
)
from .filters import (
    CompanyFilter, ContactFilter, OpportunityFilter, ActivityFilter
)

@api_view(['GET'])
def dashboard_view(request):
    """
    Récupère les statistiques pour le tableau de bord CRM.
    """
    # Compter les contacts, entreprises et opportunités
    contact_count = Contact.objects.count()
    company_count = Company.objects.count()
    opportunity_count = Opportunity.objects.count()
    
    # Calculer la valeur totale du pipeline
    pipeline_value = Opportunity.objects.aggregate(
        total=Sum('amount')
    )['total'] or 0
    
    # Retourner les statistiques
    return Response({
        'contacts': contact_count,
        'companies': company_count,
        'opportunities': opportunity_count,
        'pipeline': pipeline_value
    })

class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name']
    ordering = ['name']


class IndustryViewSet(viewsets.ModelViewSet):
    queryset = Industry.objects.all()
    serializer_class = IndustrySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name']
    ordering = ['name']


class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = CompanyFilter
    search_fields = ['name', 'website', 'phone', 'email', 'city', 'country']
    ordering_fields = ['name', 'created_at', 'updated_at', 'score']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return CompanyListSerializer
        return CompanyDetailSerializer
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['get'])
    def contacts(self, request, pk=None):
        company = self.get_object()
        contacts = company.contacts.all()
        serializer = ContactListSerializer(contacts, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def opportunities(self, request, pk=None):
        company = self.get_object()
        opportunities = company.opportunities.all()
        serializer = OpportunityListSerializer(opportunities, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def activities(self, request, pk=None):
        company = self.get_object()
        activities = company.activities.all()
        serializer = ActivityListSerializer(activities, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Return statistics about companies."""
        total_companies = Company.objects.count()
        companies_by_industry = (
            Company.objects.values('industry__name')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        
        return Response({
            'total_companies': total_companies,
            'by_industry': companies_by_industry
        })


class ContactViewSet(viewsets.ModelViewSet):
    queryset = Contact.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ContactFilter
    search_fields = ['first_name', 'last_name', 'email', 'phone', 'company__name']
    ordering_fields = ['last_name', 'first_name', 'created_at', 'updated_at']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ContactListSerializer
        return ContactDetailSerializer
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['get'])
    def opportunities(self, request, pk=None):
        contact = self.get_object()
        opportunities = contact.opportunities.all()
        serializer = OpportunityListSerializer(opportunities, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def activities(self, request, pk=None):
        contact = self.get_object()
        activities = contact.activities.all()
        serializer = ActivityListSerializer(activities, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Return statistics about contacts."""
        total_contacts = Contact.objects.count()
        contacts_by_source = (
            Contact.objects.values('source')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        
        return Response({
            'total_contacts': total_contacts,
            'by_source': contacts_by_source
        })


class SalesStageViewSet(viewsets.ModelViewSet):
    queryset = SalesStage.objects.all()
    serializer_class = SalesStageSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['order', 'name']
    ordering = ['order']


class ActivityTypeViewSet(viewsets.ModelViewSet):
    queryset = ActivityType.objects.all()
    serializer_class = ActivityTypeSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name']
    ordering = ['name']


class OpportunityViewSet(viewsets.ModelViewSet):
    queryset = Opportunity.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = OpportunityFilter
    search_fields = ['name', 'company__name']
    ordering_fields = ['name', 'amount', 'probability', 'expected_close_date', 'created_at']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return OpportunityListSerializer
        return OpportunityDetailSerializer
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['get'])
    def activities(self, request, pk=None):
        opportunity = self.get_object()
        activities = opportunity.activities.all()
        serializer = ActivityListSerializer(activities, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def stage_history(self, request, pk=None):
        opportunity = self.get_object()
        history = opportunity.stage_history.all()
        serializer = StageHistorySerializer(history, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def change_stage(self, request, pk=None):
        opportunity = self.get_object()
        
        try:
            stage_id = int(request.data.get('stage_id'))
            notes = request.data.get('notes', '')
            
            stage = SalesStage.objects.get(pk=stage_id)
            old_stage = opportunity.stage
            
            # Update opportunity stage
            opportunity.stage = stage
            
            # If moving to won/lost stage, set closed date
            if stage.is_won or stage.is_lost:
                opportunity.closed_date = timezone.now()
            
            opportunity.save()
            
            # Create stage history record
            StageHistory.objects.create(
                opportunity=opportunity,
                from_stage=old_stage,
                to_stage=stage,
                changed_by=request.user,
                notes=notes
            )
            
            serializer = self.get_serializer(opportunity)
            return Response(serializer.data)
            
        except (ValueError, SalesStage.DoesNotExist):
            return Response(
                {"error": "Invalid stage ID provided"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Return statistics about opportunities."""
        total_opportunities = Opportunity.objects.count()
        open_opportunities = Opportunity.objects.filter(
            ~Q(stage__is_won=True) & ~Q(stage__is_lost=True)
        ).count()
        won_opportunities = Opportunity.objects.filter(stage__is_won=True).count()
        lost_opportunities = Opportunity.objects.filter(stage__is_lost=True).count()
        
        total_value = Opportunity.objects.aggregate(
            total=Sum('amount')
        )['total'] or 0
        
        pipeline_value = Opportunity.objects.filter(
            ~Q(stage__is_won=True) & ~Q(stage__is_lost=True)
        ).aggregate(
            total=Sum('amount')
        )['total'] or 0
        
        won_value = Opportunity.objects.filter(
            stage__is_won=True
        ).aggregate(
            total=Sum('amount')
        )['total'] or 0
        
        by_stage = (
            Opportunity.objects.values('stage__name', 'stage__id')
            .annotate(
                count=Count('id'),
                total_value=Sum('amount')
            )
            .order_by('stage__order')
        )
        
        return Response({
            'total_opportunities': total_opportunities,
            'open_opportunities': open_opportunities,
            'won_opportunities': won_opportunities,
            'lost_opportunities': lost_opportunities,
            'total_value': total_value,
            'pipeline_value': pipeline_value,
            'won_value': won_value,
            'by_stage': by_stage
        })


class ActivityViewSet(viewsets.ModelViewSet):
    queryset = Activity.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ActivityFilter
    search_fields = ['subject', 'description']
    ordering_fields = ['start_date', 'created_at', 'status']
    ordering = ['-start_date']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ActivityListSerializer
        return ActivityDetailSerializer
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        activity = self.get_object()
        
        if activity.status == 'completed':
            return Response(
                {"error": "Activity is already completed"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        activity.status = 'completed'
        activity.completed_date = timezone.now()
        activity.save()
        
        serializer = self.get_serializer(activity)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get upcoming activities."""
        now = timezone.now()
        activities = Activity.objects.filter(
            status='planned',
            start_date__gte=now
        ).order_by('start_date')[:10]
        
        serializer = ActivityListSerializer(activities, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get overdue activities."""
        now = timezone.now()
        activities = Activity.objects.filter(
            status='planned',
            start_date__lt=now
        ).order_by('start_date')
        
        serializer = ActivityListSerializer(activities, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get today's activities."""
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timezone.timedelta(days=1)
        
        activities = Activity.objects.filter(
            start_date__gte=today_start,
            start_date__lt=today_end
        ).order_by('start_date')
        
        serializer = ActivityListSerializer(activities, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Return statistics about activities."""
        total_activities = Activity.objects.count()
        completed_activities = Activity.objects.filter(status='completed').count()
        planned_activities = Activity.objects.filter(status='planned').count()
        cancelled_activities = Activity.objects.filter(status='cancelled').count()
        
        activities_by_type = (
            Activity.objects.values('activity_type__name')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        
        return Response({
            'total_activities': total_activities,
            'completed_activities': completed_activities,
            'planned_activities': planned_activities,
            'cancelled_activities': cancelled_activities,
            'by_type': activities_by_type
        })


class StageHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StageHistory.objects.all()
    serializer_class = StageHistorySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter, DjangoFilterBackend]
    filterset_fields = ['opportunity', 'to_stage', 'from_stage']
    ordering_fields = ['changed_at']
    ordering = ['-changed_at']


class DashboardViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    
    def list(self, request):
        """Return dashboard statistics and recent items."""
        # Today's date range
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timezone.timedelta(days=1)
        
        # This month's date range
        month_start = today_start.replace(day=1)
        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year + 1, month=1)
        else:
            month_end = month_start.replace(month=month_start.month + 1)
        
        # Count statistics
        lead_count = Contact.objects.count()
        company_count = Company.objects.count()
        opportunity_count = Opportunity.objects.count()
        
        # Open opportunities
        open_opportunities = Opportunity.objects.filter(
            ~Q(stage__is_won=True) & ~Q(stage__is_lost=True)
        )
        open_opportunity_count = open_opportunities.count()
        open_opportunity_value = open_opportunities.aggregate(
            total=Sum('amount')
        )['total'] or 0
        
        # Won opportunities
        won_opportunities = Opportunity.objects.filter(stage__is_won=True)
        won_this_month = won_opportunities.filter(
            closed_date__gte=month_start,
            closed_date__lt=month_end
        )
        won_this_month_count = won_this_month.count()
        won_this_month_value = won_this_month.aggregate(
            total=Sum('amount')
        )['total'] or 0
        
        # Activities
        activities_today = Activity.objects.filter(
            start_date__gte=today_start,
            start_date__lt=today_end
        ).count()
        
        overdue_activities = Activity.objects.filter(
            status='planned',
            start_date__lt=today_start
        ).count()
        
        upcoming_activities = Activity.objects.filter(
            status='planned',
            start_date__gte=today_start
        ).count()
        
        # Pipeline by stage
        pipeline_by_stage = (
            Opportunity.objects.filter(
                ~Q(stage__is_won=True) & ~Q(stage__is_lost=True)
            )
            .values('stage__name', 'stage__id')
            .annotate(
                count=Count('id'),
                value=Sum('amount')
            )
            .order_by('stage__order')
        )
        
        # Recent items
        recent_leads = ContactListSerializer(
            Contact.objects.order_by('-created_at')[:5],
            many=True
        ).data
        
        recent_opportunities = OpportunityListSerializer(
            Opportunity.objects.order_by('-created_at')[:5],
            many=True
        ).data
        
        recent_activities = ActivityListSerializer(
            Activity.objects.order_by('-created_at')[:5],
            many=True
        ).data
        
        return Response({
            'counts': {
                'leads': lead_count,
                'companies': company_count,
                'opportunities': opportunity_count,
                'open_opportunities': open_opportunity_count,
                'open_value': open_opportunity_value,
                'won_this_month': won_this_month_count,
                'won_this_month_value': won_this_month_value,
                'activities_today': activities_today,
                'overdue_activities': overdue_activities,
                'upcoming_activities': upcoming_activities,
            },
            'pipeline_by_stage': pipeline_by_stage,
            'recent': {
                'leads': recent_leads,
                'opportunities': recent_opportunities,
                'activities': recent_activities,
            }
        })


# Viewset pour les opérations CRUD du chatbot
class ChatbotViewSet(viewsets.ViewSet):
    """
    API pour les interactions avec le chatbot.
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def create_contact(self, request):
        """
        Crée un nouveau contact à partir des données du chatbot.
        """
        data = request.data
        
        # Ajout automatique de la source 'chatbot'
        data['source'] = 'chatbot'
        
        serializer = ContactSerializer(data=data)
        if serializer.is_valid():
            contact = serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def create_opportunity(self, request):
        """
        Crée une nouvelle opportunité à partir des données du chatbot.
        """
        data = request.data
        
        # Validation des données minimales requises
        if 'contact_id' not in data or 'company_id' not in data:
            return Response(
                {"error": "Les IDs du contact et de l'entreprise sont requis"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Récupération des modèles associés
        try:
            contact = Contact.objects.get(id=data['contact_id'])
            company = Company.objects.get(id=data['company_id'])
        except (Contact.DoesNotExist, Company.DoesNotExist):
            return Response(
                {"error": "Contact ou entreprise non trouvé"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Création de l'opportunité
        try:
            # Trouver la première étape de vente
            first_stage = SalesStage.objects.order_by('order').first()
            
            opportunity = Opportunity.objects.create(
                name=data.get('name', f"Opportunité via chatbot - {timezone.now().strftime('%Y-%m-%d')}"),
                company=company,
                stage=first_stage,
                amount=data.get('amount', None),
                probability=first_stage.probability,
                description=data.get('description', 'Créé automatiquement via le chatbot'),
                created_by=request.user
            )
            
            # Associer le contact à l'opportunité
            opportunity.contacts.add(contact)
            
            # Ajouter un tag "chatbot" si disponible
            chatbot_tag, _ = Tag.objects.get_or_create(name="Chatbot")
            opportunity.tags.add(chatbot_tag)
            
            return Response({
                "id": opportunity.id,
                "name": opportunity.name,
                "status": "created"
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def log_interaction(self, request):
        """
        Enregistre une interaction avec le chatbot.
        """
        data = request.data
        
        # Création d'une activité pour tracer l'interaction
        try:
            # Récupérer le type d'activité "Chatbot" (à créer au préalable)
            activity_type, _ = ActivityType.objects.get_or_create(
                name="Chatbot Interaction",
                defaults={"icon": "robot", "color": "#1890ff"}
            )
            
            # Créer l'activité
            activity = Activity.objects.create(
                subject=data.get('subject', 'Interaction chatbot'),
                activity_type=activity_type,
                start_date=timezone.now(),
                status='completed',
                completed_date=timezone.now(),
                description=data.get('message', ''),
                created_by=request.user
            )
            
            # Associer à un contact si disponible
            if 'contact_id' in data:
                try:
                    contact = Contact.objects.get(id=data['contact_id'])
                    activity.contacts.add(contact)
                except Contact.DoesNotExist:
                    pass
                    
            # Associer à une entreprise si disponible
            if 'company_id' in data:
                try:
                    company = Company.objects.get(id=data['company_id'])
                    activity.company = company
                    activity.save()
                except Company.DoesNotExist:
                    pass
                    
            return Response({
                "id": activity.id,
                "status": "logged"
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# Vues fonctionnelles pour des opérations spécifiques

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chatbot_qualify(request):
    """
    Point d'entrée unifié pour la qualification d'un visiteur.
    Cette vue crée à la fois un contact, une entreprise si nécessaire, et une opportunité.
    """
    data = request.data
    
    # 1. Créer ou récupérer l'entreprise
    company_data = {
        'name': data.get('company_name', 'Entreprise non spécifiée'),
        'website': data.get('company_website', ''),
        'email': data.get('company_email', ''),
        'phone': data.get('company_phone', '')
    }
    
    company_serializer = CompanySerializer(data=company_data)
    if company_serializer.is_valid():
        company = company_serializer.save(created_by=request.user)
    else:
        # Tenter de récupérer par nom si l'entreprise existe déjà
        try:
            company = Company.objects.get(name=company_data['name'])
        except Company.DoesNotExist:
            return Response(
                {"error": "Impossible de créer ou trouver l'entreprise", "details": company_serializer.errors}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    # 2. Créer le contact
    contact_data = {
        'first_name': data.get('first_name', ''),
        'last_name': data.get('last_name', ''),
        'email': data.get('email', ''),
        'phone': data.get('phone', ''),
        'company': company.id,
        'source': 'chatbot',
        'source_detail': 'Qualification via chatbot',
        'notes': data.get('notes', '')
    }
    
    contact_serializer = ContactSerializer(data=contact_data)
    if contact_serializer.is_valid():
        contact = contact_serializer.save(created_by=request.user)
    else:
        # Tenter de récupérer par email si le contact existe déjà
        try:
            if contact_data['email']:
                contact = Contact.objects.get(email=contact_data['email'])
            else:
                return Response(
                    {"error": "Impossible de créer le contact", "details": contact_serializer.errors}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Contact.DoesNotExist:
            return Response(
                {"error": "Impossible de créer ou trouver le contact", "details": contact_serializer.errors}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    # 3. Créer l'opportunité
    try:
        # Trouver la première étape de vente
        first_stage = SalesStage.objects.order_by('order').first()
        
        opportunity = Opportunity.objects.create(
            name=data.get('opportunity_name', f"Lead chatbot - {contact.first_name} {contact.last_name}"),
            company=company,
            stage=first_stage,
            description=data.get('opportunity_description', data.get('need', 'Besoin non spécifié')),
            created_by=request.user
        )
        
        # Associer le contact à l'opportunité
        opportunity.contacts.add(contact)
        
        # Ajouter un tag "chatbot" si disponible
        chatbot_tag, _ = Tag.objects.get_or_create(name="Chatbot")
        opportunity.tags.add(chatbot_tag)
        
    except Exception as e:
        return Response(
            {"error": f"Impossible de créer l'opportunité: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # 4. Créer une activité pour tracer l'interaction
    try:
        activity_type, _ = ActivityType.objects.get_or_create(
            name="Qualification Chatbot",
            defaults={"icon": "form", "color": "#52c41a"}
        )
        
        activity = Activity.objects.create(
            subject="Qualification via chatbot",
            activity_type=activity_type,
            start_date=timezone.now(),
            status='completed',
            completed_date=timezone.now(),
            description=f"Besoin exprimé: {data.get('need', 'Non spécifié')}",
            company=company,
            opportunity=opportunity,
            created_by=request.user
        )
        
        activity.contacts.add(contact)
        
    except Exception as e:
        # Ne pas échouer l'opération complète si l'activité ne peut pas être créée
        pass
    
    # Retourner les informations créées
    return Response({
        "status": "success",
        "contact_id": contact.id,
        "company_id": company.id,
        "opportunity_id": opportunity.id
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chatbot_faq(request):
    """
    Enregistre une interaction FAQ et retourne la réponse si disponible.
    """
    data = request.data
    
    # Enregistrer l'interaction
    try:
        # Récupérer ou créer le type d'activité "FAQ Chatbot"
        activity_type, _ = ActivityType.objects.get_or_create(
            name="FAQ Chatbot",
            defaults={"icon": "question-circle", "color": "#722ed1"}
        )
        
        # Créer l'activité
        activity_data = {
            'subject': 'Question FAQ via chatbot',
            'activity_type': activity_type,
            'start_date': timezone.now(),
            'status': 'completed',
            'completed_date': timezone.now(),
            'description': f"Question: {data.get('question', 'Non spécifiée')}\nRéponse: {data.get('answer', 'Non fournie')}"
        }
        
        # Associer à un contact si disponible
        if 'contact_id' in data:
            try:
                contact = Contact.objects.get(id=data['contact_id'])
                activity = Activity.objects.create(**activity_data, created_by=request.user)
                activity.contacts.add(contact)
            except Contact.DoesNotExist:
                activity = Activity.objects.create(**activity_data, created_by=request.user)
        else:
            activity = Activity.objects.create(**activity_data, created_by=request.user)
            
    except Exception as e:
        # Capturer mais ne pas échouer si l'enregistrement échoue
        pass
    
    # Retourner simplement un statut de réussite (la logique de FAQ est gérée par n8n)
    return Response({
        "status": "logged",
        "interaction_id": getattr(activity, 'id', None)
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chatbot_appointment(request):
    """
    Crée un rendez-vous à partir des données du chatbot.
    """
    data = request.data
    
    # Valider les données minimales requises
    if 'contact_id' not in data or 'date' not in data:
        return Response(
            {"error": "L'ID du contact et la date du rendez-vous sont requis"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Récupérer le contact
    try:
        contact = Contact.objects.get(id=data['contact_id'])
    except Contact.DoesNotExist:
        return Response(
            {"error": "Contact non trouvé"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Récupérer ou créer le type d'activité "Rendez-vous"
    activity_type, _ = ActivityType.objects.get_or_create(
        name="Rendez-vous",
        defaults={"icon": "calendar", "color": "#1890ff"}
    )
    
    # Traiter les dates
    try:
        start_date = timezone.datetime.fromisoformat(data['date'])
        
        # Calculer la date de fin si la durée est fournie
        if 'duration_minutes' in data:
            end_date = start_date + timezone.timedelta(minutes=int(data['duration_minutes']))
        else:
            # Par défaut, 1 heure
            end_date = start_date + timezone.timedelta(hours=1)
    except (ValueError, TypeError) as e:
        return Response(
            {"error": f"Format de date invalide: {str(e)}"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Créer l'activité de rendez-vous
    try:
        activity = Activity.objects.create(
            subject=data.get('subject', 'Rendez-vous via chatbot'),
            activity_type=activity_type,
            start_date=start_date,
            end_date=end_date,
            all_day=data.get('all_day', False),
            status='planned',
            description=data.get('description', ''),
            created_by=request.user
        )
        
        # Associer le contact
        activity.contacts.add(contact)
        
        # Associer l'entreprise si disponible
        if contact.company:
            activity.company = contact.company
            activity.save()
        
        # Associer l'opportunité si disponible
        if 'opportunity_id' in data:
            try:
                opportunity = Opportunity.objects.get(id=data['opportunity_id'])
                activity.opportunity = opportunity
                activity.save()
            except Opportunity.DoesNotExist:
                pass
        
        # Configurer un rappel si demandé
        if data.get('reminder', False):
            activity.reminder = True
            activity.reminder_datetime = start_date - timezone.timedelta(hours=1)  # 1 heure avant par défaut
            activity.save()
        
        return Response({
            "status": "success",
            "appointment_id": activity.id,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response(
            {"error": f"Impossible de créer le rendez-vous: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chatbot_support(request):
    """
    Crée un ticket de support à partir des données du chatbot.
    """
    data = request.data
    
    # Récupérer ou créer le type d'activité "Support"
    activity_type, _ = ActivityType.objects.get_or_create(
        name="Support",
        defaults={"icon": "tool", "color": "#f5222d"}
    )
    
    # Créer un numéro de ticket unique
    import uuid
    ticket_id = uuid.uuid4().hex[:8].upper()
    
    try:
        # Créer l'activité de support
        activity = Activity.objects.create(
            subject=f"Ticket #{ticket_id}: {data.get('subject', 'Support via chatbot')}",
            activity_type=activity_type,
            start_date=timezone.now(),
            status='planned',
            description=data.get('description', 'Aucune description fournie'),
            created_by=request.user
        )
        
        # Associer à un contact si disponible
        if 'contact_id' in data:
            try:
                contact = Contact.objects.get(id=data['contact_id'])
                activity.contacts.add(contact)
                
                # Associer l'entreprise automatiquement
                if contact.company:
                    activity.company = contact.company
                    activity.save()
            except Contact.DoesNotExist:
                pass
        
        # Associer à une entreprise explicitement si fournie
        if 'company_id' in data:
            try:
                company = Company.objects.get(id=data['company_id'])
                activity.company = company
                activity.save()
            except Company.DoesNotExist:
                pass
        
        # Ajouter un tag "support" si disponible
        support_tag, _ = Tag.objects.get_or_create(name="Support")
        activity.tags.add(support_tag)
        
        return Response({
            "status": "success",
            "ticket_id": ticket_id,
            "activity_id": activity.id
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response(
            {"error": f"Impossible de créer le ticket de support: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
