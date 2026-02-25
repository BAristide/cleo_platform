from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from users.permissions import HasModulePermission

from .models import Notification, NotificationPreference
from .serializers import NotificationPreferenceSerializer, NotificationSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Liste et détail des notifications de l'utilisateur connecté.
    Actions custom : mark_read, mark_all_read, unread_count.
    """

    serializer_class = NotificationSerializer
    permission_classes = [HasModulePermission]
    module_name = 'notifications'
    filterset_fields = ['level', 'module', 'is_read']
    ordering_fields = ['created_at', 'level']

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Marquer une notification comme lue."""
        notif = self.get_object()
        notif.is_read = True
        notif.save(update_fields=['is_read'])
        return Response(NotificationSerializer(notif).data)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Marquer toutes les notifications non lues comme lues."""
        count = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'marked': count})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Nombre de notifications non lues."""
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})

    @action(detail=False, methods=['delete'])
    def clear_read(self, request):
        """Supprimer toutes les notifications lues de plus de 30 jours."""
        cutoff = timezone.now() - timezone.timedelta(days=30)
        count, _ = (
            self.get_queryset().filter(is_read=True, created_at__lt=cutoff).delete()
        )
        return Response({'deleted': count})


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def notification_preferences(request):
    """GET/PUT/PATCH les préférences de notification de l'utilisateur connecté."""
    prefs, _created = NotificationPreference.objects.get_or_create(user=request.user)
    if request.method == 'GET':
        return Response(NotificationPreferenceSerializer(prefs).data)

    serializer = NotificationPreferenceSerializer(
        prefs, data=request.data, partial=(request.method == 'PATCH')
    )
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)
