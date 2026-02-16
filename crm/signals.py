from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import Opportunity, StageHistory


@receiver(pre_save, sender=Opportunity)
def handle_opportunity_stage_change(sender, instance, **kwargs):
    """
    Détecte les changements d'étape d'une opportunité et enregistre l'historique.
    Aussi, met à jour la date de clôture si l'opportunité est gagnée ou perdue.
    """
    # Si c'est une nouvelle opportunité, on ne fait rien
    if instance.pk is None:
        return
    
    # Récupérer l'état actuel de l'opportunité en base de données
    try:
        old_instance = Opportunity.objects.get(pk=instance.pk)
    except Opportunity.DoesNotExist:
        return
    
    # Si l'étape a changé
    if old_instance.stage_id != instance.stage_id:
        # Si la nouvelle étape est une étape finale (gagnée ou perdue),
        # on met à jour la date de clôture
        if instance.stage.is_won or instance.stage.is_lost:
            instance.closed_date = timezone.now()
    

@receiver(post_save, sender=Opportunity)
def create_stage_history(sender, instance, created, **kwargs):
    """
    Crée un enregistrement d'historique quand une opportunité change d'étape.
    """
    # Si c'est une nouvelle opportunité, on crée un premier historique
    if created:
        StageHistory.objects.create(
            opportunity=instance,
            from_stage=None,
            to_stage=instance.stage,
            changed_by=instance.created_by
        )
        return
    
    # Pour les modifications existantes, on vérifie si l'étape a changé
    try:
        latest_history = StageHistory.objects.filter(
            opportunity=instance
        ).order_by('-changed_at').first()
        
        # Si la dernière étape enregistrée est différente de l'étape actuelle,
        # on crée un nouvel enregistrement d'historique
        if latest_history and latest_history.to_stage_id != instance.stage_id:
            StageHistory.objects.create(
                opportunity=instance,
                from_stage=latest_history.to_stage,
                to_stage=instance.stage,
                # Note: on ne peut pas accéder directement à l'utilisateur qui a fait la modification ici,
                # cela devrait être géré dans la vue
                changed_by=None
            )
    except StageHistory.DoesNotExist:
        pass
