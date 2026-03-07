from decimal import Decimal

from django.contrib.auth.models import User
from django.db import models
from django.utils.translation import gettext_lazy as _


class Department(models.Model):
    """Départements ou directions de l'entreprise."""

    name = models.CharField(_('Nom'), max_length=100)
    code = models.CharField(_('Code'), max_length=20, blank=True)
    parent = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='child_departments',
        verbose_name=_('Département parent'),
    )
    description = models.TextField(_('Description'), blank=True)

    # Métadonnées
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Modifié le'), auto_now=True)

    class Meta:
        verbose_name = _('Département')
        verbose_name_plural = _('Départements')
        ordering = ['name']

    def __str__(self):
        return self.name


class JobTitle(models.Model):
    """Postes ou fonctions dans l'entreprise."""

    name = models.CharField(_('Intitulé du poste'), max_length=100)
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name='job_titles',
        verbose_name=_('Département'),
    )
    description = models.TextField(_('Description'), blank=True)
    is_management = models.BooleanField(_('Poste de management'), default=False)

    # Métadonnées
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Modifié le'), auto_now=True)

    class Meta:
        verbose_name = _('Poste')
        verbose_name_plural = _('Postes')
        ordering = ['department__name', 'name']

    def __str__(self):
        return f'{self.name} ({self.department.name})'


class Employee(models.Model):
    """Employés de l'entreprise."""

    # Lien avec l'utilisateur Django (facultatif - pour les utilisateurs du système)
    user = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='employee',
        verbose_name=_('Utilisateur'),
    )

    # Informations personnelles
    first_name = models.CharField(_('Prénom'), max_length=50)
    last_name = models.CharField(_('Nom'), max_length=50)
    email = models.EmailField(_('Email'), unique=True)
    phone = models.CharField(_('Téléphone'), max_length=20, blank=True)
    address = models.TextField(_('Adresse'), blank=True)
    birth_date = models.DateField(_('Date de naissance'), null=True, blank=True)

    # Statut familial et enfants
    MARITAL_STATUS_CHOICES = [
        ('single', _('Célibataire')),
        ('married', _('Marié(e)')),
        ('divorced', _('Divorcé(e)')),
        ('widowed', _('Veuf/Veuve')),
    ]
    marital_status = models.CharField(
        _('Statut matrimonial'),
        max_length=20,
        choices=MARITAL_STATUS_CHOICES,
        default='single',
    )
    dependent_children = models.PositiveSmallIntegerField(
        _('Enfants à charge'), default=0
    )

    # Informations professionnelles
    employee_id = models.CharField(_('Identifiant employé'), max_length=20, unique=True)
    hire_date = models.DateField(_("Date d'embauche"))
    job_title = models.ForeignKey(
        JobTitle,
        on_delete=models.PROTECT,
        related_name='employees',
        verbose_name=_('Poste'),
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name='employees',
        verbose_name=_('Département'),
    )

    # Hiérarchie
    manager = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='subordinates',
        verbose_name=_('Responsable hiérarchique (N+1)'),
    )
    second_manager = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='second_level_subordinates',
        verbose_name=_('N+2'),
    )

    # Statut
    is_active = models.BooleanField(_('Actif'), default=True)

    # Informations contractuelles
    contract_type = models.ForeignKey(
        'payroll.ContractType',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='employees',
        verbose_name=_('Type de contrat'),
    )
    contract_start_date = models.DateField(
        _('Date de début de contrat'), null=True, blank=True
    )
    contract_end_date = models.DateField(
        _('Date de fin de contrat'),
        null=True,
        blank=True,
        help_text=_('Obligatoire pour les contrats à durée déterminée.'),
    )
    probation_end_date = models.DateField(
        _("Fin de période d'essai"), null=True, blank=True
    )

    # Rôles spécifiques
    is_hr = models.BooleanField(
        _('RH'), default=False, help_text=_("L'employé a un rôle RH")
    )
    is_finance = models.BooleanField(
        _('Finance'), default=False, help_text=_("L'employé a un rôle finance")
    )

    # Métadonnées
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Modifié le'), auto_now=True)

    class Meta:
        verbose_name = _('Employé')
        verbose_name_plural = _('Employés')
        ordering = ['last_name', 'first_name']

    def __str__(self):
        return f'{self.first_name} {self.last_name}'

    def clean(self):
        from django.core.exceptions import ValidationError

        if (
            self.contract_type
            and self.contract_type.requires_end_date
            and not self.contract_end_date
        ):
            raise ValidationError(
                _('La date de fin de contrat est obligatoire pour ce type de contrat.')
            )

    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'

    @property
    def is_manager(self):
        return self.subordinates.exists() or self.job_title.is_management


