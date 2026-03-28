import logging

from django.contrib.auth.models import User
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

from .models import (
    Announcement,
    Availability,
    Employee,
    EmployeeSkill,
    Mission,
    TrainingPlanItem,
    TrainingSkill,
)

logger = logging.getLogger(__name__)


@receiver(pre_save, sender=Mission)
def mission_pre_save(sender, instance, **kwargs):
    """
    Signal déclenché avant la sauvegarde d'une mission.
    Met à jour le statut si le rapport est soumis.
    """
    # Vérifier si l'instance existe déjà en BD (pas une création)
    if instance.pk:
        try:
            # Récupérer l'état précédent
            old_instance = Mission.objects.get(pk=instance.pk)

            # Si le rapport vient d'être soumis
            if instance.report_submitted and not old_instance.report_submitted:
                # Et si la mission est approuvée par Finance
                if instance.status == 'approved_finance':
                    instance.status = 'completed'
        except Mission.DoesNotExist:
            pass


@receiver(post_save, sender=Employee)
def employee_post_save(sender, instance, created, **kwargs):
    """
    Après création d'un employé :
    - Crée automatiquement un compte Django User (username = email)
    - Associe UserProfile.employee ↔ Employee.user
    - Assigne le rôle "Employé"
    - Force le changement de mot de passe à la première connexion
    - Synchronise is_active si mise à jour
    """
    if created:
        if instance.email:
            # Vérifier que le user_id existant (s'il y en a un) correspond bien
            # à un User avec le même email — sinon forcer la création/liaison
            needs_user = True
            if instance.user_id:
                from django.contrib.auth import get_user_model as _gum

                _User = _gum()
                if _User.objects.filter(
                    pk=instance.user_id, email=instance.email
                ).exists():
                    needs_user = False
                else:
                    logger.warning(
                        f'Employé {instance.email} — user_id={instance.user_id} invalide '
                        f'(email non concordant ou user inexistant), réinitialisation.'
                    )
            if needs_user:
                _create_or_link_user(instance)
    else:
        # Synchronisation statut actif
        _sync_user_active_status(instance)


def _create_or_link_user(employee):
    """Crée ou rattache un User Django à un employé."""
    from django.utils.crypto import get_random_string

    from users.models import UserProfile

    # Vérifier si un User existe déjà avec cet email
    existing_user = User.objects.filter(email=employee.email).first()

    if existing_user:
        # Rattachement sans créer de doublon
        Employee.objects.filter(pk=employee.pk).update(user=existing_user)
        employee.user = existing_user
        _ensure_employee_role(existing_user)
        # Synchroniser UserProfile.employee
        try:
            existing_user.profile.employee = employee
            existing_user.profile.save(update_fields=['employee'])
        except Exception:
            pass
        return

    # Création du compte
    username = employee.email
    # Garantir l'unicité du username
    if User.objects.filter(username=username).exists():
        username = f'{employee.email}_{employee.employee_id}'

    password = get_random_string(16)
    user = User.objects.create_user(
        username=username,
        email=employee.email,
        password=password,
        first_name=employee.first_name,
        last_name=employee.last_name,
        is_active=employee.is_active,
    )

    # UserProfile
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.employee = employee
    profile.must_change_password = True
    profile.save(update_fields=['employee', 'must_change_password'])

    # Rattachement Employee.user
    Employee.objects.filter(pk=employee.pk).update(user=user)
    employee.user = user

    # Rôle Employé
    _ensure_employee_role(user)


def _ensure_employee_role(user):
    """Assigne le rôle 'Employé' si l'utilisateur n'a aucun groupe."""
    from users.models import UserRole

    if user.groups.exists():
        return
    try:
        role = UserRole.objects.get(name='Employé')
        user.groups.add(role.group)
    except UserRole.DoesNotExist:
        pass  # Rôle non encore créé via fixture


def _sync_user_active_status(employee):
    """Synchronise User.is_active avec Employee.is_active."""
    if employee.user:
        User = employee.user.__class__
        User.objects.filter(pk=employee.user.pk).update(is_active=employee.is_active)


@receiver(post_save, sender=Employee)
def announce_new_hire(sender, instance, created, **kwargs):
    """Cree une annonce automatique pour chaque nouvelle recrue."""
    if not created:
        return
    if not instance.department:
        return

    title = f'Bienvenue a {instance.full_name}'
    job_label = instance.job_title.name if instance.job_title else ''
    content = (
        f'{instance.full_name} rejoint le departement {instance.department.name}'
        + (f' en tant que {job_label}' if job_label else '')
        + '.'
    )

    try:
        Announcement.objects.create(
            title=title,
            content=content,
            target_audience='all',
            is_auto_generated=True,
        )
    except Exception:
        logger.warning(
            f'Impossible de creer l annonce de bienvenue pour {instance.full_name}'
        )


