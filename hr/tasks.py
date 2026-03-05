import logging
from datetime import date

from celery import shared_task
from django.utils.translation import gettext_lazy as _

logger = logging.getLogger(__name__)


@shared_task(name='hr.tasks.check_contract_expirations')
def check_contract_expirations():
    """
    Vérifie les échéances de contrats employés.
    - J-30 : alerte RH et managers
    - J-7  : alerte critique
    - J-0  : désactivation automatique de l'employé
    Pack-indépendant : basé sur contract_end_date (date), pas sur le nom du type.
    """
    from notifications.tasks import _create_notification
    from users.models import UserRole

    from .models import Employee

    today = date.today()
    notifications_created = 0
    employees_deactivated = 0

    # Employés actifs avec contrat à durée déterminée
    candidates = Employee.objects.filter(
        is_active=True,
        contract_end_date__isnull=False,
        contract_type__requires_end_date=True,
    ).select_related('contract_type', 'user', 'manager')

    # Récupérer les utilisateurs RH (is_staff ou rôle RH)
    try:
        hr_role = UserRole.objects.get(name__icontains='RH')
        hr_users = list(hr_role.group.user_set.filter(is_active=True))
    except UserRole.DoesNotExist:
        hr_users = []

    from django.contrib.auth.models import User

    staff_users = list(User.objects.filter(is_active=True, is_staff=True))
    # Union sans doublon
    target_users = list({u.pk: u for u in hr_users + staff_users}.values())

    for emp in candidates:
        days_left = (emp.contract_end_date - today).days

        if days_left == 30:
            level = 'warning'
            title = _('Contrat expirant dans 30 jours')
            message = _(
                f'Le contrat de {emp.full_name} ({emp.contract_type.name}) '
                f'expire le {emp.contract_end_date}.'
            )
        elif days_left == 7:
            level = 'critical'
            title = _('Contrat expirant dans 7 jours')
            message = _(
                f'Le contrat de {emp.full_name} ({emp.contract_type.name}) '
                f'expire le {emp.contract_end_date}. Action requise.'
            )
        elif days_left <= 0:
            # Désactivation automatique
            Employee.objects.filter(pk=emp.pk).update(is_active=False)
            if emp.user:
                emp.user.__class__.objects.filter(pk=emp.user.pk).update(
                    is_active=False
                )
            employees_deactivated += 1
            level = 'critical'
            title = _('Contrat expiré — Employé désactivé')
            message = _(
                f'Le contrat de {emp.full_name} a expiré le {emp.contract_end_date}. '
                f'Le compte a été désactivé automatiquement.'
            )
        else:
            continue

        dedup_key = f'contract_expiry_{emp.pk}_{today.isoformat()}'

        for user in target_users:
            notif = _create_notification(
                user=user,
                level=level,
                title=str(title),
                message=str(message),
                module='hr',
                link=f'/hr/employees/{emp.pk}',
                dedup_key=dedup_key,
            )
            if notif:
                notifications_created += 1

        # Notifier également le manager direct
        if emp.manager and emp.manager.user:
            mgr_dedup = f'{dedup_key}_mgr'
            notif = _create_notification(
                user=emp.manager.user,
                level=level,
                title=str(title),
                message=str(message),
                module='hr',
                link=f'/hr/employees/{emp.pk}',
                dedup_key=mgr_dedup,
            )
            if notif:
                notifications_created += 1

    logger.info(
        f'check_contract_expirations: {employees_deactivated} désactivés, '
        f'{notifications_created} notifications'
    )
    return {
        'employees_deactivated': employees_deactivated,
        'notifications_created': notifications_created,
    }
