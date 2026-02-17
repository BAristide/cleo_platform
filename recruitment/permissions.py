# recruitment/permissions.py
from rest_framework import permissions


class IsHROrReadOnly(permissions.BasePermission):
    """
    Permission personnalisée qui permet:
    - Lecture pour tous les utilisateurs authentifiés
    - Écriture uniquement pour les utilisateurs avec le rôle RH
    """

    def has_permission(self, request, view):
        # Lecture autorisée pour tous les utilisateurs authentifiés
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated

        # Écriture autorisée seulement pour les RH
        try:
            return request.user.is_authenticated and request.user.employee.is_hr
        except Exception:
            return False


class IsInterviewer(permissions.BasePermission):
    """
    Permission personnalisée qui permet:
    - Lecture des évaluations pour les évaluateurs assignés
    - Écriture des évaluations pour les évaluateurs assignés
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Vérifier si l'utilisateur est l'évaluateur assigné
        try:
            return obj.interviewer.employee == request.user.employee
        except Exception:
            return False


class IsRH(permissions.BasePermission):
    """
    Permission qui autorise uniquement les utilisateurs avec le rôle RH
    """

    def has_permission(self, request, view):
        try:
            return request.user.is_authenticated and request.user.employee.is_hr
        except Exception:
            return False
