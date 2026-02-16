from rest_framework import permissions
from .models import ModulePermission

class ModulePermissionBackend:
    """
    Backend de permission personnalisé pour vérifier les autorisations par module.
    """
    
    def has_module_permission(self, user_obj, module, level):
        """
        Vérifie si l'utilisateur a les permissions requises pour un module.
        
        Args:
            user_obj: L'utilisateur à vérifier
            module: Le code du module (ex: 'crm', 'sales')
            level: Le niveau d'accès requis ('read', 'create', 'update', 'delete', 'admin')
            
        Returns:
            bool: True si l'utilisateur a les permissions requises, False sinon
        """
        # Les superutilisateurs ont toutes les permissions
        if user_obj.is_superuser:
            return True
        
        # Vérifier les permissions via les groupes et rôles
        user_groups = user_obj.groups.all()
        
        for group in user_groups:
            try:
                # Récupérer le rôle associé au groupe
                role = group.role
                
                # Vérifier les permissions du module pour ce rôle
                module_perm = ModulePermission.objects.filter(role=role, module=module).first()
                
                if module_perm:
                    # Déterminer si le niveau d'accès est suffisant
                    access_levels = {
                        'no_access': 0,
                        'read': 1,
                        'create': 2,
                        'update': 3,
                        'delete': 4,
                        'admin': 5
                    }
                    
                    required_level = access_levels.get(level, 0)
                    user_level = access_levels.get(module_perm.access_level, 0)
                    
                    if user_level >= required_level:
                        return True
            
            except Exception:
                # Si une erreur se produit, continuer avec le groupe suivant
                continue
        
        # Par défaut, refuser l'accès
        return False

class HasModulePermission(permissions.BasePermission):
    """
    Permission pour l'API REST qui vérifie les autorisations par module.
    """
    
    def has_permission(self, request, view):
        # Déterminer le module à partir de la vue
        module = self._get_module_from_view(view)
        
        # Déterminer le niveau d'accès requis à partir de la méthode HTTP
        method_map = {
            'GET': 'read',
            'POST': 'create',
            'PUT': 'update',
            'PATCH': 'update',
            'DELETE': 'delete',
        }
        level = method_map.get(request.method, 'read')
        
        # Créer l'instance du backend
        backend = ModulePermissionBackend()
        
        # Vérifier l'autorisation
        return backend.has_module_permission(request.user, module, level)
    
    def _get_module_from_view(self, view):
        """Détermine le module à partir de la vue."""
        # Premièrement, vérifier si la vue a un attribut module_name
        if hasattr(view, 'module_name'):
            return view.module_name
        
        # Sinon, essayer de déterminer le module à partir du nom de la classe
        view_class = view.__class__.__name__.lower()
        
        # Vérifier s'il y a des correspondances directes
        if 'crm' in view_class:
            return 'crm'
        elif 'sale' in view_class or 'invoice' in view_class or 'order' in view_class or 'quote' in view_class:
            return 'sales'
        elif 'hr' in view_class or 'employee' in view_class or 'mission' in view_class:
            return 'hr'
        elif 'payroll' in view_class or 'payslip' in view_class:
            return 'payroll'
        elif 'account' in view_class or 'journal' in view_class or 'ledger' in view_class:
            return 'accounting'
        
        # Par défaut, utiliser 'core'
        return 'core'
