import logging
from datetime import date

from celery import shared_task
from django.conf import settings
from django.contrib.auth.models import User
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def _get_staff_users():
    """Retourne les utilisateurs actifs du staff."""
    return User.objects.filter(is_active=True, is_staff=True)


def _create_notification(user, level, title, message, module, link='', dedup_key=''):
    """Crée une notification si elle n'existe pas déjà (basé sur dedup_key)."""
    from .models import Notification

    if dedup_key:
        exists = Notification.objects.filter(
            user=user, dedup_key=dedup_key, is_read=False
        ).exists()
        if exists:
            return None

    return Notification.objects.create(
        user=user,
        level=level,
        title=title,
        message=message,
        module=module,
        link=link,
        dedup_key=dedup_key,
    )


def _send_alert_email(user, subject, message):
    """Envoie un email d'alerte si l'utilisateur a un email."""
    if not user.email:
        return False
    try:
        send_mail(
            subject=f'[Cleo ERP] {subject}',
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )
        return True
    except Exception as e:
        logger.error(f'Erreur envoi email à {user.email}: {e}')
        return False


@shared_task(name='notifications.tasks.check_overdue_invoices')
def check_overdue_invoices():
    """Détecte les factures clients échues non payées."""
    from sales.models import Invoice

    today = date.today()
    overdue = Invoice.objects.filter(
        due_date__lt=today,
        payment_status__in=['unpaid', 'partial'],
    ).select_related('company', 'currency')

    count = 0
    for inv in overdue:
        dedup_key = f'overdue_invoice_{inv.id}_{today.isoformat()}'
        title = f'Facture {inv.number} échue'
        remaining = inv.amount_due
        message = (
            f'La facture {inv.number} ({inv.company.name}) de {remaining} '
            f'{inv.currency.code} est échue depuis le {inv.due_date}.'
        )

        for user in _get_staff_users():
            notif = _create_notification(
                user=user,
                level='warning',
                title=title,
                message=message,
                module='sales',
                link=f'/sales/invoices/{inv.id}',
                dedup_key=dedup_key,
            )
            if notif:
                count += 1
                # Email si préférence activée
                try:
                    prefs = user.notification_preferences
                    if prefs.email_overdue_invoices:
                        _send_alert_email(user, title, message)
                except Exception:
                    pass  # Pas de préférences = pas d'email

    logger.info(
        f'check_overdue_invoices: {overdue.count()} factures, {count} notifications'
    )
    return {'overdue_invoices': overdue.count(), 'notifications_created': count}


@shared_task(name='notifications.tasks.check_stock_alerts')
def check_stock_alerts():
    """Détecte les produits dont le stock est sous le seuil d'alerte."""
    from inventory.models import StockLevel
    from sales.models import Product

    # Produits stockables avec seuil > 0
    products_with_threshold = Product.objects.filter(
        product_type='stockable',
        stock_alert_threshold__gt=0,
    )

    count = 0
    today = date.today()
    for product in products_with_threshold:
        # Somme du stock disponible sur tous les entrepôts
        levels = StockLevel.objects.filter(product=product)
        total_available = sum(
            (sl.quantity_on_hand - sl.quantity_reserved) for sl in levels
        )

        if total_available < product.stock_alert_threshold:
            dedup_key = f'stock_alert_{product.id}_{today.isoformat()}'
            title = f'Stock bas : {product.name}'
            message = (
                f'{product.reference} — {product.name} : '
                f'{total_available} disponible(s), seuil = {product.stock_alert_threshold}.'
            )

            for user in _get_staff_users():
                notif = _create_notification(
                    user=user,
                    level='critical',
                    title=title,
                    message=message,
                    module='inventory',
                    link='/inventory/stock-levels',
                    dedup_key=dedup_key,
                )
                if notif:
                    count += 1
                    try:
                        prefs = user.notification_preferences
                        if prefs.email_stock_alerts:
                            _send_alert_email(user, title, message)
                    except Exception:
                        pass

    logger.info(f'check_stock_alerts: {count} notifications')
    return {'notifications_created': count}


@shared_task(name='notifications.tasks.check_overdue_supplier_invoices')
def check_overdue_supplier_invoices():
    """Détecte les factures fournisseurs échues non payées."""
    from purchasing.models import SupplierInvoice

    today = date.today()
    overdue = SupplierInvoice.objects.filter(
        due_date__lt=today,
        state__in=['draft', 'confirmed'],
    ).select_related('supplier')

    count = 0
    for inv in overdue:
        dedup_key = f'overdue_supplier_inv_{inv.id}_{today.isoformat()}'
        title = f'Facture fournisseur {inv.number} échue'
        message = (
            f'La facture fournisseur {inv.number} ({inv.supplier.name}) '
            f'est échue depuis le {inv.due_date}.'
        )

        for user in _get_staff_users():
            notif = _create_notification(
                user=user,
                level='warning',
                title=title,
                message=message,
                module='purchasing',
                link=f'/purchasing/supplier-invoices/{inv.id}',
                dedup_key=dedup_key,
            )
            if notif:
                count += 1
                try:
                    prefs = user.notification_preferences
                    if prefs.email_overdue_purchases:
                        _send_alert_email(user, title, message)
                except Exception:
                    pass

    logger.info(
        f'check_overdue_supplier_invoices: {overdue.count()} factures, {count} notifications'
    )
    return {
        'overdue_supplier_invoices': overdue.count(),
        'notifications_created': count,
    }


@shared_task(name='notifications.tasks.check_overdue_purchase_orders')
def check_overdue_purchase_orders():
    """Détecte les bons de commande fournisseurs en retard de livraison."""
    from purchasing.models import PurchaseOrder

    today = date.today()
    overdue = PurchaseOrder.objects.filter(
        expected_delivery_date__lt=today,
        state__in=['confirmed', 'sent'],
    ).select_related('supplier')

    count = 0
    for po in overdue:
        dedup_key = f'overdue_po_{po.id}_{today.isoformat()}'
        title = f'BC {po.number} en retard'
        message = (
            f'Le bon de commande {po.number} ({po.supplier.name}) '
            f'attendu le {po.expected_delivery_date} est en retard.'
        )

        for user in _get_staff_users():
            notif = _create_notification(
                user=user,
                level='warning',
                title=title,
                message=message,
                module='purchasing',
                link=f'/purchasing/orders/{po.id}',
                dedup_key=dedup_key,
            )
            if notif:
                count += 1

    logger.info(
        f'check_overdue_purchase_orders: {overdue.count()} BC, {count} notifications'
    )
    return {'overdue_purchase_orders': overdue.count(), 'notifications_created': count}
