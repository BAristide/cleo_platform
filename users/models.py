from django.db import models
from django.contrib.auth.models import User, Group, Permission
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.conf import settings
from django.contrib.contenttypes.models import ContentType

class UserProfile(models.Model):
    """Extension du modèle User de Django avec des champs additionnels."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(_("Téléphone"), max_length=20, blank=True)
    employee = models.OneToOneField('hr.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='user_profile')
    
    # Date of last password change
    password_changed_at = models.DateTimeField(_("Date de modification du mot de passe"), null=True, blank=True)
    
    # Status
    is_active = models.BooleanField(_("Actif"), default=True)

    class Meta:
        verbose_name = _("Profil utilisateur")
        verbose_name_plural = _("Profils utilisateurs")

    def __str__(self):
        return f"Profil de {self.user.username}"

class UserRole(models.Model):
    """Définition des rôles dans le système."""
    name = models.CharField(_("Nom"), max_length=100, unique=True)
    description = models.TextField(_("Description"), blank=True)
    is_active = models.BooleanField(_("Actif"), default=True)
    
    # Liaison avec les groupes Django pour les permissions
    group = models.OneToOneField(Group, on_delete=models.CASCADE, related_name='role')
    
    # Métadonnées
    created_at = models.DateTimeField(_("Créé le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Modifié le"), auto_now=True)

    class Meta:
        verbose_name = _("Rôle utilisateur")
        verbose_name_plural = _("Rôles utilisateurs")

    def __str__(self):
        return self.name

class ModulePermission(models.Model):
    """Permissions spécifiques par module."""
    MODULE_CHOICES = [
        ('core', _('Core')),
        ('crm', _('CRM')),
        ('sales', _('Ventes')),
        ('hr', _('Ressources Humaines')),
        ('payroll', _('Paie')),
        ('accounting', _('Comptabilité')),
    ]
    
    ACCESS_LEVELS = [
        ('no_access', _('Aucun accès')),
        ('read', _('Lecture seule')),
        ('create', _('Créer')),
        ('update', _('Modifier')),
        ('delete', _('Supprimer')),
        ('admin', _('Administration complète')),
    ]
    
    role = models.ForeignKey(UserRole, on_delete=models.CASCADE, related_name='module_permissions')
    module = models.CharField(_("Module"), max_length=20, choices=MODULE_CHOICES)
    access_level = models.CharField(_("Niveau d'accès"), max_length=20, choices=ACCESS_LEVELS, default='no_access')
    
    # Métadonnées
    created_at = models.DateTimeField(_("Créé le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Modifié le"), auto_now=True)

    class Meta:
        verbose_name = _("Permission de module")
        verbose_name_plural = _("Permissions de modules")
        unique_together = [['role', 'module']]

    def __str__(self):
        return f"{self.role.name} - {self.get_module_display()} ({self.get_access_level_display()})"

    def save(self, *args, **kwargs):
        """Override save to create or update Django permissions."""
        super().save(*args, **kwargs)
        
        # Mettre à jour les permissions Django correspondantes
        self._update_django_permissions()
    
    def _update_django_permissions(self):
        """Update Django permissions based on the access level."""
        # Récupérer le groupe associé au rôle
        group = self.role.group
        
        # Récupérer les permissions liées au module
        app_label = self.module
        
        # Déterminer les types de contenus associés au module
        content_types = ContentType.objects.filter(app_label=app_label)
        
        # Supprimer toutes les permissions existantes pour ce module et ce groupe
        for ct in content_types:
            permissions = Permission.objects.filter(content_type=ct)
            group.permissions.remove(*permissions)
        
        # Pas besoin d'ajouter des permissions pour 'no_access'
        if self.access_level == 'no_access':
            return
        
        # Ajouter les permissions selon le niveau d'accès
        for ct in content_types:
            permissions = []
            
            # Lecture
            if self.access_level in ['read', 'create', 'update', 'delete', 'admin']:
                view_perms = Permission.objects.filter(
                    content_type=ct, 
                    codename__startswith='view_'
                )
                permissions.extend(view_perms)
            
            # Création
            if self.access_level in ['create', 'update', 'delete', 'admin']:
                add_perms = Permission.objects.filter(
                    content_type=ct, 
                    codename__startswith='add_'
                )
                permissions.extend(add_perms)
            
            # Modification
            if self.access_level in ['update', 'delete', 'admin']:
                change_perms = Permission.objects.filter(
                    content_type=ct, 
                    codename__startswith='change_'
                )
                permissions.extend(change_perms)
            
            # Suppression
            if self.access_level in ['delete', 'admin']:
                delete_perms = Permission.objects.filter(
                    content_type=ct, 
                    codename__startswith='delete_'
                )
                permissions.extend(delete_perms)
            
            # Ajouter les permissions au groupe
            group.permissions.add(*permissions)

class ActivityLog(models.Model):
    """Journal d'activité des utilisateurs."""
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='activity_logs')
    action = models.CharField(_("Action"), max_length=100)
    module = models.CharField(_("Module"), max_length=20, choices=ModulePermission.MODULE_CHOICES)
    entity_type = models.CharField(_("Type d'entité"), max_length=100, blank=True)
    entity_id = models.PositiveIntegerField(_("ID de l'entité"), null=True, blank=True)
    details = models.TextField(_("Détails"), blank=True)
    ip_address = models.GenericIPAddressField(_("Adresse IP"), null=True, blank=True)
    timestamp = models.DateTimeField(_("Horodatage"), auto_now_add=True)

    class Meta:
        verbose_name = _("Journal d'activité")
        verbose_name_plural = _("Journaux d'activités")
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.username if self.user else 'Anonyme'} - {self.action} - {self.timestamp}"
