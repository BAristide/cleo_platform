# recruitment/filters.py
import django_filters
from .models import JobOpening, Application, CandidateEvaluation

class JobOpeningFilter(django_filters.FilterSet):
    """Filtres pour les offres d'emploi."""
    title = django_filters.CharFilter(lookup_expr='icontains')
    reference = django_filters.CharFilter(lookup_expr='icontains')
    department = django_filters.NumberFilter()
    status = django_filters.CharFilter()
    opening_date_after = django_filters.DateFilter(field_name='opening_date', lookup_expr='gte')
    opening_date_before = django_filters.DateFilter(field_name='opening_date', lookup_expr='lte')
    is_remote = django_filters.BooleanFilter()
    contract_type = django_filters.CharFilter(lookup_expr='icontains')
    
    class Meta:
        model = JobOpening
        fields = [
            'title', 'reference', 'department', 'job_title', 'status',
            'opening_date_after', 'opening_date_before', 'is_remote',
            'contract_type', 'location'
        ]

class ApplicationFilter(django_filters.FilterSet):
    """Filtres pour les candidatures."""
    job_opening = django_filters.NumberFilter()
    candidate = django_filters.NumberFilter()
    status = django_filters.CharFilter()
    application_date_after = django_filters.DateFilter(field_name='application_date', lookup_expr='gte')
    application_date_before = django_filters.DateFilter(field_name='application_date', lookup_expr='lte')
    interview_date_after = django_filters.DateFilter(field_name='interview_date', lookup_expr='gte')
    interview_date_before = django_filters.DateFilter(field_name='interview_date', lookup_expr='lte')
    search = django_filters.CharFilter(method='search_filter')
    
    class Meta:
        model = Application
        fields = [
            'job_opening', 'candidate', 'status',
            'application_date_after', 'application_date_before',
            'interview_date_after', 'interview_date_before'
        ]
    
    def search_filter(self, queryset, name, value):
        """Filtre de recherche sur les candidats."""
        return queryset.filter(
            models.Q(candidate__first_name__icontains=value) |
            models.Q(candidate__last_name__icontains=value) |
            models.Q(candidate__email__icontains=value) |
            models.Q(job_opening__title__icontains=value) |
            models.Q(job_opening__reference__icontains=value)
        )

class CandidateEvaluationFilter(django_filters.FilterSet):
    """Filtres pour les évaluations de candidats."""
    application = django_filters.NumberFilter()
    interviewer = django_filters.NumberFilter()
    evaluation_date_after = django_filters.DateFilter(field_name='evaluation_date', lookup_expr='gte')
    evaluation_date_before = django_filters.DateFilter(field_name='evaluation_date', lookup_expr='lte')
    general_impression = django_filters.NumberFilter()
    
    class Meta:
        model = CandidateEvaluation
        fields = [
            'application', 'interviewer', 'evaluation_date_after',
            'evaluation_date_before', 'general_impression'
        ]
