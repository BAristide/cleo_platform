"""
Mixins de permissions pour les ViewSets Cleo ERP.

SelfServicePermissionMixin :
    Permet de déclarer des actions « self-service » qui ne nécessitent
    pas HasModulePermission. Utilisé pour les endpoints accessibles
    à tout employé authentifié depuis /my-space.

Usage :
    class MyViewSet(SelfServicePermissionMixin, viewsets.ModelViewSet):
        permission_classes = [IsAuthenticated, HasModulePermission]
        self_service_actions = ['list', 'retrieve', 'me']
        # Optionnel — par défaut [IsAuthenticated] :
        self_service_permissions = [IsAuthenticated, CanSubmitOwnCertificate]
"""

from rest_framework import permissions


class SelfServicePermissionMixin:
    """
    Mixin qui relâche les permissions sur les actions déclarées
    dans self_service_actions.

    Attributs de classe :
        self_service_actions (list[str]) :
            Noms des actions DRF accessibles sans HasModulePermission.
            Default : [] (aucun effet).

        self_service_permissions (list[type]) :
            Classes de permissions appliquées aux actions self-service.
            Default : [permissions.IsAuthenticated].
    """

    self_service_actions = []
    self_service_permissions = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in self.self_service_actions:
            return [perm() for perm in self.self_service_permissions]
        return super().get_permissions()