class Availability(models.Model):
    """Gestion des mises en disponibilité."""

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='availabilities',
        verbose_name=_('Employé'),
    )

    STATUS_CHOICES = [
        ('requested', _('Demandée')),
        ('approved', _('Approuvée')),
        ('rejected', _('Rejetée')),
        ('cancelled', _('Annulée')),
    ]
    status = models.CharField(
        _('Statut'), max_length=20, choices=STATUS_CHOICES, default='requested'
    )

    TYPE_CHOICES = [
        ('leave_of_absence', _('Congé sans solde')),
        ('sabbatical', _('Congé sabbatique')),
        ('parental', _('Congé parental')),
        ('other', _('Autre')),
    ]
    type = models.CharField(_('Type'), max_length=20, choices=TYPE_CHOICES)

    start_date = models.DateField(_('Date de début'))
    end_date = models.DateField(_('Date de fin'))
    reason = models.TextField(_('Motif'))

    # Approbations
    requested_by = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        related_name='requested_availabilities',
        verbose_name=_('Demandé par'),
    )
    approved_by_manager = models.BooleanField(_('Approuvé par N+1'), default=False)
    approved_by_hr = models.BooleanField(_('Approuvé par RH'), default=False)

    # Notes des approbateurs
    manager_notes = models.TextField(_('Notes du manager'), blank=True)
    hr_notes = models.TextField(_('Notes RH'), blank=True)

    # Métadonnées
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Modifié le'), auto_now=True)

    class Meta:
        verbose_name = _('Mise en disponibilité')
        verbose_name_plural = _('Mises en disponibilité')
        ordering = ['-start_date']

    def __str__(self):
        return f'{self.employee.full_name} - {self.get_type_display()} ({self.start_date} à {self.end_date})'


class Mission(models.Model):
    """Missions et ordres de mission."""

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='missions',
        verbose_name=_('Employé'),
    )

    # Détails de la mission
    title = models.CharField(_('Titre'), max_length=200)
    description = models.TextField(_('Description'))
    location = models.CharField(_('Lieu'), max_length=200)

    # Dates
    start_date = models.DateField(_('Date de début'))
    end_date = models.DateField(_('Date de fin'))

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
    status = models.CharField(
        _('Statut'), max_length=20, choices=STATUS_CHOICES, default='draft'
    )

    # Qui a demandé - peut être l'employé lui-même ou son manager
    requested_by = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        related_name='requested_missions',
        verbose_name=_('Demandé par'),
    )

    # Approbations
    approved_by_manager = models.BooleanField(_('Approuvé par N+1'), default=False)
    approved_by_hr = models.BooleanField(_('Approuvé par RH'), default=False)
    approved_by_finance = models.BooleanField(_('Approuvé par Finance'), default=False)

    # Notes des approbateurs
    manager_notes = models.TextField(_('Notes du manager'), blank=True)
    hr_notes = models.TextField(_('Notes RH'), blank=True)
    finance_notes = models.TextField(_('Notes Finance'), blank=True)

    # Rapport de mission
    report = models.TextField(_('Rapport de mission'), blank=True)
    report_submitted = models.BooleanField(_('Rapport soumis'), default=False)
    report_date = models.DateField(_('Date du rapport'), null=True, blank=True)

    # Métadonnées
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Modifié le'), auto_now=True)

    # Documents PDF générés
    order_pdf = models.CharField(
        _('Ordre de mission PDF'), max_length=255, blank=True, null=True
    )

    class Meta:
        verbose_name = _('Mission')
        verbose_name_plural = _('Missions')
        ordering = ['-start_date']

    def __str__(self):
        return f'{self.title} - {self.employee.full_name} ({self.start_date} à {self.end_date})'

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

    name = models.CharField(_('Nom'), max_length=100)
    description = models.TextField(_('Description'), blank=True)

    CATEGORY_CHOICES = [
        ('technical', _('Technique')),
        ('soft', _('Compétences douces')),
        ('language', _('Langue')),
        ('certification', _('Certification')),
        ('other', _('Autre')),
    ]
    category = models.CharField(_('Catégorie'), max_length=20, choices=CATEGORY_CHOICES)

    # Métadonnées
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Modifié le'), auto_now=True)

    class Meta:
        verbose_name = _('Compétence')
        verbose_name_plural = _('Compétences')
        ordering = ['category', 'name']

    def __str__(self):
        return f'{self.name} ({self.get_category_display()})'


