from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

from .models import Mission, TrainingPlan, Employee, EmployeeSkill, Availability, TrainingPlanItem, TrainingSkill
from .services.email_service import EmailService

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

@receiver(post_save, sender=Mission)
def mission_post_save(sender, instance, created, **kwargs):
    """
    Signal déclenché après la sauvegarde d'une mission.
    Envoie des notifications selon le statut de la mission.
    """
    # Si c'est une création, pas besoin d'envoyer des notifications
    if created:
        return
        
    # Récupérer les champs modifiés
    if hasattr(instance, 'get_dirty_fields') and 'status' in instance.get_dirty_fields():
        old_status = instance.get_dirty_fields()['status']
        
        # Si la mission vient d'être soumise, notifier le manager et les RH
        if old_status == 'draft' and instance.status == 'submitted':
            EmailService.send_mission_notification(instance, to_employee=True, to_manager=True, to_hr=True)
        
        # Si la mission vient d'être approuvée par le manager, notifier les RH
        elif old_status == 'submitted' and instance.status == 'approved_manager':
            EmailService.send_mission_notification(instance, to_employee=True, to_hr=True)
        
        # Si la mission vient d'être approuvée par les RH, notifier l'employé et le manager
        elif old_status == 'approved_manager' and instance.status == 'approved_hr':
            EmailService.send_mission_notification(instance, to_employee=True, to_manager=True)
        
        # Si la mission vient d'être approuvée par les finances, notifier l'employé
        elif old_status == 'approved_hr' and instance.status == 'approved_finance':
            EmailService.send_mission_notification(instance, to_employee=True, to_manager=True)

        # Si la mission vient d'être terminée (rapport soumis), notifier toutes les parties
        elif old_status == 'approved_finance' and instance.status == 'completed':
            EmailService.send_mission_notification(instance, to_employee=True, to_manager=True, to_hr=True)
        
        # Si la mission vient d'être rejetée, notifier l'employé et le demandeur
        elif instance.status == 'rejected':
            EmailService.send_mission_notification(instance, to_employee=True, to_manager=True)

@receiver(post_save, sender=TrainingPlan)
def training_plan_post_save(sender, instance, created, **kwargs):
    """
    Signal déclenché après la sauvegarde d'un plan de formation.
    Envoie des notifications selon le statut du plan.
    """
    # Si c'est une création, pas besoin d'envoyer des notifications
    if created:
        return
        
    # Récupérer les champs modifiés
    if hasattr(instance, 'get_dirty_fields') and 'status' in instance.get_dirty_fields():
        old_status = instance.get_dirty_fields()['status']
        
        # Si le plan vient d'être soumis, notifier le manager et les RH
        if old_status == 'draft' and instance.status == 'submitted':
            EmailService.send_training_plan_notification(instance, to_employee=True, to_manager=True, to_hr=True)
        
        # Si le plan vient d'être approuvé par le manager, notifier les RH
        elif old_status == 'submitted' and instance.status == 'approved_manager':
            EmailService.send_training_plan_notification(instance, to_employee=True, to_hr=True)
        
        # Si le plan vient d'être approuvé par les RH, notifier les finances
        elif old_status == 'approved_manager' and instance.status == 'approved_hr':
            EmailService.send_training_plan_notification(instance, to_employee=True, to_manager=True)
        
        # Si le plan vient d'être complètement approuvé, notifier l'employé
        elif old_status == 'approved_hr' and instance.status == 'approved_finance':
            EmailService.send_training_plan_notification(instance, to_employee=True, to_manager=True, to_hr=True)
        
        # Si le plan vient d'être rejeté, notifier l'employé
        elif instance.status == 'rejected':
            EmailService.send_training_plan_notification(instance, to_employee=True, to_manager=True, to_hr=True)

@receiver(post_save, sender=Employee)
def employee_post_save(sender, instance, created, **kwargs):
    """
    Signal déclenché après la sauvegarde d'un employé.
    Met à jour les relations hiérarchiques et crée un utilisateur si nécessaire.
    """
    if created:
        # Vérifiez si un utilisateur existe déjà avec cet email
        from django.contrib.auth.models import User
        
        # Si l'employé n'a pas d'utilisateur associé et qu'il a un email
        if not instance.user and instance.email:
            # Vérifier si un utilisateur avec cet email existe déjà
            try:
                user = User.objects.get(email=instance.email)
                # Associer l'utilisateur à l'employé
                instance.user = user
                instance.save(update_fields=['user'])
            except User.DoesNotExist:
                # On ne crée pas automatiquement un utilisateur pour éviter des problèmes de sécurité
                pass

@receiver(post_save, sender=EmployeeSkill)
def employeeskill_post_save(sender, instance, created, **kwargs):
    """
    Signal déclenché après la sauvegarde d'une compétence d'employé.
    Met à jour les plans de formation si nécessaire.
    """
    # Si c'est une création ou si le niveau a changé
    if created or (hasattr(instance, 'get_dirty_fields') and 'level' in instance.get_dirty_fields()):
        # Récupérer l'employé et son poste
        employee = instance.employee
        job_title = employee.job_title
        
        if not job_title:
            return
        
        # Vérifier s'il existe des exigences pour cette compétence pour ce poste
        from .models import JobSkillRequirement
        requirement = JobSkillRequirement.objects.filter(job_title=job_title, skill=instance.skill).first()
        
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
                    'objectives': f"Développement des compétences requises pour le poste de {job_title.name}"
                }
            )
            
            # Ne rien faire si le plan n'est plus en brouillon
            if plan.status != 'draft':
                return
            
            # Chercher des formations qui développent cette compétence
            training_skills = TrainingSkill.objects.filter(
                skill=instance.skill,
                level_provided__gte=requirement.required_level
            ).select_related('training_course')
            
            if training_skills.exists():
                # Prendre la première formation trouvée
                training_skill = training_skills.first()
                
                # Vérifier si cette formation est déjà dans le plan
                exists = TrainingPlanItem.objects.filter(
                    training_plan=plan,
                    training_course=training_skill.training_course
                ).exists()
                
                if not exists:
                    # Ajouter cette formation au plan
                    TrainingPlanItem.objects.create(
                        training_plan=plan,
                        training_course=training_skill.training_course,
                        planned_quarter=1,  # 1er trimestre par défaut
                        priority=3,  # Haute priorité
                        status='planned'
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
            if (instance.approved_by_manager != old_instance.approved_by_manager or 
                instance.approved_by_hr != old_instance.approved_by_hr):
                
                # Vérifier si toutes les approbations sont maintenant obtenues
                if instance.approved_by_manager and instance.approved_by_hr and instance.status == 'requested':
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
        training_skills = TrainingSkill.objects.filter(training_course=instance.training_course)
        
        for training_skill in training_skills:
            skill = training_skill.skill
            level_provided = training_skill.level_provided
            
            # Vérifier si l'employé possède déjà cette compétence
            employee_skill = EmployeeSkill.objects.filter(employee=employee, skill=skill).first()
            
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
                    notes=f"Compétence acquise suite à la formation '{instance.training_course.title}' terminée le {instance.completion_date}."
                )