@receiver(post_save, sender=EmployeeSkill)
def employeeskill_post_save(sender, instance, created, **kwargs):
    """
    Signal déclenché après la sauvegarde d'une compétence d'employé.
    Met à jour les plans de formation si nécessaire.
    """
    # Si c'est une création ou si le niveau a changé
    if created or (
        hasattr(instance, 'get_dirty_fields') and 'level' in instance.get_dirty_fields()
    ):
        # Récupérer l'employé et son poste
        employee = instance.employee
        job_title = employee.job_title

        if not job_title:
            return

        # Vérifier s'il existe des exigences pour cette compétence pour ce poste
        from .models import JobSkillRequirement

        requirement = JobSkillRequirement.objects.filter(
            job_title=job_title, skill=instance.skill
        ).first()

        if requirement and instance.level < requirement.required_level:
            # La compétence est insuffisante, vérifier s'il existe un plan de formation actif
            current_year = timezone.now().year
            from .models import TrainingPlan, TrainingPlanItem, TrainingSkill

            # Trouver ou créer un plan de formation pour l'année en cours
            plan, created = TrainingPlan.objects.get_or_create(
                employee=employee,
                year=current_year,
                defaults={
                    'status': 'draft',
                    'objectives': f'Développement des compétences requises pour le poste de {job_title.name}',
                },
            )

            # Ne rien faire si le plan n'est plus en brouillon
            if plan.status != 'draft':
                return

            # Chercher des formations qui développent cette compétence
            training_skills = TrainingSkill.objects.filter(
                skill=instance.skill, level_provided__gte=requirement.required_level
            ).select_related('training_course')

            if training_skills.exists():
                # Prendre la première formation trouvée
                training_skill = training_skills.first()

                # Vérifier si cette formation est déjà dans le plan
                exists = TrainingPlanItem.objects.filter(
                    training_plan=plan, training_course=training_skill.training_course
                ).exists()

                if not exists:
                    # Ajouter cette formation au plan
                    TrainingPlanItem.objects.create(
                        training_plan=plan,
                        training_course=training_skill.training_course,
                        planned_quarter=1,  # 1er trimestre par défaut
                        priority=3,  # Haute priorité
                        status='planned',
                    )


@receiver(pre_save, sender=Availability)
def availability_pre_save(sender, instance, **kwargs):
    """
    Signal déclenché avant la sauvegarde d'une mise en disponibilité.
    Met à jour le statut lorsque toutes les approbations sont obtenues.
    """
    # Vérifier si l'instance existe déjà en BD (pas une création)
    if instance.pk:
        try:
            # Récupérer l'état précédent
            old_instance = Availability.objects.get(pk=instance.pk)

            # Si l'une des approbations vient de changer
            if (
                instance.approved_by_manager != old_instance.approved_by_manager
                or instance.approved_by_hr != old_instance.approved_by_hr
            ):
                # Vérifier si toutes les approbations sont maintenant obtenues
                if (
                    instance.approved_by_manager
                    and instance.approved_by_hr
                    and instance.status == 'requested'
                ):
                    instance.status = 'approved'

        except Availability.DoesNotExist:
            pass


@receiver(post_save, sender=TrainingPlanItem)
def training_completed_update_skills(sender, instance, **kwargs):
    """
    Signal déclenché après la sauvegarde d'un élément de plan de formation.
    Met à jour les compétences de l'employé lorsqu'une formation est terminée.
    """
    # Vérifier si l'élément a été marqué comme terminé
    if instance.status == 'completed':
        # Récupérer l'employé
        employee = instance.training_plan.employee
        if not employee:
            return

        # Récupérer les compétences développées par cette formation
        training_skills = TrainingSkill.objects.filter(
            training_course=instance.training_course
        )

        for training_skill in training_skills:
            skill = training_skill.skill
            level_provided = training_skill.level_provided

            # Vérifier si l'employé possède déjà cette compétence
            employee_skill = EmployeeSkill.objects.filter(
                employee=employee, skill=skill
            ).first()

            if employee_skill:
                # Si le niveau fourni par la formation est supérieur, mettre à jour
                if level_provided > employee_skill.level:
                    employee_skill.level = level_provided
                    employee_skill.notes += f"\nNiveau amélioré suite à la formation '{instance.training_course.title}' terminée le {instance.completion_date}."
                    employee_skill.save(update_fields=['level', 'notes'])
            else:
                # Si l'employé ne possède pas cette compétence, la créer
                employee_skill = EmployeeSkill.objects.create(
                    employee=employee,
                    skill=skill,
                    level=level_provided,
                    notes=f"Compétence acquise suite à la formation '{instance.training_course.title}' terminée le {instance.completion_date}.",
                )
