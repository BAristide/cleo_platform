from django.db.models.signals import post_save
from django.dispatch import receiver

from crm.models import SalesStage

from .models import Invoice, Order, Quote


@receiver(post_save, sender=Quote)
def update_opportunity_on_quote_change(sender, instance, **kwargs):
    """
    Met à jour le statut de l'opportunité lorsqu'un devis change.
    """
    if not instance.opportunity:
        return

    opportunity = instance.opportunity

    # Logique de mise à jour basée sur le statut du devis
    if instance.status == 'accepted':
        # Trouver une étape avancée dans le pipeline, comme "Négociation" ou similaire
        next_stage = (
            SalesStage.objects.filter(
                order__gt=opportunity.stage.order, is_won=False, is_lost=False
            )
            .order_by('order')
            .first()
        )

        if next_stage:
            opportunity.stage = next_stage
            opportunity.save(update_fields=['stage'])


@receiver(post_save, sender=Order)
def update_opportunity_on_order_change(sender, instance, **kwargs):
    """
    Met à jour le statut de l'opportunité lorsqu'une commande change.
    """
    if not hasattr(instance, 'opportunity') or not instance.opportunity:
        return

    opportunity = instance.opportunity

    # Logique de mise à jour basée sur le statut de la commande
    if instance.status == 'confirmed':
        # Trouver une étape encore plus avancée
        next_stage = (
            SalesStage.objects.filter(
                order__gt=opportunity.stage.order, is_won=False, is_lost=False
            )
            .order_by('order')
            .first()
        )

        if next_stage:
            opportunity.stage = next_stage
            opportunity.save(update_fields=['stage'])

    elif instance.status == 'delivered':
        # Si la livraison est effectuée, l'opportunité est presque gagnée
        won_stage = SalesStage.objects.filter(is_won=True).first()

        if won_stage:
            opportunity.stage = won_stage
            opportunity.save(update_fields=['stage'])


@receiver(post_save, sender=Invoice)
def update_opportunity_on_invoice_change(sender, instance, **kwargs):
    """
    Met à jour le statut de l'opportunité lorsqu'une facture change.
    """
    if not hasattr(instance, 'opportunity') or not instance.opportunity:
        return

    opportunity = instance.opportunity

    # Logique de mise à jour basée sur le statut de paiement de la facture
    if instance.payment_status == 'paid':
        # Si la facture est payée, l'opportunité est définitivement gagnée
        won_stage = SalesStage.objects.filter(is_won=True).first()

        if won_stage:
            opportunity.stage = won_stage
            # Mettre à jour également la date de clôture
            from django.utils import timezone

            opportunity.closed_date = timezone.now().date()
            opportunity.save(update_fields=['stage', 'closed_date'])