class EmployeeSkill(models.Model):
    """Compétences d'un employé avec niveau."""

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='skills',
        verbose_name=_('Employé'),
    )
    skill = models.ForeignKey(
        Skill,
        on_delete=models.CASCADE,
        related_name='employee_skills',
        verbose_name=_('Compétence'),
    )

    LEVEL_CHOICES = [
        (1, _('Débutant')),
        (2, _('Intermédiaire')),
        (3, _('Avancé')),
        (4, _('Expert')),
        (5, _('Maître')),
    ]
    level = models.PositiveSmallIntegerField(_('Niveau'), choices=LEVEL_CHOICES)

    # Certification ou preuve de compétence
    certification = models.CharField(_('Certification'), max_length=200, blank=True)
    certification_date = models.DateField(
        _('Date de certification'), null=True, blank=True
    )

    # Notes et commentaires
    notes = models.TextField(_('Notes'), blank=True)

    # Métadonnées
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Modifié le'), auto_now=True)

    class Meta:
        verbose_name = _("Compétence d'employé")
        verbose_name_plural = _("Compétences d'employés")
        ordering = ['employee__last_name', 'skill__name']
        # Chaque compétence ne peut être associée qu'une fois à un employé
        unique_together = [['employee', 'skill']]

    def __str__(self):
        return f'{self.employee.full_name} - {self.skill.name} (Niveau: {self.get_level_display()})'


class JobSkillRequirement(models.Model):
    """Compétences requises pour un poste (pour la GPEC)."""

    job_title = models.ForeignKey(
        JobTitle,
        on_delete=models.CASCADE,
        related_name='skill_requirements',
        verbose_name=_('Poste'),
    )
    skill = models.ForeignKey(
        Skill,
        on_delete=models.CASCADE,
        related_name='job_requirements',
        verbose_name=_('Compétence'),
    )

    LEVEL_CHOICES = [
        (1, _('Notions')),
        (2, _('Intermédiaire')),
        (3, _('Avancé')),
        (4, _('Expert')),
        (5, _('Maître')),
    ]
    required_level = models.PositiveSmallIntegerField(
        _('Niveau requis'), choices=LEVEL_CHOICES
    )

    IMPORTANCE_CHOICES = [
        ('optional', _('Optionnelle')),
        ('preferred', _('Préférée')),
        ('required', _('Requise')),
        ('critical', _('Critique')),
    ]
    importance = models.CharField(
        _('Importance'), max_length=20, choices=IMPORTANCE_CHOICES, default='required'
    )

    # Notes et commentaires
    notes = models.TextField(_('Notes'), blank=True)

    # Métadonnées
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Modifié le'), auto_now=True)

    class Meta:
        verbose_name = _('Compétence requise pour un poste')
        verbose_name_plural = _('Compétences requises pour un poste')
        ordering = ['job_title__name', '-importance', 'skill__name']
        # Chaque compétence ne peut être exigée qu'une fois pour un poste
        unique_together = [['job_title', 'skill']]

    def __str__(self):
        return f'{self.job_title.name} - {self.skill.name} (Niveau: {self.get_required_level_display()})'


class TrainingCourse(models.Model):
    """Catalogue des formations disponibles."""

    title = models.CharField(_('Titre'), max_length=200)
    description = models.TextField(_('Description'))

    # Catégorisation
    CATEGORY_CHOICES = [
        ('technical', _('Technique')),
        ('soft_skills', _('Compétences douces')),
        ('language', _('Langue')),
        ('certification', _('Certification')),
        ('other', _('Autre')),
    ]
    category = models.CharField(_('Catégorie'), max_length=20, choices=CATEGORY_CHOICES)

    # Informations sur la formation
    duration_hours = models.PositiveIntegerField(_('Durée (heures)'))
    provider = models.CharField(_('Prestataire'), max_length=200, blank=True)
    location = models.CharField(_('Lieu'), max_length=200, blank=True)
    is_internal = models.BooleanField(_('Formation interne'), default=False)
    is_online = models.BooleanField(_('Formation en ligne'), default=False)
    cost = models.DecimalField(
        _('Coût'), max_digits=10, decimal_places=2, null=True, blank=True
    )

    # Compétences développées par cette formation
    skills = models.ManyToManyField(
        Skill,
        through='TrainingSkill',
        related_name='training_courses',
        verbose_name=_('Compétences'),
    )

    # Métadonnées
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Modifié le'), auto_now=True)

    class Meta:
        verbose_name = _('Formation')
        verbose_name_plural = _('Formations')
        ordering = ['category', 'title']

    def __str__(self):
        return f'{self.title} ({self.get_category_display()})'


