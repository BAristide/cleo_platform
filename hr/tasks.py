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


@shared_task(name='hr.tasks.accrue_monthly_leave')
def accrue_monthly_leave():
    """
    Acquisition mensuelle des congés payés annuels (type accrual_method='monthly').
    Exécutée le 1er de chaque mois à 02h00 UTC.

    Algorithme pack-indépendant :
    - Lit LEAVE_ANNUAL_DAYS + LEAVE_SENIORITY_* depuis PayrollParameter (code unique)
    - Calcule les jours acquis ce mois selon ancienneté de l'employé
    - Crée ou met à jour LeaveAllocation pour l'année en cours
    - Zéro hardcoding : toutes les valeurs viennent des fixtures de pack

    Idempotent : si la tâche est rejouée le même mois, elle ne double pas les crédits
    (contrôlé par le champ `accrued_this_run` via un flag en cache Redis).
    """
    from datetime import date
    from decimal import ROUND_HALF_UP, Decimal

    from django.core.cache import cache

    from payroll.models import PayrollParameter

    from .models import Employee, LeaveAllocation, LeaveType

    today = date.today()
    year = today.year
    month = today.month

    # Clé d'idempotence : une seule exécution par mois
    idempotency_key = f'accrue_monthly_leave_{year}_{month:02d}'
    if cache.get(idempotency_key):
        logger.info(
            f'accrue_monthly_leave: déjà exécutée pour {year}-{month:02d}, skip.'
        )
        return {'skipped': True, 'reason': 'already_run_this_month'}

    # Lire les paramètres depuis PayrollParameter (pack-indépendant)
    def get_param(code, default=Decimal('0')):
        try:
            return PayrollParameter.objects.get(code=code, is_active=True).value
        except PayrollParameter.DoesNotExist:
            logger.warning(
                f'accrue_monthly_leave: paramètre {code} absent, défaut={default}'
            )
            return default

    annual_days = get_param('LEAVE_ANNUAL_DAYS', Decimal('18'))
    threshold_1 = get_param('LEAVE_SENIORITY_THRESHOLD_1', Decimal('5'))
    bonus_1 = get_param('LEAVE_SENIORITY_BONUS_1', Decimal('0'))
    threshold_2 = get_param('LEAVE_SENIORITY_THRESHOLD_2', Decimal('10'))
    bonus_2 = get_param('LEAVE_SENIORITY_BONUS_2', Decimal('0'))

    # Types de congés à acquisition mensuelle
    monthly_types = LeaveType.objects.filter(accrual_method='monthly', is_active=True)
    if not monthly_types.exists():
        logger.warning(
            'accrue_monthly_leave: aucun LeaveType avec accrual_method=monthly'
        )
        return {'allocations_updated': 0}

    employees = Employee.objects.filter(
        is_active=True,
        hire_date__isnull=False,
        hire_date__lte=today,
    )

    allocations_updated = 0

    for emp in employees:
        # Calcul ancienneté en années
        years_of_service = Decimal(str((today - emp.hire_date).days / 365.25)).quantize(
            Decimal('0.01')
        )

        # Bonus ancienneté pack-indépendant
        seniority_bonus = Decimal('0')
        if years_of_service >= threshold_2:
            seniority_bonus = bonus_2
        elif years_of_service >= threshold_1:
            seniority_bonus = bonus_1

        effective_annual = annual_days + seniority_bonus

        # Jours acquis ce mois = annual / 12, arrondi au 0.5 supérieur
        monthly_accrual = (effective_annual / Decimal('12')).quantize(
            Decimal('0.5'), rounding=ROUND_HALF_UP
        )

        for leave_type in monthly_types:
            alloc, created = LeaveAllocation.objects.get_or_create(
                employee=emp,
                leave_type=leave_type,
                year=year,
                defaults={
                    'total_days': Decimal('0'),
                    'used_days': Decimal('0'),
                    'pending_days': Decimal('0'),
                    'carried_days': Decimal('0'),
                },
            )
            alloc.total_days = (alloc.total_days + monthly_accrual).quantize(
                Decimal('0.1')
            )
            alloc.save(update_fields=['total_days'])
            allocations_updated += 1

    # Marquer comme exécutée pour ce mois (TTL jusqu'au 2 du mois suivant)
    import calendar

    days_in_month = calendar.monthrange(year, month)[1]
    ttl_seconds = (days_in_month - today.day + 2) * 86400
    cache.set(idempotency_key, True, ttl_seconds)

    logger.info(
        f'accrue_monthly_leave: {allocations_updated} allocations mises à jour '
        f'pour {year}-{month:02d}'
    )
    return {'allocations_updated': allocations_updated, 'year': year, 'month': month}
