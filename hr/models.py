from django.db import models
from django.contrib.auth.models import User
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from crm.models import Company  # Pour lier aux entreprises existantes

class Department(models.Model):
    """Départements ou directions de l'entreprise."""
    name = models.CharField(_("Nom"), max_length=100)
    code = models.CharField(_("Code"), max_length=20, blank=True)
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, 
                              related_name='child_departments', verbose_name=_("Département parent"))
    description = models.TextField(_("Description"), blank=True)
    
    # Métadonnées
    created_at = models.DateTimeField(_("Créé le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Modifié le"), auto_now=True)
    
    class Meta:
        verbose_name = _("Département")
        verbose_name_plural = _("Départements")
        ordering = ['name']
    
    def __str__(self):
        return self.name

class JobTitle(models.Model):
    """Postes ou fonctions dans l'entreprise."""
    name = models.CharField(_("Intitulé du poste"), max_length=100)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, 
                                   related_name='job_titles', verbose_name=_("Département"))
    description = models.TextField(_("Description"), blank=True)
    is_management = models.BooleanField(_("Poste de management"), default=False)
    
    # Métadonnées
    created_at = models.DateTimeField(_("Créé le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Modifié le"), auto_now=True)
    
    class Meta:
        verbose_name = _("Poste")
        verbose_name_plural = _("Postes")
        ordering = ['department__name', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.department.name})"

class Employee(models.Model):
    """Employés de l'entreprise."""
    # Lien avec l'utilisateur Django (facultatif - pour les utilisateurs du système)
    user = models.OneToOneField(User, on_delete=models.SET_NULL, null=True, blank=True, 
                                related_name='employee', verbose_name=_("Utilisateur"))
    
    # Informations personnelles
    first_name = models.CharField(_("Prénom"), max_length=50)
    last_name = models.CharField(_("Nom"), max_length=50)
    email = models.EmailField(_("Email"), unique=True)
    phone = models.CharField(_("Téléphone"), max_length=20, blank=True)
    address = models.TextField(_("Adresse"), blank=True)
    birth_date = models.DateField(_("Date de naissance"), null=True, blank=True)

    # Statut familial et enfants
    MARITAL_STATUS_CHOICES = [
        ('single', _('Célibataire')),
        ('married', _('Marié(e)')),
        ('divorced', _('Divorcé(e)')),
        ('widowed', _('Veuf/Veuve')),
    ]
    marital_status = models.CharField(_("Statut matrimonial"), max_length=20,
                                      choices=MARITAL_STATUS_CHOICES,
                                      default='single')
    dependent_children = models.PositiveSmallIntegerField(_("Enfants à charge"), default=0)

    
    # Informations professionnelles
    employee_id = models.CharField(_("Identifiant employé"), max_length=20, unique=True)
    hire_date = models.DateField(_("Date d'embauche"))
    job_title = models.ForeignKey(JobTitle, on_delete=models.PROTECT, 
                                 related_name='employees', verbose_name=_("Poste"))
    department = models.ForeignKey(Department, on_delete=models.PROTECT, 
                                  related_name='employees', verbose_name=_("Département"))
    
    # Hiérarchie
    manager = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, 
                               related_name='subordinates', verbose_name=_("Responsable hiérarchique (N+1)"))
    second_manager = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, 
                                     related_name='second_level_subordinates', verbose_name=_("N+2"))
    
    # Statut
    is_active = models.BooleanField(_("Actif"), default=True)
    
    # Rôles spécifiques
    is_hr = models.BooleanField(_("RH"), default=False, help_text=_("L'employé a un rôle RH"))
    is_finance = models.BooleanField(_("Finance"), default=False, help_text=_("L'employé a un rôle finance"))
    
    # Métadonnées
    created_at = models.DateTimeField(_("Créé le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Modifié le"), auto_now=True)
    
    class Meta:
        verbose_name = _("Employé")
        verbose_name_plural = _("Employés")
        ordering = ['last_name', 'first_name']
    
    def __str__(self):
        return f"{self.first_name} {self.last_name}"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    @property
    def is_manager(self):
        return self.subordinates.exists() or self.job_title.is_management