class TrainingSkill(models.Model):
    """Relation entre formations et compétences développées."""

    training_course = models.ForeignKey(
        TrainingCourse,
        on_delete=models.CASCADE,
        related_name='training_skills',
        verbose_name=_('Formation'),
    )
    skill = models.ForeignKey(
        Skill,
        on_delete=models.CASCADE,
        related_name='skill_trainings',
        verbose_name=_('Compétence'),
    )

    # Niveau de compétence développé par cette formation
    LEVEL_CHOICES = [
        (1, _('Débutant')),
        (2, _('Intermédiaire')),
        (3, _('Avancé')),
        (4, _('Expert')),
        (5, _('Maître')),
    ]
    level_provided = models.PositiveSmallIntegerField(
        _('Niveau fourni'), choices=LEVEL_CHOICES
    )

    # Métadonnées
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Modifié le'), auto_now=True)

    class Meta:
        verbose_name = _('Compétence développée par formation')
        verbose_name_plural = _('Compétences développées par formations')
        unique_together = [['training_course', 'skill']]

    def __str__(self):
        return f'{self.training_course.title} - {self.skill.name} (Niveau: {self.get_level_provided_display()})'


class TrainingPlan(models.Model):
    """Plan de formation pour un employé."""

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='training_plans',
        verbose_name=_('Employé'),
    )

    # Période du plan
    year = models.PositiveSmallIntegerField(_('Année'))

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
    status = models.CharField(
        _('Statut'), max_length=20, choices=STATUS_CHOICES, default='draft'
    )

    # Objectifs du plan
    objectives = models.TextField(_('Objectifs de développement'), blank=True)

    # Approbations
    approved_by_manager = models.BooleanField(_('Approuvé par N+1'), default=False)
    approved_by_hr = models.BooleanField(_('Approuvé par RH'), default=False)
    approved_by_finance = models.BooleanField(_('Approuvé par Finance'), default=False)

    # Notes des approbateurs
    manager_notes = models.TextField(_('Notes du manager'), blank=True)
    hr_notes = models.TextField(_('Notes RH'), blank=True)
    finance_notes = models.TextField(_('Notes Finance'), blank=True)

    # Métadonnées
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Modifié le'), auto_now=True)

    class Meta:
        verbose_name = _('Plan de formation')
        verbose_name_plural = _('Plans de formation')
        ordering = ['-year', 'employee__last_name']
        # Un employé ne peut avoir qu'un plan par année
        unique_together = [['employee', 'year']]

    def __str__(self):
        return f'Plan de formation {self.year} - {self.employee.full_name}'

    @property
    def total_training_cost(self):
        """Calcule le coût total des formations dans ce plan."""
        from django.db.models import Sum

        return (
            self.training_items.aggregate(total=Sum('training_course__cost'))['total']
            or 0
        )


