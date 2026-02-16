import django_filters
from django.db.models import Q
from .models import Company, Contact, Opportunity, Activity


class CompanyFilter(django_filters.FilterSet):
    """Filtre pour les entreprises."""
    name = django_filters.CharFilter(lookup_expr='icontains')
    industry = django_filters.NumberFilter(field_name='industry__id')
    country = django_filters.CharFilter(lookup_expr='icontains')
    city = django_filters.CharFilter(lookup_expr='icontains')
    tags = django_filters.NumberFilter(field_name='tags__id')
    created_by = django_filters.NumberFilter(field_name='created_by__id')
    assigned_to = django_filters.NumberFilter(field_name='assigned_to__id')
    min_score = django_filters.NumberFilter(field_name='score', lookup_expr='gte')
    max_score = django_filters.NumberFilter(field_name='score', lookup_expr='lte')
    created_after = django_filters.DateFilter(field_name='created_at', lookup_expr='gte')
    created_before = django_filters.DateFilter(field_name='created_at', lookup_expr='lte')
    
    # Recherche globale dans plusieurs champs
    search = django_filters.CharFilter(method='search_filter')
    
    class Meta:
        model = Company
        fields = [
            'name', 'industry', 'country', 'city', 'tags',
            'created_by', 'assigned_to', 'min_score', 'max_score',
            'created_after', 'created_before', 'search'
        ]
    
    def search_filter(self, queryset, name, value):
        """Recherche globale dans plusieurs champs."""
        return queryset.filter(
            Q(name__icontains=value) | 
            Q(description__icontains=value) |
            Q(website__icontains=value) |
            Q(email__icontains=value) |
            Q(phone__icontains=value) |
            Q(address_line1__icontains=value) |
            Q(city__icontains=value) |
            Q(country__icontains=value)
        )


class ContactFilter(django_filters.FilterSet):
    """Filtre pour les contacts."""
    first_name = django_filters.CharFilter(lookup_expr='icontains')
    last_name = django_filters.CharFilter(lookup_expr='icontains')
    email = django_filters.CharFilter(lookup_expr='icontains')
    company = django_filters.NumberFilter(field_name='company__id')
    source = django_filters.CharFilter()
    tags = django_filters.NumberFilter(field_name='tags__id')
    created_by = django_filters.NumberFilter(field_name='created_by__id')
    assigned_to = django_filters.NumberFilter(field_name='assigned_to__id')
    is_active = django_filters.BooleanFilter()
    created_after = django_filters.DateFilter(field_name='created_at', lookup_expr='gte')
    created_before = django_filters.DateFilter(field_name='created_at', lookup_expr='lte')
    
    # Recherche globale dans plusieurs champs
    search = django_filters.CharFilter(method='search_filter')
    
    class Meta:
        model = Contact
        fields = [
            'first_name', 'last_name', 'email', 'company', 'source',
            'tags', 'created_by', 'assigned_to', 'is_active',
            'created_after', 'created_before', 'search'
        ]
    
    def search_filter(self, queryset, name, value):
        """Recherche globale dans plusieurs champs."""
        return queryset.filter(
            Q(first_name__icontains=value) | 
            Q(last_name__icontains=value) |
            Q(email__icontains=value) |
            Q(phone__icontains=value) |
            Q(mobile__icontains=value) |
            Q(company__name__icontains=value) |
            Q(title__icontains=value) |
            Q(notes__icontains=value)
        )


class OpportunityFilter(django_filters.FilterSet):
    """Filtre pour les opportunités."""
    name = django_filters.CharFilter(lookup_expr='icontains')
    company = django_filters.NumberFilter(field_name='company__id')
    stage = django_filters.NumberFilter(field_name='stage__id')
    
    # Filtre pour les étapes gagnées/perdues/ouvertes
    is_won = django_filters.BooleanFilter(field_name='stage__is_won')
    is_lost = django_filters.BooleanFilter(field_name='stage__is_lost')
    is_open = django_filters.BooleanFilter(method='filter_is_open')
    
    # Filtre pour les montants et probabilités
    min_amount = django_filters.NumberFilter(field_name='amount', lookup_expr='gte')
    max_amount = django_filters.NumberFilter(field_name='amount', lookup_expr='lte')
    min_probability = django_filters.NumberFilter(field_name='probability', lookup_expr='gte')
    max_probability = django_filters.NumberFilter(field_name='probability', lookup_expr='lte')
    
    # Filtre par dates
    expected_close_after = django_filters.DateFilter(field_name='expected_close_date', lookup_expr='gte')
    expected_close_before = django_filters.DateFilter(field_name='expected_close_date', lookup_expr='lte')
    created_after = django_filters.DateFilter(field_name='created_at', lookup_expr='gte')
    created_before = django_filters.DateFilter(field_name='created_at', lookup_expr='lte')
    closed_after = django_filters.DateFilter(field_name='closed_date', lookup_expr='gte')
    closed_before = django_filters.DateFilter(field_name='closed_date', lookup_expr='lte')
    
    # Relations et métadonnées
    tags = django_filters.NumberFilter(field_name='tags__id')
    contact = django_filters.NumberFilter(field_name='contacts__id')
    created_by = django_filters.NumberFilter(field_name='created_by__id')
    assigned_to = django_filters.NumberFilter(field_name='assigned_to__id')
    
    # Recherche globale dans plusieurs champs
    search = django_filters.CharFilter(method='search_filter')
    
    class Meta:
        model = Opportunity
        fields = [
            'name', 'company', 'stage', 'is_won', 'is_lost', 'is_open',
            'min_amount', 'max_amount', 'min_probability', 'max_probability',
            'expected_close_after', 'expected_close_before',
            'created_after', 'created_before', 'closed_after', 'closed_before',
            'tags', 'contact', 'created_by', 'assigned_to', 'search'
        ]
    
    def filter_is_open(self, queryset, name, value):
        """Filtre pour les opportunités ouvertes (ni gagnées ni perdues)."""
        if value:
            return queryset.filter(stage__is_won=False, stage__is_lost=False)
        return queryset
    
    def search_filter(self, queryset, name, value):
        """Recherche globale dans plusieurs champs."""
        return queryset.filter(
            Q(name__icontains=value) | 
            Q(description__icontains=value) |
            Q(company__name__icontains=value)
        )