class Availability(models.Model):
    """Gestion des mises en disponibilité."""
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, 
                                related_name='availabilities', verbose_name=_("Employé"))
    
    STATUS_CHOICES = [
        ('requested', _('Demandée')),
        ('approved', _('Approuvée')),
        ('rejected', _('Rejetée')),
        ('cancelled', _('Annulée')),
    ]
    status = models.CharField(_("Statut"), max_length=20, choices=STATUS_CHOICES, default='requested')
    
    TYPE_CHOICES = [
        ('leave_of_absence', _('Congé sans solde')),
        ('sabbatical', _('Congé sabbatique')),
        ('parental', _('Congé parental')),
        ('other', _('Autre')),
    ]
    type = models.CharField(_("Type"), max_length=20, choices=TYPE_CHOICES)
    
    start_date = models.DateField(_("Date de début"))
    end_date = models.DateField(_("Date de fin"))
    reason = models.TextField(_("Motif"))
    
    # Approbations
    requested_by = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, 
                                   related_name='requested_availabilities', verbose_name=_("Demandé par"))
    approved_by_manager = models.BooleanField(_("Approuvé par N+1"), default=False)
    approved_by_hr = models.BooleanField(_("Approuvé par RH"), default=False)
    
    # Notes des approbateurs
    manager_notes = models.TextField(_("Notes du manager"), blank=True)
    hr_notes = models.TextField(_("Notes RH"), blank=True)
    
    # Métadonnées
    created_at = models.DateTimeField(_("Créé le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Modifié le"), auto_now=True)
    
    class Meta:
        verbose_name = _("Mise en disponibilité")
        verbose_name_plural = _("Mises en disponibilité")
        ordering = ['-start_date']
    
    def __str__(self):
        return f"{self.employee.full_name} - {self.get_type_display()} ({self.start_date} à {self.end_date})"

class Mission(models.Model):
    """Missions et ordres de mission."""
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, 
                                related_name='missions', verbose_name=_("Employé"))
    
    # Détails de la mission
    title = models.CharField(_("Titre"), max_length=200)
    description = models.TextField(_("Description"))
    location = models.CharField(_("Lieu"), max_length=200)
    
    # Dates
    start_date = models.DateField(_("Date de début"))
    end_date = models.DateField(_("Date de fin"))
    
    # Statut et approbations
    STATUS_CHOICES = [
        ('draft', _('Brouillon')),
        ('submitted', _('Soumise')),
        ('approved_manager', _('Approuvée par N+1')),
        ('approved_hr', _('Approuvée par RH')),
        ('approved_finance', _('Approuvée par Finance')),
        ('rejected', _('Rejetée')),
        ('cancelled', _('Annulée')),
        ('completed', _('Terminée')),
    ]
    status = models.CharField(_("Statut"), max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Qui a demandé - peut être l'employé lui-même ou son manager
    requested_by = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, 
                                   related_name='requested_missions', verbose_name=_("Demandé par"))
    
    # Approbations
    approved_by_manager = models.BooleanField(_("Approuvé par N+1"), default=False)
    approved_by_hr = models.BooleanField(_("Approuvé par RH"), default=False)
    approved_by_finance = models.BooleanField(_("Approuvé par Finance"), default=False)
    
    # Notes des approbateurs
    manager_notes = models.TextField(_("Notes du manager"), blank=True)
    hr_notes = models.TextField(_("Notes RH"), blank=True)
    finance_notes = models.TextField(_("Notes Finance"), blank=True)
    
    # Rapport de mission
    report = models.TextField(_("Rapport de mission"), blank=True)
    report_submitted = models.BooleanField(_("Rapport soumis"), default=False)
    report_date = models.DateField(_("Date du rapport"), null=True, blank=True)
    
    # Métadonnées
    created_at = models.DateTimeField(_("Créé le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Modifié le"), auto_now=True)
    
    # Documents PDF générés
    order_pdf = models.CharField(_("Ordre de mission PDF"), max_length=255, blank=True, null=True)
    
    class Meta:
        verbose_name = _("Mission")
        verbose_name_plural = _("Missions")
        ordering = ['-start_date']
    
    def __str__(self):
        return f"{self.title} - {self.employee.full_name} ({self.start_date} à {self.end_date})"
    
    def approve_manager(self, notes=''):
        self.approved_by_manager = True
        self.manager_notes = notes
        if self.status == 'submitted':
            self.status = 'approved_manager'
        self.save()
    
    def approve_hr(self, notes=''):
        self.approved_by_hr = True
        self.hr_notes = notes
        if self.status == 'approved_manager':
            self.status = 'approved_hr'
        self.save()
    
    def approve_finance(self, notes=''):
        self.approved_by_finance = True
        self.finance_notes = notes
        if self.status == 'approved_hr':
            self.status = 'approved_finance'
        self.save()
    
    def reject(self, notes='', rejected_by=''):
        self.status = 'rejected'
        if rejected_by == 'manager':
            self.manager_notes = notes
        elif rejected_by == 'hr':
            self.hr_notes = notes
        elif rejected_by == 'finance':
            self.finance_notes = notes
        self.save()

