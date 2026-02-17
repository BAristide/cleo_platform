from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group, User

from .models import ActivityLog, ModulePermission, UserProfile, UserRole


# Définir l'admin pour le profil utilisateur en inline
class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Profil'


# Étendre l'admin User pour inclure le profil
class UserAdmin(BaseUserAdmin):
    inlines = (UserProfileInline,)
    list_display = (
        'username',
        'email',
        'first_name',
        'last_name',
        'is_staff',
        'get_employee',
        'get_roles',
    )

    def get_employee(self, obj):
        """Retourne l'employé associé au User."""
        try:
            if hasattr(obj, 'profile') and obj.profile.employee:
                return obj.profile.employee.full_name
        except Exception:
            pass
        return '-'

    get_employee.short_description = 'Employé'

    def get_roles(self, obj):
        """Retourne les rôles de l'utilisateur."""
        return ', '.join([group.name for group in obj.groups.all()])

    get_roles.short_description = 'Rôles'


# Réenregistrer User avec notre version personnalisée
admin.site.unregister(User)
admin.site.register(User, UserAdmin)


# Gestion des rôles utilisateur
class ModulePermissionInline(admin.TabularInline):
    model = ModulePermission
    extra = 1


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'is_active', 'created_at')
    search_fields = ('name', 'description')
    list_filter = ('is_active',)
    inlines = [ModulePermissionInline]

    def save_model(self, request, obj, form, change):
        """Crée ou récupère un groupe Django pour ce rôle."""
        # Si c'est une création, créer un groupe correspondant
        if not change:
            group, created = Group.objects.get_or_create(name=obj.name)
            obj.group = group
        super().save_model(request, obj, form, change)


# Journalisation des activités
@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'action',
        'module',
        'entity_type',
        'entity_id',
        'ip_address',
        'timestamp',
    )
    list_filter = ('module', 'action', 'timestamp')
    search_fields = ('user__username', 'action', 'details')
    readonly_fields = (
        'user',
        'action',
        'module',
        'entity_type',
        'entity_id',
        'details',
        'ip_address',
        'timestamp',
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
