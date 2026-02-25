"""
Ajoute les ModulePermissions pour les modules inventory, purchasing,
recruitment et dashboard aux rôles existants.
"""

from django.db import migrations


def add_new_module_permissions(apps, schema_editor):
    """Ajoute les permissions des 4 nouveaux modules aux rôles existants."""
    UserRole = apps.get_model('users', 'UserRole')
    ModulePermission = apps.get_model('users', 'ModulePermission')

    # Mapping rôle → permissions des nouveaux modules
    role_permissions = {
        'Administrateur': {
            'inventory': 'admin',
            'purchasing': 'admin',
            'recruitment': 'admin',
            'dashboard': 'admin',
        },
        'Ventes': {
            'inventory': 'read',
            'purchasing': 'read',
            'recruitment': 'no_access',
            'dashboard': 'read',
        },
        'Ressources Humaines': {
            'inventory': 'read',
            'purchasing': 'read',
            'recruitment': 'admin',
            'dashboard': 'read',
        },
        'Finance': {
            'inventory': 'read',
            'purchasing': 'read',
            'recruitment': 'read',
            'dashboard': 'admin',
        },
        'Employé': {
            'inventory': 'read',
            'purchasing': 'no_access',
            'recruitment': 'read',
            'dashboard': 'read',
        },
    }

    for role_name, modules in role_permissions.items():
        try:
            role = UserRole.objects.get(name=role_name)
            for module, access_level in modules.items():
                ModulePermission.objects.update_or_create(
                    role=role,
                    module=module,
                    defaults={'access_level': access_level},
                )
        except UserRole.DoesNotExist:
            # Le rôle n'existe pas encore — sera créé par la commande
            pass


def reverse_migration(apps, schema_editor):
    """Supprime les permissions des 4 nouveaux modules."""
    ModulePermission = apps.get_model('users', 'ModulePermission')
    ModulePermission.objects.filter(
        module__in=['inventory', 'purchasing', 'recruitment', 'dashboard']
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0002_align_username_email'),
    ]

    operations = [
        migrations.RunPython(add_new_module_permissions, reverse_migration),
    ]
