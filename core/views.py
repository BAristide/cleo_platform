from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Company, CoreSettings, Currency
from .serializers import CompanySerializer, CoreSettingsSerializer, CurrencySerializer


class CurrencyViewSet(viewsets.ModelViewSet):
    queryset = Currency.objects.all()
    serializer_class = CurrencySerializer
    permission_classes = [IsAuthenticated]

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        new_is_default = request.data.get('is_default')

        # Si on tente de définir une nouvelle devise par défaut
        if new_is_default and not instance.is_default:
            if self._has_commercial_documents():
                return Response(
                    {
                        'error': 'Impossible de changer la devise par défaut : '
                        'des documents commerciaux existent déjà. '
                        'Contactez un administrateur système.'
                    },
                    status=400,
                )

        # Si on tente de retirer le statut par défaut
        if instance.is_default and new_is_default is False:
            return Response(
                {
                    'error': 'Impossible de retirer le statut par défaut. '
                    'Définissez une autre devise comme devise par défaut.'
                },
                status=400,
            )

        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        """Appliquer les mêmes règles pour PATCH."""
        return self.update(request, *args, **kwargs)

    def _has_commercial_documents(self):
        """Vérifie si des documents commerciaux existent."""
        from sales.models import Invoice, Order, Quote

        return (
            Quote.objects.exists() or Order.objects.exists() or Invoice.objects.exists()
        )

    @action(detail=False, methods=['get'])
    def default(self, request):
        """Récupérer la devise par défaut avec statut de verrouillage."""
        default_currency = Currency.objects.filter(is_default=True).first()
        if default_currency:
            serializer = self.get_serializer(default_currency)
            data = serializer.data
            data['is_locked'] = self._has_commercial_documents()
            return Response(data)
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
        settings = CoreSettings.objects.first()
        if settings:
            serializer = self.get_serializer(settings)
            return Response(serializer.data)
        return Response({'error': 'No settings found'}, status=404)
