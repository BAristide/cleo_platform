from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from users.models import ActivityLog

@ensure_csrf_cookie
def login_view(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            next_url = request.POST.get('next', '/')
            # Vérifier si next_url est vide ou invalide
            if not next_url or next_url == '':
                next_url = '/'  # Rediriger vers la page d'accueil par défaut
                
            # Journaliser la connexion
            ActivityLog.objects.create(
                user=user,
                action='login',
                module='core',
                details='Connexion réussie',
                ip_address=request.META.get('REMOTE_ADDR')
            )
            
            return redirect(next_url)
        else:
            # Journaliser la tentative échouée
            ActivityLog.objects.create(
                user=None,
                action='failed_login',
                module='core',
                details=f'Tentative de connexion échouée pour "{username}"',
                ip_address=request.META.get('REMOTE_ADDR')
            )
            
            return render(request, 'login.html', {'error': 'Nom d\'utilisateur ou mot de passe invalide'})
    else:
        next_url = request.GET.get('next', '/')
        # Vérifier si next_url est vide ou invalide
        if not next_url or next_url == '':
            next_url = '/'  # Utiliser la page d'accueil par défaut
        return render(request, 'login.html', {'next': next_url})

def logout_view(request):
    # Journaliser la déconnexion
    if request.user.is_authenticated:
        ActivityLog.objects.create(
            user=request.user,
            action='logout',
            module='core',
            details='Déconnexion',
            ip_address=request.META.get('REMOTE_ADDR')
        )
    
    logout(request)
    return redirect('/login/')

@login_required
def index_view(request):
    return render(request, 'index.html')

@login_required
def check_auth(request):
    # Obtenir les rôles et permissions
    roles = [group.name for group in request.user.groups.all()]
    
    # Construire une liste des modules accessibles
    modules_access = {}
    from users.models import ModulePermission
    
    # Tous les modules possibles
    all_modules = [module[0] for module in ModulePermission.MODULE_CHOICES]
    
    # Si l'utilisateur est superuser, il a accès à tout
    if request.user.is_superuser:
        for module in all_modules:
            modules_access[module] = 'admin'
    else:
        # Initialiser tous les modules à 'no_access'
        for module in all_modules:
            modules_access[module] = 'no_access'
        
        # Récupérer les permissions pour chaque groupe de l'utilisateur
        for group in request.user.groups.all():
            try:
                role = group.role
                for module_perm in role.module_permissions.all():
                    # Mettre à jour l'accès si le niveau est supérieur
                    current_level = modules_access.get(module_perm.module, 'no_access')
                    new_level = module_perm.access_level
                    
                    # Déterminer le niveau le plus élevé
                    levels = {
                        'no_access': 0,
                        'read': 1,
                        'create': 2,
                        'update': 3,
                        'delete': 4,
                        'admin': 5
                    }
                    
                    if levels.get(new_level, 0) > levels.get(current_level, 0):
                        modules_access[module_perm.module] = new_level
            except:
                continue
    
    return JsonResponse({
        'authenticated': True, 
        'username': request.user.username,
        'email': request.user.email,
        'full_name': f"{request.user.first_name} {request.user.last_name}",
        'is_superuser': request.user.is_superuser,
        'is_staff': request.user.is_staff,
        'roles': roles,
        'modules_access': modules_access
    })
