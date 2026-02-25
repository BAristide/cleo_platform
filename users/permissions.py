from functools import wraps

from rest_framework import permissions
from rest_framework.response import Response

from .models import ModulePermission


class ModulePermissionBackend:
    """
    Backend de permission personnalisé pour vérifier les autorisations par module.
    Hiérarchie : no_access(0) < read(1) < create(2) < update(3) < delete(4) < admin(5)
    """

    ACCESS_HIERARCHY = {
        'no_access': 0,
        'read': 1,
        'create': 2,
        'update': 3,
        'delete': 4,
        'admin': 5,
    }

    def has_module_permission(self, user_obj, module, level):
        """
        Vérifie si l'utilisateur a le niveau d'accès requis pour un module.
        """
        # Les superutilisateurs ont toutes les permissions
        if user_obj.is_superuser:
            return True

        required_level = self.ACCESS_HIERARCHY.get(level, 0)
        user_max_level = 0

        # Vérifier les permissions via les groupes et rôles
        for group in user_obj.groups.all():
            try:
                role = group.role
                module_perm = ModulePermission.objects.filter(
                    role=role, module=module
                ).first()
                if module_perm:
                    user_level = self.ACCESS_HIERARCHY.get(module_perm.access_level, 0)
                    user_max_level = max(user_max_level, user_level)
            except Exception:
                continue

        return user_max_level >= required_level


class HasModulePermission(permissions.BasePermission):
    """
    Permission DRF pour les ViewSets basée sur le module et la méthode HTTP.
    Usage : permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    Le ViewSet doit définir module_name = 'sales' (ou sera deviné par class name).
    """

    # Mapping module par détection de class name (fallback si module_name absent)
    MODULE_MAPPING = {
        # CRM
        'crm': 'crm',
        'contact': 'crm',
        'company': 'crm',
        'opportunity': 'crm',
        'activity': 'crm',
        'salesstage': 'crm',
        'industry': 'crm',
        'tag': 'crm',
        # Ventes
        'sale': 'sales',
        'invoice': 'sales',
        'order': 'sales',
        'quote': 'sales',
        'product': 'sales',
        'payment': 'sales',
        'bankaccount': 'sales',
        # RH
        'employee': 'hr',
        'department': 'hr',
        'jobtitle': 'hr',
        'mission': 'hr',
        'skill': 'hr',
        'training': 'hr',
        'availability': 'hr',
        # Paie
        'payroll': 'payroll',
        'payslip': 'payroll',
        'salarycomponent': 'payroll',
        'taxbracket': 'payroll',
        'contracttype': 'payroll',
        'advance': 'payroll',
        # Comptabilité
        'account': 'accounting',
        'journal': 'accounting',
        'ledger': 'accounting',
        'fiscal': 'accounting',
        'reconciliation': 'accounting',
        'bankstatement': 'accounting',
        'tax': 'accounting',
        'asset': 'accounting',
        'analytic': 'accounting',
        'currency': 'accounting',
        # Stocks
        'warehouse': 'inventory',
        'stocklevel': 'inventory',
        'stockmove': 'inventory',
        'stockalert': 'inventory',
        'inventory': 'inventory',
        # Achats
        'purchaseorder': 'purchasing',
        'supplier': 'purchasing',
        'supplierinvoice': 'purchasing',
        'reception': 'purchasing',
        'purchasing': 'purchasing',
        # Recrutement
        'jobopening': 'recruitment',
        'candidate': 'recruitment',
        'application': 'recruitment',
        'interview': 'recruitment',
        'evaluation': 'recruitment',
        'recruitment': 'recruitment',
        # Dashboard
        'dashboard': 'dashboard',
        # Notifications
        'notification': 'notifications',
        'notifications': 'notifications',
    }

    # Mapping HTTP method → access level requis
    METHOD_TO_LEVEL = {
        'GET': 'read',
        'HEAD': 'read',
        'OPTIONS': 'read',
        'POST': 'create',
        'PUT': 'update',
        'PATCH': 'update',
        'DELETE': 'delete',
    }

    def has_permission(self, request, view):
        module = self._get_module_from_view(view)
        level = self.METHOD_TO_LEVEL.get(request.method, 'read')
        backend = ModulePermissionBackend()
        return backend.has_module_permission(request.user, module, level)

    def _get_module_from_view(self, view):
        """Détermine le module à partir de la vue."""
        # 1. Attribut explicite sur le ViewSet
        if hasattr(view, 'module_name'):
            return view.module_name

        # 2. Détection par nom de classe
        view_class = view.__class__.__name__.lower()
        for keyword, module in self.MODULE_MAPPING.items():
            if keyword in view_class:
                return module

        # 3. Fallback
        return 'core'


def module_permission_required(module, level=None):
    """
    Décorateur pour les function-based views (FBV).
    Si level=None, le niveau est auto-détecté depuis la méthode HTTP.
    Usage:
        @api_view(['GET'])
        @permission_classes([permissions.IsAuthenticated])
        @module_permission_required('accounting')
        def my_view(request):
            ...
    """

    METHOD_TO_LEVEL = {
        'GET': 'read',
        'HEAD': 'read',
        'OPTIONS': 'read',
        'POST': 'create',
        'PUT': 'update',
        'PATCH': 'update',
        'DELETE': 'delete',
    }

    def decorator(view_func):
        @wraps(view_func)
        def _wrapped(request, *args, **kwargs):
            effective_level = level or METHOD_TO_LEVEL.get(request.method, 'read')
            backend = ModulePermissionBackend()
            if not backend.has_module_permission(request.user, module, effective_level):
                return Response(
                    {
                        'detail': f"Vous n'avez pas les permissions requises "
                        f"pour le module '{module}' (niveau '{effective_level}' requis)."
                    },
                    status=403,
                )
            return view_func(request, *args, **kwargs)

        return _wrapped

    return decorator