class ActivityFilter(django_filters.FilterSet):
    """Filtre pour les activités."""
    subject = django_filters.CharFilter(lookup_expr='icontains')
    activity_type = django_filters.NumberFilter(field_name='activity_type__id')
    status = django_filters.CharFilter()
    
    # Relations
    company = django_filters.NumberFilter(field_name='company__id')
    opportunity = django_filters.NumberFilter(field_name='opportunity__id')
    contact = django_filters.NumberFilter(field_name='contacts__id')
    
    # Filtres de date
    start_after = django_filters.DateTimeFilter(field_name='start_date', lookup_expr='gte')
    start_before = django_filters.DateTimeFilter(field_name='start_date', lookup_expr='lte')
    created_after = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_before = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    completed_after = django_filters.DateTimeFilter(field_name='completed_date', lookup_expr='gte')
    completed_before = django_filters.DateTimeFilter(field_name='completed_date', lookup_expr='lte')
    
    # Métadonnées
    created_by = django_filters.NumberFilter(field_name='created_by__id')
    assigned_to = django_filters.NumberFilter(field_name='assigned_to__id')
    reminder = django_filters.BooleanFilter()
    
    # Filtre pour activités du jour ou de la semaine
    today = django_filters.BooleanFilter(method='filter_today')
    this_week = django_filters.BooleanFilter(method='filter_this_week')
    overdue = django_filters.BooleanFilter(method='filter_overdue')
    
    # Recherche globale dans plusieurs champs
    search = django_filters.CharFilter(method='search_filter')
    
    class Meta:
        model = Activity
        fields = [
            'subject', 'activity_type', 'status', 'company', 'opportunity', 'contact',
            'start_after', 'start_before', 'created_after', 'created_before',
            'completed_after', 'completed_before', 'created_by', 'assigned_to',
            'reminder', 'today', 'this_week', 'overdue', 'search'
        ]
    
    def filter_today(self, queryset, name, value):
        """Filtre pour les activités du jour."""
        if not value:
            return queryset
        
        from django.utils import timezone
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timezone.timedelta(days=1)
        
        return queryset.filter(start_date__gte=today_start, start_date__lt=today_end)
    
    def filter_this_week(self, queryset, name, value):
        """Filtre pour les activités de la semaine."""
        if not value:
            return queryset
        
        from django.utils import timezone
        import datetime
        
        # Aujourd'hui
        today = timezone.now().date()
        
        # Début de la semaine (lundi)
        start_of_week = today - datetime.timedelta(days=today.weekday())
        start_datetime = timezone.make_aware(datetime.datetime.combine(start_of_week, datetime.time.min))
        
        # Fin de la semaine (dimanche)
        end_of_week = start_of_week + datetime.timedelta(days=6)
        end_datetime = timezone.make_aware(datetime.datetime.combine(end_of_week, datetime.time.max))
        
        return queryset.filter(start_date__gte=start_datetime, start_date__lte=end_datetime)
    
    def filter_overdue(self, queryset, name, value):
        """Filtre pour les activités en retard."""
        if not value:
            return queryset
        
        from django.utils import timezone
        now = timezone.now()
        
        return queryset.filter(start_date__lt=now, status='planned')
    
    def search_filter(self, queryset, name, value):
        """Recherche globale dans plusieurs champs."""
        return queryset.filter(
            Q(subject__icontains=value) | 
            Q(description__icontains=value) |
            Q(company__name__icontains=value) |
            Q(opportunity__name__icontains=value) |
            Q(contacts__first_name__icontains=value) |
            Q(contacts__last_name__icontains=value)
        ).distinct()
