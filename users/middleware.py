import re
import json
from django.utils.deprecation import MiddlewareMixin
from .models import ActivityLog

class ActivityLogMiddleware(MiddlewareMixin):
    """Middleware pour journaliser les activités importantes."""
    
    # Liste des patterns d'URL à suivre
    TRACKED_URLS = [
        # API URLs pour les opérations importantes
        r'^/api/([^/]+)/.*$',  # Capture le module dans le premier groupe
    ]
    
    # Méthodes HTTP à journaliser
    TRACKED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']
    
    # Attribut requis pour les middlewares Django 3.1+
    async_mode = False
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.compiled_patterns = [re.compile(pattern) for pattern in self.TRACKED_URLS]
        super().__init__(get_response)
    
    def process_view(self, request, view_func, view_args, view_kwargs):
        """Appelé juste avant l'exécution de la vue."""
        # Vérifier si l'URL doit être suivie
        url_match = None
        for pattern in self.compiled_patterns:
            match = pattern.match(request.path)
            if match:
                url_match = match
                break
        
        # Si l'URL ne correspond pas ou si la méthode HTTP n'est pas à suivre, on ne fait rien
        if not url_match or request.method not in self.TRACKED_METHODS:
            return None
        
        # Stocker les informations pour une utilisation ultérieure
        request._activity_tracking = {
            'module': url_match.group(1) if url_match.groups() else 'unknown',
            'ip_address': self._get_client_ip(request),
        }
        
        return None
    
    def process_response(self, request, response):
        """Appelé juste après l'exécution de la vue."""
        # Vérifier si le suivi d'activité a été activé
        if not hasattr(request, '_activity_tracking'):
            return response
        
        # Ne journaliser que les réponses réussies (2xx)
        if 200 <= response.status_code < 300:
            # Essayer d'extraire les informations sur l'entité
            entity_type = None
            entity_id = None
            
            # Essayer d'extraire des données du corps de la requête
            try:
                if request.content_type == 'application/json':
                    data = json.loads(request.body.decode('utf-8'))
                    entity_id = data.get('id')
                else:
                    data = request.POST
                    entity_id = data.get('id')
            except:
                data = {}
            
            # Construire l'action en fonction de la méthode HTTP
            action_map = {
                'POST': 'create',
                'PUT': 'update',
                'PATCH': 'update',
                'DELETE': 'delete'
            }
            action = action_map.get(request.method, 'other')
            
            # Trouver le type d'entité à partir de l'URL
            path_parts = request.path.strip('/').split('/')
            if len(path_parts) > 1:
                entity_type = path_parts[-1]
            
            # Créer l'entrée de journal
            if request.user.is_authenticated:
                ActivityLog.objects.create(
                    user=request.user,
                    action=action,
                    module=request._activity_tracking['module'],
                    entity_type=entity_type,
                    entity_id=entity_id,
                    details=f"{request.method} {request.path}",
                    ip_address=request._activity_tracking['ip_address']
                )
        
        return response
    
    def _get_client_ip(self, request):
        """Récupère l'adresse IP du client."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
