from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand

from users.models import ModulePermission, UserRole


class Command(BaseCommand):
    help = 'Crée les rôles utilisateur par défaut avec permissions sur 10 modules'

    def handle(self, *args, **options):
        self.stdout.write('Création des rôles par défaut...')

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
                    'inventory': 'admin',
                    'purchasing': 'admin',
                    'recruitment': 'admin',
                    'dashboard': 'admin',
                },
            },
            {
                'name': 'Directeur',
                'description': 'Lecture complète + dashboard décisionnel',
                'permissions': {
                    'core': 'read',
                    'crm': 'read',
                    'sales': 'read',
                    'hr': 'read',
                    'payroll': 'read',
                    'accounting': 'read',
                    'inventory': 'read',
                    'purchasing': 'read',
                    'recruitment': 'read',
                    'dashboard': 'admin',
                },
            },
            {
                'name': 'Ventes',
                'description': 'Équipe commerciale — CRM et Ventes',
                'permissions': {
                    'core': 'read',
                    'crm': 'admin',
                    'sales': 'admin',
                    'hr': 'read',
                    'payroll': 'no_access',
                    'accounting': 'read',
                    'inventory': 'read',
                    'purchasing': 'read',
                    'recruitment': 'no_access',
                    'dashboard': 'read',
                },
            },
            {
                'name': 'Ressources Humaines',
                'description': 'Équipe RH — RH, Paie et Recrutement',
                'permissions': {
                    'core': 'read',
                    'crm': 'read',
                    'sales': 'read',
                    'hr': 'admin',
                    'payroll': 'admin',
                    'accounting': 'read',
                    'inventory': 'read',
                    'purchasing': 'read',
                    'recruitment': 'admin',
                    'dashboard': 'read',
                },
            },
            {
                'name': 'Finance',
                'description': 'Équipe financière — Comptabilité et Dashboard',
                'permissions': {
                    'core': 'read',
                    'crm': 'read',
                    'sales': 'read',
                    'hr': 'read',
                    'payroll': 'read',
                    'accounting': 'admin',
                    'inventory': 'read',
                    'purchasing': 'read',
                    'recruitment': 'read',
                    'dashboard': 'admin',
                },
            },
            {
                'name': 'Logistique',
                'description': 'Gestion des stocks et achats',
                'permissions': {
                    'core': 'read',
                    'crm': 'no_access',
                    'sales': 'read',
                    'hr': 'no_access',
                    'payroll': 'no_access',
                    'accounting': 'no_access',
                    'inventory': 'admin',
                    'purchasing': 'admin',
                    'recruitment': 'no_access',
                    'dashboard': 'read',
                },
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
                    'inventory': 'read',
                    'purchasing': 'no_access',
                    'recruitment': 'read',
                    'dashboard': 'read',
                },
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
                    'is_active': True,
                },
            )

            if not created:
                role.description = role_data['description']
                role.group = group
                role.is_active = True
                role.save()

            status = 'créé' if created else 'mis à jour'
            self.stdout.write(f'Rôle {status}: {role.name}')

            # Créer ou mettre à jour les permissions de module
            for module, access_level in role_data['permissions'].items():
                ModulePermission.objects.update_or_create(
                    role=role,
                    module=module,
                    defaults={'access_level': access_level},
                )

        self.stdout.write(self.style.SUCCESS('Tous les rôles par défaut ont été créés'))
