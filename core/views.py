from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Currency, Company, CoreSettings
from .serializers import CurrencySerializer, CompanySerializer, CoreSettingsSerializer

class CurrencyViewSet(viewsets.ModelViewSet):
    queryset = Currency.objects.all()
    serializer_class = CurrencySerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def default(self, request):
        """Récupérer la devise par défaut."""
        default_currency = Currency.objects.filter(is_default=True).first()
        if default_currency:
            serializer = self.get_serializer(default_currency)
            return Response(serializer.data)
        return Response({'error': 'No default currency found'}, status=404)

class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated]

class CoreSettingsViewSet(viewsets.ModelViewSet):
    queryset = CoreSettings.objects.all()
    serializer_class = CoreSettingsSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Récupérer les paramètres courants."""
        # Dans un ERP multi-entreprise, on pourrait filtrer par l'entreprise de l'utilisateur courant
        settings = CoreSettings.objects.first()
        if settings:
            serializer = self.get_serializer(settings)
            return Response(serializer.data)
        return Response({'error': 'No settings found'}, status=404)
