from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group
from users.models import UserRole, ModulePermission

class Command(BaseCommand):
    help = "Crée les rôles utilisateur par défaut"

    def handle(self, *args, **options):
        self.stdout.write("Création des rôles par défaut...")
        
        # Définir les rôles par défaut et leurs permissions
        default_roles = [
            {
                'name': 'Administrateur',
                'description': 'Accès complet à tous les modules',
                'permissions': {
                    'core': 'admin',
                    'crm': 'admin',
                    'sales': 'admin',
                    'hr': 'admin',
                    'payroll': 'admin',
                    'accounting': 'admin',
                }
            },
            {
                'name': 'Ventes',
                'description': 'Équipe commerciale',
                'permissions': {
                    'core': 'read',
                    'crm': 'admin',
                    'sales': 'admin',
                    'hr': 'read',
                    'payroll': 'no_access',
                    'accounting': 'read',
                }
            },
            {
                'name': 'Ressources Humaines',
                'description': 'Équipe RH',
                'permissions': {
                    'core': 'read',
                    'crm': 'read',
                    'sales': 'read',
                    'hr': 'admin',
                    'payroll': 'admin',
                    'accounting': 'read',
                }
            },
            {
                'name': 'Finance',
                'description': 'Équipe financière',
                'permissions': {
                    'core': 'read',
                    'crm': 'read',
                    'sales': 'read',
                    'hr': 'read',
                    'payroll': 'read',
                    'accounting': 'admin',
                }
            },
            {
                'name': 'Employé',
                'description': 'Accès de base pour tous les employés',
                'permissions': {
                    'core': 'read',
                    'crm': 'read',
                    'sales': 'read',
                    'hr': 'read',
                    'payroll': 'read',
                    'accounting': 'no_access',
                }
            },
        ]
        
        for role_data in default_roles:
            # Créer ou récupérer le groupe Django
            group, _ = Group.objects.get_or_create(name=role_data['name'])
            
            # Créer ou récupérer le rôle
            role, created = UserRole.objects.get_or_create(
                name=role_data['name'],
                defaults={
                    'description': role_data['description'],
                    'group': group,
                    'is_active': True
                }
            )
            
            if created:
                self.stdout.write(f"Rôle créé: {role.name}")
            else:
                self.stdout.write(f"Rôle existant mis à jour: {role.name}")
                role.description = role_data['description']
                role.group = group
                role.is_active = True
                role.save()
            
            # Créer ou mettre à jour les permissions de module
            for module, access_level in role_data['permissions'].items():
                module_perm, created = ModulePermission.objects.update_or_create(
                    role=role,
                    module=module,
                    defaults={'access_level': access_level}
                )
                
                self.stdout.write(f"  - Permission {module}: {access_level}")
        
        self.stdout.write(self.style.SUCCESS("Tous les rôles par défaut ont été créés"))