class TrainingPlanItem(models.Model):
    """Formations spécifiques dans un plan de formation."""

    training_plan = models.ForeignKey(
        TrainingPlan,
        on_delete=models.CASCADE,
        related_name='training_items',
        verbose_name=_('Plan de formation'),
    )
    training_course = models.ForeignKey(
        TrainingCourse,
        on_delete=models.CASCADE,
        related_name='plan_items',
        verbose_name=_('Formation'),
    )

    # Planification
    planned_quarter = models.PositiveSmallIntegerField(
        _('Trimestre prévu'), choices=[(1, 'Q1'), (2, 'Q2'), (3, 'Q3'), (4, 'Q4')]
    )
    priority = models.PositiveSmallIntegerField(
        _('Priorité'), choices=[(1, 'Basse'), (2, 'Moyenne'), (3, 'Haute')], default=2
    )

    # Statut de réalisation
    STATUS_CHOICES = [
        ('planned', _('Planifiée')),
        ('scheduled', _('Programmée')),
        ('in_progress', _('En cours')),
        ('completed', _('Terminée')),
        ('cancelled', _('Annulée')),
    ]
    status = models.CharField(
        _('Statut'), max_length=20, choices=STATUS_CHOICES, default='planned'
    )

    # Dates effectives
    scheduled_date = models.DateField(_('Date programmée'), null=True, blank=True)
    completion_date = models.DateField(_('Date de fin'), null=True, blank=True)

    # Évaluation
    RATING_CHOICES = [
        (1, _('Très insatisfait')),
        (2, _('Insatisfait')),
        (3, _('Neutre')),
        (4, _('Satisfait')),
        (5, _('Très satisfait')),
    ]
    employee_rating = models.PositiveSmallIntegerField(
        _("Évaluation par l'employé"), choices=RATING_CHOICES, null=True, blank=True
    )
    manager_rating = models.PositiveSmallIntegerField(
        _('Évaluation par le manager'), choices=RATING_CHOICES, null=True, blank=True
    )

    # Commentaires
    employee_comments = models.TextField(_("Commentaires de l'employé"), blank=True)
    manager_comments = models.TextField(_('Commentaires du manager'), blank=True)

    # Métadonnées
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Modifié le'), auto_now=True)

    class Meta:
        verbose_name = _('Formation dans le plan')
        verbose_name_plural = _('Formations dans le plan')
        ordering = ['training_plan__year', 'planned_quarter', '-priority']

    def __str__(self):
        return f'{self.training_plan.employee.full_name} - {self.training_course.title} (Q{self.planned_quarter}/{self.training_plan.year})'


