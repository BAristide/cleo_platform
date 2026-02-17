from django.contrib.auth.models import User
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from .models import ActivityLog, ModulePermission, UserRole
from .permissions import HasModulePermission
from .serializers import (
    ActivityLogSerializer,
    EmployeeUserLinkSerializer,
    ModulePermissionSerializer,
    UserRoleSerializer,
    UserSerializer,
)


class UserViewSet(viewsets.ModelViewSet):
    """API pour gérer les utilisateurs."""

    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ['is_active', 'is_staff', 'groups__name']
    search_fields = [
        'username',
        'email',
        'first_name',
        'last_name',
        'profile__employee__first_name',
        'profile__employee__last_name',
    ]
    ordering_fields = ['username', 'email', 'first_name', 'last_name']
    ordering = ['username']

    # Définir le module pour les permissions
    module_name = 'core'

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Retourne les informations de l'utilisateur connecté."""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def set_password(self, request, pk=None):
        """Modifie le mot de passe d'un utilisateur."""
        user = self.get_object()
        password = request.data.get('password')

        if not password:
            return Response(
                {'error': 'Le mot de passe est requis'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(password)
        user.save()

        # Mettre à jour la date de changement de mot de passe
        if hasattr(user, 'profile'):
            from django.utils import timezone

            user.profile.password_changed_at = timezone.now()
            user.profile.save()

        return Response({'success': 'Mot de passe modifié avec succès'})

    @action(detail=True, methods=['post'])
    def add_to_role(self, request, pk=None):
        """Ajoute l'utilisateur à un rôle."""
        user = self.get_object()
        role_id = request.data.get('role_id')

        if not role_id:
            return Response(
                {'error': "L'ID du rôle est requis"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            role = UserRole.objects.get(pk=role_id)
            group = role.group
            user.groups.add(group)
            return Response(
                {'success': f"L'utilisateur a été ajouté au rôle {role.name}"}
            )
        except UserRole.DoesNotExist:
            return Response(
                {'error': 'Rôle non trouvé'}, status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def remove_from_role(self, request, pk=None):
        """Retire l'utilisateur d'un rôle."""
        user = self.get_object()
        role_id = request.data.get('role_id')

        if not role_id:
            return Response(
                {'error': "L'ID du rôle est requis"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            role = UserRole.objects.get(pk=role_id)
            group = role.group
            user.groups.remove(group)
            return Response(
                {'success': f"L'utilisateur a été retiré du rôle {role.name}"}
            )
        except UserRole.DoesNotExist:
            return Response(
                {'error': 'Rôle non trouvé'}, status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def link_to_employee(self, request, pk=None):
        """Lie l'utilisateur à un employé."""
        user = self.get_object()

        # Préparer les données pour le sérialiseur
        data = {'user_id': user.id, 'employee_id': request.data.get('employee_id')}

        serializer = EmployeeUserLinkSerializer(data=data)
        if serializer.is_valid():
            result = serializer.save()
            return Response(
                {
                    'success': "Utilisateur lié à l'employé avec succès",
                    'employee': result['employee'].full_name,
                }
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserRoleViewSet(viewsets.ModelViewSet):
    """API pour gérer les rôles utilisateur."""

    queryset = UserRole.objects.all()
    serializer_class = UserRoleSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    # Définir le module pour les permissions
    module_name = 'core'

    @action(detail=True, methods=['get'])
    def users(self, request, pk=None):
        """Retourne tous les utilisateurs ayant ce rôle."""
        role = self.get_object()
        group = role.group
        users = User.objects.filter(groups=group)
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def set_module_permissions(self, request, pk=None):
        """Définit les permissions de module pour ce rôle."""
        role = self.get_object()
        permissions_data = request.data.get('permissions', [])

        if not permissions_data:
            return Response(
                {'error': 'Les données de permissions sont requises'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Supprimer les permissions existantes pour les modules concernés
        modules_to_update = [
            perm['module'] for perm in permissions_data if 'module' in perm
        ]
        ModulePermission.objects.filter(
            role=role, module__in=modules_to_update
        ).delete()

        # Créer les nouvelles permissions
        for perm_data in permissions_data:
            if 'module' in perm_data and 'access_level' in perm_data:
                ModulePermission.objects.create(
                    role=role,
                    module=perm_data['module'],
                    access_level=perm_data['access_level'],
                )

        # Récupérer les permissions mises à jour
        updated_permissions = ModulePermission.objects.filter(role=role)
        serializer = ModulePermissionSerializer(updated_permissions, many=True)
        return Response(serializer.data)


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """API pour consulter les journaux d'activité."""

    queryset = ActivityLog.objects.all()
    serializer_class = ActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ['user', 'module', 'action', 'entity_type']
    search_fields = ['user__username', 'details', 'ip_address']
    ordering_fields = ['timestamp', 'user__username', 'action']
    ordering = ['-timestamp']

    # Définir le module pour les permissions
    module_name = 'core'

    def get_queryset(self):
        """Personnaliser le queryset selon l'utilisateur."""
        queryset = super().get_queryset()

        # Les superutilisateurs peuvent voir tous les logs
        if self.request.user.is_superuser:
            return queryset

        # Les utilisateurs avec permissions admin sur 'core' peuvent tout voir
        perm = HasModulePermission()
        if perm.has_module_permission(self.request, 'core', 'admin'):
            return queryset

        # Les autres utilisateurs ne voient que leurs propres logs
        return queryset.filter(user=self.request.user)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def log_activity(request):
    """API pour créer manuellement une entrée de journal d'activité."""
    # Vérifier si l'utilisateur a les permissions requises
    if not request.user.is_superuser:
        perm = HasModulePermission()
        if not perm.has_module_permission(request, 'core', 'create'):
            return Response(
                {'error': 'Permissions insuffisantes'},
                status=status.HTTP_403_FORBIDDEN,
            )

    # Créer l'entrée de journal
    try:
        log = ActivityLog.objects.create(
            user=request.user,
            action=request.data.get('action', 'manual_entry'),
            module=request.data.get('module', 'core'),
            entity_type=request.data.get('entity_type', ''),
            entity_id=request.data.get('entity_id'),
            details=request.data.get('details', ''),
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        serializer = ActivityLogSerializer(log)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
