"""
Migration de données : ajout du module 'employee' dans les permissions
et mise à jour de la matrice des rôles par défaut.

Logique :
1. Ajouter employee: admin à TOUS les rôles existants (y compris personnalisés)
2. Ajuster les permissions spécifiques pour les 7 rôles par défaut
   (Employé, Ventes, Finance perdent l'accès à certains modules)
"""

from django.db import migrations


# Ajustements spécifiques aux rôles par défaut (hors employee, traité globalement)
ROLE_ADJUSTMENTS_FORWARD = {
    'Ventes': {
        'hr': 'no_access',
    },
    'Finance': {
        'hr': 'no_access',
    },
    'Employé': {
        'hr': 'no_access',
        'dashboard': 'no_access',
        'crm': 'no_access',
        'sales': 'no_access',
        'inventory': 'no_access',
        'recruitment': 'no_access',
        'payroll': 'no_access',
    },
}

# Valeurs à restaurer en cas de rollback
ROLE_ADJUSTMENTS_REVERSE = {
    'Ventes': {
        'hr': 'read',
    },
    'Finance': {
        'hr': 'read',
    },
    'Employé': {
        'hr': 'read',
        'dashboard': 'read',
        'crm': 'read',
        'sales': 'read',
        'inventory': 'read',
        'recruitment': 'read',
        'payroll': 'read',
    },
}


def forwards(apps, schema_editor):
    UserRole = apps.get_model('users', 'UserRole')
    ModulePermission = apps.get_model('users', 'ModulePermission')

    # 1. Ajouter employee: admin à TOUS les rôles existants
    for role in UserRole.objects.all():
        ModulePermission.objects.update_or_create(
            role=role,
            module='employee',
            defaults={'access_level': 'admin'},
        )

    # 2. Ajuster les permissions spécifiques des rôles par défaut
    for role_name, permissions in ROLE_ADJUSTMENTS_FORWARD.items():
        try:
            role = UserRole.objects.get(name=role_name)
        except UserRole.DoesNotExist:
            continue

        for module, access_level in permissions.items():
            ModulePermission.objects.update_or_create(
                role=role,
                module=module,
                defaults={'access_level': access_level},
            )


def backwards(apps, schema_editor):
    UserRole = apps.get_model('users', 'UserRole')
    ModulePermission = apps.get_model('users', 'ModulePermission')

    # 1. Supprimer toutes les entrées employee
    ModulePermission.objects.filter(module='employee').delete()

    # 2. Restaurer les anciennes valeurs des rôles par défaut
    for role_name, permissions in ROLE_ADJUSTMENTS_REVERSE.items():
        try:
            role = UserRole.objects.get(name=role_name)
        except UserRole.DoesNotExist:
            continue

        for module, access_level in permissions.items():
            ModulePermission.objects.update_or_create(
                role=role,
                module=module,
                defaults={'access_level': access_level},
            )


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0005_userprofile_must_change_password'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