class Announcement(models.Model):
    """Annonces internes de l'entreprise."""

    TARGET_CHOICES = [
        ('all', _('Tous les employes')),
        ('department', _('Par departement')),
        ('individual', _('Individuel')),
    ]

    title = models.CharField(_('Titre'), max_length=200)
    content = models.TextField(_('Contenu'))
    author = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='announcements',
        verbose_name=_('Auteur'),
    )
    target_audience = models.CharField(
        _('Audience cible'),
        max_length=20,
        choices=TARGET_CHOICES,
        default='all',
    )
    target_departments = models.ManyToManyField(
        Department,
        blank=True,
        related_name='announcements',
        verbose_name=_('Departements cibles'),
    )
    target_employees = models.ManyToManyField(
        Employee,
        blank=True,
        related_name='targeted_announcements',
        verbose_name=_('Employes cibles'),
    )
    is_pinned = models.BooleanField(_('Epingle'), default=False)
    is_auto_generated = models.BooleanField(_('Genere automatiquement'), default=False)
    expires_at = models.DateTimeField(_('Expire le'), null=True, blank=True)

    created_at = models.DateTimeField(_('Cree le'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Modifie le'), auto_now=True)

    class Meta:
        verbose_name = _('Annonce')
        verbose_name_plural = _('Annonces')
        ordering = ['-is_pinned', '-created_at']

    def __str__(self):
        return self.title


class WorkCertificateRequest(models.Model):
    """Demandes d'attestation de travail."""

    STATUS_CHOICES = [
        ('pending', _('En attente')),
        ('approved', _('Approuvee')),
        ('rejected', _('Rejetee')),
    ]

    PURPOSE_CHOICES = [
        ('bank', _('Dossier bancaire')),
        ('visa', _('Demande de visa')),
        ('rental', _('Dossier de location')),
        ('other', _('Autre')),
    ]

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='certificate_requests',
        verbose_name=_('Employe'),
    )
    purpose = models.CharField(
        _('Objet'), max_length=20, choices=PURPOSE_CHOICES, default='other'
    )
    purpose_detail = models.TextField(_('Precisions'), blank=True)
    status = models.CharField(
        _('Statut'), max_length=20, choices=STATUS_CHOICES, default='pending'
    )
    hr_notes = models.TextField(_('Notes RH'), blank=True)
    pdf_file = models.CharField(_('Fichier PDF'), max_length=255, blank=True, null=True)

    created_at = models.DateTimeField(_('Demandee le'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Modifiee le'), auto_now=True)

    class Meta:
        verbose_name = _('Demande d attestation de travail')
        verbose_name_plural = _('Demandes d attestations de travail')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.employee.full_name} — {self.get_purpose_display()} ({self.get_status_display()})'


class Complaint(models.Model):
    """Doleances et conflits internes."""

    CATEGORY_CHOICES = [
        ('harassment', _('Harcelement')),
        ('discrimination', _('Discrimination')),
        ('workload', _('Charge de travail')),
        ('management', _('Comportement managerial')),
        ('other', _('Autre')),
    ]
    STATUS_CHOICES = [
        ('open', _('Ouverte')),
        ('investigating', _('En cours d investigation')),
        ('resolved', _('Resolue')),
        ('closed', _('Fermee')),
    ]

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='complaints',
        verbose_name=_('Employe'),
    )
    category = models.CharField(_('Categorie'), max_length=20, choices=CATEGORY_CHOICES)
    description = models.TextField(_('Description'))
    is_anonymous = models.BooleanField(_('Anonyme'), default=False)
    status = models.CharField(
        _('Statut'), max_length=20, choices=STATUS_CHOICES, default='open'
    )
    assigned_to = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_complaints',
        verbose_name=_('Assigne a (RH)'),
    )
    hr_notes = models.TextField(_('Notes RH (prive)'), blank=True)
    resolution_notes = models.TextField(_('Notes de resolution'), blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Doleance')
        verbose_name_plural = _('Doleances')
        ordering = ['-created_at']

    def __str__(self):
        name = 'Anonyme' if self.is_anonymous else self.employee.full_name
        return f'Doleance — {name} ({self.get_status_display()})'


class RewardType(models.Model):
    """Types de recompenses configurables."""

    name = models.CharField(_('Nom'), max_length=100)
    description = models.TextField(_('Description'), blank=True)
    icon = models.CharField(
        _('Icone'),
        max_length=50,
        blank=True,
        help_text=_('Ex: TrophyOutlined, StarOutlined'),
    )
    is_active = models.BooleanField(_('Actif'), default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('Type de recompense')
        verbose_name_plural = _('Types de recompenses')
        ordering = ['name']

    def __str__(self):
        return self.name


class Reward(models.Model):
    """Recompenses attribuees aux employes."""

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='rewards',
        verbose_name=_('Employe'),
    )
    reward_type = models.ForeignKey(
        RewardType,
        on_delete=models.PROTECT,
        related_name='rewards',
        verbose_name=_('Type de recompense'),
    )
    awarded_date = models.DateField(_('Date d attribution'))
    awarded_by = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rewards_given',
        verbose_name=_('Attribue par'),
    )
    description = models.TextField(_('Commentaire'), blank=True)
    is_public = models.BooleanField(_('Visible sur le reward board'), default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('Recompense')
        verbose_name_plural = _('Recompenses')
        ordering = ['-awarded_date']

    def __str__(self):
        return (
            f'{self.reward_type.name} → {self.employee.full_name} ({self.awarded_date})'
        )


# ── Congés ────────────────────────────────────────────────────────────────────


class LeaveType(models.Model):
    """
    Types de congés configurables — chargés via fixtures de pack dans _load_locale_pack().
    Identifiés par leur champ `code` (stable entre resets).
    Zéro hardcoding de durée légale ou de règle nationale dans ce modèle.
    Les durées légales vivent dans PayrollParameter.
    """

    name = models.CharField(_('Nom'), max_length=100)
    code = models.CharField(
        _('Code'),
        max_length=20,
        unique=True,
        help_text=_(
            'Identifiant stable : ANNUAL, SICK, MATERNITY, PATERNITY, UNPAID, BEREAVEMENT.'
        ),
    )
    description = models.TextField(_('Description'), blank=True)

    is_paid = models.BooleanField(
        _('Congé payé'),
        default=True,
        help_text=_(
            'Si False, les jours sont déduits du brut dans SalaryCalculator via MONTHLY_HOURS du pack.'
        ),
    )

    ACCRUAL_CHOICES = [
        ('monthly', _('Acquisition mensuelle automatique')),
        ('annual', _('Crédit annuel unique au 1er janvier')),
        ('none', _('Sans acquisition — contingent fixe par paramètre')),
    ]
    accrual_method = models.CharField(
        _("Mode d'acquisition"),
        max_length=20,
        choices=ACCRUAL_CHOICES,
        default='monthly',
    )

    max_days_carry = models.PositiveSmallIntegerField(
        _('Report maximum (jours)'),
        default=0,
        help_text=_(
            'Surchargé par LEAVE_MAX_CARRY_DAYS du pack lors du report annuel.'
        ),
    )
    requires_document = models.BooleanField(
        _('Justificatif obligatoire'), default=False
    )
    is_active = models.BooleanField(_('Actif'), default=True)

    color = models.CharField(
        _('Couleur (hex)'),
        max_length=7,
        default='#1890ff',
        help_text=_('Affichée dans le calendrier équipe.'),
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('Type de congé')
        verbose_name_plural = _('Types de congés')
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.code})'