class Skill(models.Model):
    """Compétences pour la GPEC."""
    name = models.CharField(_("Nom"), max_length=100)
    description = models.TextField(_("Description"), blank=True)
    
    CATEGORY_CHOICES = [
        ('technical', _('Technique')),
        ('soft', _('Compétences douces')), 
        ('language', _('Langue')),
        ('certification', _('Certification')),
        ('other', _('Autre')),
    ]
    category = models.CharField(_("Catégorie"), max_length=20, choices=CATEGORY_CHOICES)
    
    # Métadonnées
    created_at = models.DateTimeField(_("Créé le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Modifié le"), auto_now=True)
    
    class Meta:
        verbose_name = _("Compétence")
        verbose_name_plural = _("Compétences")
        ordering = ['category', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"

class EmployeeSkill(models.Model):
    """Compétences d'un employé avec niveau."""
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, 
                                related_name='skills', verbose_name=_("Employé"))
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE, 
                             related_name='employee_skills', verbose_name=_("Compétence"))
    
    LEVEL_CHOICES = [
        (1, _('Débutant')),
        (2, _('Intermédiaire')),
        (3, _('Avancé')),
        (4, _('Expert')),
        (5, _('Maître')),
    ]
    level = models.PositiveSmallIntegerField(_("Niveau"), choices=LEVEL_CHOICES)
    
    # Certification ou preuve de compétence
    certification = models.CharField(_("Certification"), max_length=200, blank=True)
    certification_date = models.DateField(_("Date de certification"), null=True, blank=True)
    
    # Notes et commentaires
    notes = models.TextField(_("Notes"), blank=True)
    
    # Métadonnées
    created_at = models.DateTimeField(_("Créé le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Modifié le"), auto_now=True)
    
    class Meta:
        verbose_name = _("Compétence d'employé")
        verbose_name_plural = _("Compétences d'employés")
        ordering = ['employee__last_name', 'skill__name']
        # Chaque compétence ne peut être associée qu'une fois à un employé
        unique_together = [['employee', 'skill']]
    
    def __str__(self):
        return f"{self.employee.full_name} - {self.skill.name} (Niveau: {self.get_level_display()})"

