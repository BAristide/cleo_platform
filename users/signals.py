from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import ActivityLog, UserProfile


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Crée un profil utilisateur si un nouvel utilisateur est créé."""
    if created:
        UserProfile.objects.create(user=instance)

        # Enregistrer l'activité de création d'utilisateur
        ActivityLog.objects.create(
            user=instance,
            action='user_created',
            module='core',
            entity_type='User',
            entity_id=instance.id,
            details=f'Nouvel utilisateur créé: {instance.username}',
        )


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Met à jour le profil utilisateur lorsque l'utilisateur est modifié."""
    # Créer le profil s'il n'existe pas
    if not hasattr(instance, 'profile'):
        UserProfile.objects.create(user=instance)

    # Si le mot de passe a été modifié, mettre à jour la date
    if instance.profile and hasattr(instance, '_password') and instance._password:
        instance.profile.password_changed_at = timezone.now()

    # Sauvegarder le profil
    instance.profile.save()