class LeaveAllocation(models.Model):
    """Solde de congés par employé, type et année."""

    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name='leave_allocations'
    )
    leave_type = models.ForeignKey(
        LeaveType, on_delete=models.PROTECT, related_name='allocations'
    )
    year = models.PositiveSmallIntegerField(_('Année'))

    total_days = models.DecimalField(
        _('Jours alloués'), max_digits=6, decimal_places=1, default=0
    )
    used_days = models.DecimalField(
        _('Jours utilisés'), max_digits=6, decimal_places=1, default=0
    )
    pending_days = models.DecimalField(
        _('Jours en attente'), max_digits=6, decimal_places=1, default=0
    )
    carried_days = models.DecimalField(
        _('Jours reportés N-1'), max_digits=6, decimal_places=1, default=0
    )

    class Meta:
        verbose_name = _('Solde de congés')
        verbose_name_plural = _('Soldes de congés')
        unique_together = [['employee', 'leave_type', 'year']]
        ordering = ['-year', 'employee__last_name']

    def __str__(self):
        return f'{self.employee.full_name} — {self.leave_type.name} {self.year}'

    @property
    def remaining_days(self):
        return self.total_days + self.carried_days - self.used_days - self.pending_days


class LeaveRequest(models.Model):
    """Demande de congé avec workflow manager → RH."""

    STATUS_CHOICES = [
        ('draft', _('Brouillon')),
        ('submitted', _('Soumise')),
        ('approved_manager', _('Approuvée par N+1')),
        ('approved_hr', _('Approuvée par RH')),
        ('rejected', _('Rejetée')),
        ('cancelled', _('Annulée')),
    ]

    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name='leave_requests'
    )
    leave_type = models.ForeignKey(
        LeaveType, on_delete=models.PROTECT, related_name='requests'
    )
    allocation = models.ForeignKey(
        LeaveAllocation,
        on_delete=models.PROTECT,
        related_name='requests',
        null=True,
        blank=True,
        help_text=_('Alimenté automatiquement à la soumission.'),
    )

    start_date = models.DateField(_('Date de début'))
    end_date = models.DateField(_('Date de fin'))
    nb_days = models.DecimalField(
        _('Nombre de jours ouvrés'),
        max_digits=4,
        decimal_places=1,
        help_text=_(
            'Calculé automatiquement (hors weekends). Modifiable pour les demi-journées.'
        ),
    )

    reason = models.TextField(_('Motif'), blank=True)
    document = models.FileField(
        _('Justificatif'),
        upload_to='hr/leave_documents/',
        blank=True,
        null=True,
    )

    status = models.CharField(
        _('Statut'), max_length=20, choices=STATUS_CHOICES, default='draft'
    )

    approved_by_manager = models.BooleanField(_('Approuvé par N+1'), default=False)
    approved_by_hr = models.BooleanField(_('Approuvé par RH'), default=False)

    manager_notes = models.TextField(_('Notes du manager'), blank=True)
    hr_notes = models.TextField(_('Notes RH'), blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Demande de congé')
        verbose_name_plural = _('Demandes de congés')
        ordering = ['-start_date']

    def __str__(self):
        return f'{self.employee.full_name} — {self.leave_type.name} ({self.start_date} → {self.end_date})'

    def clean(self):
        from django.core.exceptions import ValidationError

        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValidationError(
                _('La date de fin doit être postérieure à la date de début.')
            )
        if (
            self.leave_type_id
            and self.leave_type.requires_document
            and not self.document
        ):
            raise ValidationError(
                _('Un justificatif est obligatoire pour ce type de congé.')
            )


# ── Notes de frais ────────────────────────────────────────────────────────────


class ExpenseCategory(models.Model):
    """
    Catégories de frais professionnels.
    Chargées via _load_locale_pack() — 5 catégories universelles identiques
    pour tous les packs. Identifiées par leur champ `code` stable.
    """

    code = models.CharField(_('Code'), max_length=20, unique=True)
    name = models.CharField(_('Nom'), max_length=100)
    description = models.TextField(_('Description'), blank=True)
    is_active = models.BooleanField(_('Active'), default=True)
    created_at = models.DateTimeField(_('Créée le'), auto_now_add=True)

    class Meta:
        verbose_name = _('Catégorie de frais')
        verbose_name_plural = _('Catégories de frais')
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.code})'