class JobSkillRequirement(models.Model):
    """Compétences requises pour un poste (pour la GPEC)."""
    job_title = models.ForeignKey(JobTitle, on_delete=models.CASCADE, 
                                 related_name='skill_requirements', verbose_name=_("Poste"))
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE, 
                             related_name='job_requirements', verbose_name=_("Compétence"))
    
    LEVEL_CHOICES = [
        (1, _('Notions')),
        (2, _('Intermédiaire')),
        (3, _('Avancé')),
        (4, _('Expert')),
        (5, _('Maître')),
    ]
    required_level = models.PositiveSmallIntegerField(_("Niveau requis"), choices=LEVEL_CHOICES)
    
    IMPORTANCE_CHOICES = [
        ('optional', _('Optionnelle')),
        ('preferred', _('Préférée')),
        ('required', _('Requise')),
        ('critical', _('Critique')),
    ]
    importance = models.CharField(_("Importance"), max_length=20, choices=IMPORTANCE_CHOICES, default='required')
    
    # Notes et commentaires
    notes = models.TextField(_("Notes"), blank=True)
    
    # Métadonnées
    created_at = models.DateTimeField(_("Créé le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Modifié le"), auto_now=True)
    
    class Meta:
        verbose_name = _("Compétence requise pour un poste")
        verbose_name_plural = _("Compétences requises pour un poste")
        ordering = ['job_title__name', '-importance', 'skill__name']
        # Chaque compétence ne peut être exigée qu'une fois pour un poste
        unique_together = [['job_title', 'skill']]
    
    def __str__(self):
        return f"{self.job_title.name} - {self.skill.name} (Niveau: {self.get_required_level_display()})"

class TrainingCourse(models.Model):
    """Catalogue des formations disponibles."""
    title = models.CharField(_("Titre"), max_length=200)
    description = models.TextField(_("Description"))
    
    # Catégorisation
    CATEGORY_CHOICES = [
        ('technical', _('Technique')),
        ('soft_skills', _('Compétences douces')),
        ('language', _('Langue')),
        ('certification', _('Certification')),
        ('other', _('Autre')),
    ]
    category = models.CharField(_("Catégorie"), max_length=20, choices=CATEGORY_CHOICES)
    
    # Informations sur la formation
    duration_hours = models.PositiveIntegerField(_("Durée (heures)"))
    provider = models.CharField(_("Prestataire"), max_length=200, blank=True)
    location = models.CharField(_("Lieu"), max_length=200, blank=True)
    is_internal = models.BooleanField(_("Formation interne"), default=False)
    is_online = models.BooleanField(_("Formation en ligne"), default=False)
    cost = models.DecimalField(_("Coût"), max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Compétences développées par cette formation
    skills = models.ManyToManyField(Skill, through='TrainingSkill', related_name='training_courses',
                                   verbose_name=_("Compétences"))
    
    # Métadonnées
    created_at = models.DateTimeField(_("Créé le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Modifié le"), auto_now=True)
    
    class Meta:
        verbose_name = _("Formation")
        verbose_name_plural = _("Formations")
        ordering = ['category', 'title']
    
    def __str__(self):
        return f"{self.title} ({self.get_category_display()})"

class TrainingSkill(models.Model):
    """Relation entre formations et compétences développées."""
    training_course = models.ForeignKey(TrainingCourse, on_delete=models.CASCADE, 
                                       related_name='training_skills', verbose_name=_("Formation"))
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE, 
                             related_name='skill_trainings', verbose_name=_("Compétence"))
    
    # Niveau de compétence développé par cette formation
    LEVEL_CHOICES = [
        (1, _('Débutant')),
        (2, _('Intermédiaire')),
        (3, _('Avancé')),
        (4, _('Expert')),
        (5, _('Maître')),
    ]
    level_provided = models.PositiveSmallIntegerField(_("Niveau fourni"), choices=LEVEL_CHOICES)
    
    # Métadonnées
    created_at = models.DateTimeField(_("Créé le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Modifié le"), auto_now=True)
    
    class Meta:
        verbose_name = _("Compétence développée par formation")
        verbose_name_plural = _("Compétences développées par formations")
        unique_together = [['training_course', 'skill']]
    
    def __str__(self):
        return f"{self.training_course.title} - {self.skill.name} (Niveau: {self.get_level_provided_display()})"