class ExpenseReport(models.Model):
    """Note de frais — entête avec workflow de validation à deux niveaux."""

    STATUS_CHOICES = [
        ('draft', _('Brouillon')),
        ('submitted', _('Soumise')),
        ('approved_manager', _('Approuvée par N+1')),
        ('approved_finance', _('Approuvée par Finance')),
        ('reimbursed', _('Remboursée')),
        ('rejected', _('Rejetée')),
        ('cancelled', _('Annulée')),
    ]

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='expense_reports',
        verbose_name=_('Employé'),
    )
    title = models.CharField(_('Titre'), max_length=200)
    period_month = models.CharField(
        _('Période (YYYY-MM)'),
        max_length=7,
        help_text=_('Format : YYYY-MM'),
    )
    description = models.TextField(_('Description'), blank=True)

    status = models.CharField(
        _('Statut'), max_length=20, choices=STATUS_CHOICES, default='draft'
    )

    approved_by_manager = models.BooleanField(_('Approuvé par N+1'), default=False)
    approved_by_finance = models.BooleanField(_('Approuvé par Finance'), default=False)
    manager_notes = models.TextField(_('Notes du manager'), blank=True)
    finance_notes = models.TextField(_('Notes Finance'), blank=True)

    created_at = models.DateTimeField(_('Créée le'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Modifiée le'), auto_now=True)

    class Meta:
        verbose_name = _('Note de frais')
        verbose_name_plural = _('Notes de frais')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} — {self.employee.full_name} ({self.period_month})'

    @property
    def total_amount(self):
        from django.db.models import Sum

        return self.items.aggregate(total=Sum('amount'))['total'] or Decimal('0')


class ExpenseItem(models.Model):
    """Ligne d'une note de frais."""

    expense_report = models.ForeignKey(
        ExpenseReport,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name=_('Note de frais'),
    )
    category = models.ForeignKey(
        ExpenseCategory,
        on_delete=models.PROTECT,
        related_name='items',
        verbose_name=_('Catégorie'),
    )
    date = models.DateField(_('Date'))
    description = models.CharField(_('Description'), max_length=200)
    amount = models.DecimalField(_('Montant'), max_digits=10, decimal_places=2)
    currency = models.ForeignKey(
        'core.Currency',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        verbose_name=_('Devise'),
    )
    receipt = models.FileField(
        _('Justificatif'),
        upload_to='hr/expense_receipts/',
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Modifié le'), auto_now=True)

    class Meta:
        verbose_name = _('Ligne de frais')
        verbose_name_plural = _('Lignes de frais')
        ordering = ['date']

    def __str__(self):
        return f'{self.category.name} — {self.amount} ({self.date})'


# ── Jours fériés ──────────────────────────────────────────────────────────────


class PublicHoliday(models.Model):
    """
    Jours fériés nationaux.
    Pack-indépendant : les dates sont chargées via _load_locale_pack() dans core/views.py.
    Aucune date nationale n'est hardcodée dans la logique métier.
    """

    name = models.CharField(_('Nom'), max_length=100)
    date = models.DateField(_('Date'))
    is_recurring = models.BooleanField(
        _('Récurrent annuellement'),
        default=True,
        help_text=_('Si True, s applique chaque année à la même date (mois/jour).'),
    )
    country_code = models.CharField(
        _('Code pack'),
        max_length=10,
        blank=True,
        help_text=_('Code du pack de localisation. Vide = universel.'),
    )

    class Meta:
        verbose_name = _('Jour férié')
        verbose_name_plural = _('Jours fériés')
        ordering = ['date']

    def __str__(self):
        return f'{self.name} ({self.date})'

    def matches_date(self, d) -> bool:
        """Retourne True si ce jour férié correspond à la date d."""
        if self.is_recurring:
            return self.date.month == d.month and self.date.day == d.day
        return self.date == d