class TrainingPlan(models.Model):
    """Plan de formation pour un employé."""
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, 
                                related_name='training_plans', verbose_name=_("Employé"))
    
    # Période du plan
    year = models.PositiveSmallIntegerField(_("Année"))
    
    # Statut du plan
    STATUS_CHOICES = [
        ('draft', _('Brouillon')),
        ('submitted', _('Soumis')),
        ('approved_manager', _('Approuvé par N+1')),
        ('approved_hr', _('Approuvé par RH')),
        ('approved_finance', _('Approuvé par Finance')),
        ('rejected', _('Rejeté')),
        ('completed', _('Terminé')),
    ]
    status = models.CharField(_("Statut"), max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Objectifs du plan
    objectives = models.TextField(_("Objectifs de développement"), blank=True)
    
    # Approbations
    approved_by_manager = models.BooleanField(_("Approuvé par N+1"), default=False)
    approved_by_hr = models.BooleanField(_("Approuvé par RH"), default=False)
    approved_by_finance = models.BooleanField(_("Approuvé par Finance"), default=False)
    
    # Notes des approbateurs
    manager_notes = models.TextField(_("Notes du manager"), blank=True)
    hr_notes = models.TextField(_("Notes RH"), blank=True)
    finance_notes = models.TextField(_("Notes Finance"), blank=True)
    
    # Métadonnées
    created_at = models.DateTimeField(_("Créé le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Modifié le"), auto_now=True)
    
    class Meta:
        verbose_name = _("Plan de formation")
        verbose_name_plural = _("Plans de formation")
        ordering = ['-year', 'employee__last_name']
        # Un employé ne peut avoir qu'un plan par année
        unique_together = [['employee', 'year']]
    
    def __str__(self):
        return f"Plan de formation {self.year} - {self.employee.full_name}"
    
    @property
    def total_training_cost(self):
        """Calcule le coût total des formations dans ce plan."""
        from django.db.models import Sum
        return self.training_items.aggregate(total=Sum('training_course__cost'))['total'] or 0

class TrainingPlanItem(models.Model):
    """Formations spécifiques dans un plan de formation."""
    training_plan = models.ForeignKey(TrainingPlan, on_delete=models.CASCADE, 
                                     related_name='training_items', verbose_name=_("Plan de formation"))
    training_course = models.ForeignKey(TrainingCourse, on_delete=models.CASCADE, 
                                       related_name='plan_items', verbose_name=_("Formation"))
    
    # Planification
    planned_quarter = models.PositiveSmallIntegerField(_("Trimestre prévu"), choices=[(1, 'Q1'), (2, 'Q2'), (3, 'Q3'), (4, 'Q4')])
    priority = models.PositiveSmallIntegerField(_("Priorité"), choices=[(1, 'Basse'), (2, 'Moyenne'), (3, 'Haute')], default=2)
    
    # Statut de réalisation
    STATUS_CHOICES = [
        ('planned', _('Planifiée')),
        ('scheduled', _('Programmée')),
        ('in_progress', _('En cours')),
        ('completed', _('Terminée')),
        ('cancelled', _('Annulée')),
    ]
    status = models.CharField(_("Statut"), max_length=20, choices=STATUS_CHOICES, default='planned')
    
    # Dates effectives
    scheduled_date = models.DateField(_("Date programmée"), null=True, blank=True)
    completion_date = models.DateField(_("Date de fin"), null=True, blank=True)
    
    # Évaluation
    RATING_CHOICES = [
        (1, _('Très insatisfait')),
        (2, _('Insatisfait')),
        (3, _('Neutre')),
        (4, _('Satisfait')),
        (5, _('Très satisfait')),
    ]
    employee_rating = models.PositiveSmallIntegerField(_("Évaluation par l'employé"), choices=RATING_CHOICES, null=True, blank=True)
    manager_rating = models.PositiveSmallIntegerField(_("Évaluation par le manager"), choices=RATING_CHOICES, null=True, blank=True)
    
    # Commentaires
    employee_comments = models.TextField(_("Commentaires de l'employé"), blank=True)
    manager_comments = models.TextField(_("Commentaires du manager"), blank=True)
    
    # Métadonnées
    created_at = models.DateTimeField(_("Créé le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Modifié le"), auto_now=True)
    
    class Meta:
        verbose_name = _("Formation dans le plan")
        verbose_name_plural = _("Formations dans le plan")
        ordering = ['training_plan__year', 'planned_quarter', '-priority']
    
    def __str__(self):
        return f"{self.training_plan.employee.full_name} - {self.training_course.title} (Q{self.planned_quarter}/{self.training_plan.year})"
