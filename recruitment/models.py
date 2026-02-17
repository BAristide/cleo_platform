from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from hr.models import Department, Employee, JobTitle


class JobOpening(models.Model):
    """Fiche de poste ouverte au recrutement."""

    job_title = models.ForeignKey(
        JobTitle,
        on_delete=models.CASCADE,
        related_name='job_openings',
        verbose_name=_('Poste'),
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name='job_openings',
        verbose_name=_('Département'),
    )

    # Détails du poste
    reference = models.CharField(_('Référence'), max_length=50, unique=True)
    title = models.CharField(_('Titre du poste'), max_length=200)
    description = models.TextField(_('Description du poste'))
    requirements = models.TextField(_('Exigences/Qualifications'))
    responsibilities = models.TextField(_('Responsabilités'))

    # Détails pratiques
    location = models.CharField(_('Lieu'), max_length=100)
    contract_type = models.CharField(_('Type de contrat'), max_length=50)
    is_remote = models.BooleanField(_('Télétravail possible'), default=False)
    salary_range = models.CharField(
        _('Fourchette de salaire'), max_length=100, blank=True
    )

    # Processus de recrutement
    opening_date = models.DateField(_("Date d'ouverture"))
    closing_date = models.DateField(_('Date de clôture'), null=True, blank=True)

    # Statut du recrutement
    STATUS_CHOICES = [
        ('draft', _('Brouillon')),
        ('published', _('Publié')),
        ('in_progress', _('En cours')),
        ('interviewing', _('Entretiens en cours')),
        ('closed', _('Clôturé')),
        ('cancelled', _('Annulé')),
    ]
    status = models.CharField(
        _('Statut'), max_length=20, choices=STATUS_CHOICES, default='draft'
    )

    # Suivi
    created_by = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_job_openings',
        verbose_name=_('Créé par'),
    )
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Modifié le'), auto_now=True)

    # URL de la page de candidature
    application_url = models.CharField(
        _('URL de candidature'), max_length=255, blank=True
    )

    class Meta:
        verbose_name = _("Offre d'emploi")
        verbose_name_plural = _("Offres d'emploi")
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} - {self.reference}'

    def generate_application_url(self):
        """Génère l'URL unique pour la page de candidature."""
        base_url = 'https://cleo.ecintelligence.ma/recruitment/apply/'
        return f'{base_url}{self.reference}/'

    def save(self, *args, **kwargs):
        # Générer une référence unique si elle n'existe pas
        if not self.reference:
            prefix = 'JOB'
            year = timezone.now().year
            # Trouver le dernier numéro utilisé cette année
            last_job = (
                JobOpening.objects.filter(reference__startswith=f'{prefix}-{year}')
                .order_by('-reference')
                .first()
            )

            if last_job:
                # Extraire le numéro et l'incrémenter
                try:
                    last_num = int(last_job.reference.split('-')[-1])
                    new_num = last_num + 1
                except ValueError:
                    new_num = 1
            else:
                new_num = 1

            self.reference = f'{prefix}-{year}-{new_num:04d}'

        # Générer l'URL de candidature
        if not self.application_url and self.reference:
            self.application_url = self.generate_application_url()

        super().save(*args, **kwargs)


class Candidate(models.Model):
    """Candidat au recrutement."""

    # Informations personnelles
    first_name = models.CharField(_('Prénom'), max_length=100)
    last_name = models.CharField(_('Nom'), max_length=100)
    email = models.EmailField(_('Email'), unique=True)
    phone = models.CharField(_('Téléphone'), max_length=20, blank=True)
    address = models.TextField(_('Adresse'), blank=True)

    # Informations professionnelles
    current_position = models.CharField(_('Poste actuel'), max_length=200, blank=True)
    current_company = models.CharField(
        _('Entreprise actuelle'), max_length=200, blank=True
    )
    years_of_experience = models.PositiveSmallIntegerField(
        _("Années d'expérience"), default=0
    )
    highest_degree = models.CharField(
        _('Diplôme le plus élevé'), max_length=200, blank=True
    )

    # Métadonnées
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Modifié le'), auto_now=True)

    class Meta:
        verbose_name = _('Candidat')
        verbose_name_plural = _('Candidats')
        ordering = ['last_name', 'first_name']

    def __str__(self):
        return f'{self.first_name} {self.last_name}'

    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'


class Application(models.Model):
    """Candidature à une offre d'emploi."""

    job_opening = models.ForeignKey(
        JobOpening,
        on_delete=models.CASCADE,
        related_name='applications',
        verbose_name=_("Offre d'emploi"),
    )
    candidate = models.ForeignKey(
        Candidate,
        on_delete=models.CASCADE,
        related_name='applications',
        verbose_name=_('Candidat'),
    )

    # CV et documents
    resume = models.FileField(_('CV'), upload_to='recruitment/resumes/%Y/%m/')
    cover_letter = models.FileField(
        _('Lettre de motivation'),
        upload_to='recruitment/cover_letters/%Y/%m/',
        blank=True,
        null=True,
    )

    # Dates importantes
    application_date = models.DateTimeField(_('Date de candidature'), auto_now_add=True)

    # Statut de la candidature
    STATUS_CHOICES = [
        ('received', _('Reçue')),
        ('preselected', _('Présélectionnée')),
        ('rejected_screening', _('Rejetée (présélection)')),
        ('analysis', _('En analyse')),
        ('selected_for_interview', _('Sélectionnée pour entretien')),
        ('rejected_analysis', _('Rejetée (analyse)')),
        ('interviewed', _('Entretien effectué')),
        ('rejected_interview', _('Rejetée (après entretien)')),
        ('selected', _('Sélectionnée')),
        ('hired', _('Embauché')),
        ('withdrawn', _('Retirée par le candidat')),
    ]
    status = models.CharField(
        _('Statut'), max_length=30, choices=STATUS_CHOICES, default='received'
    )

    # Notes et dates d'entretien
    interview_date = models.DateTimeField(_("Date d'entretien"), null=True, blank=True)
    interview_location = models.CharField(
        _("Lieu d'entretien"), max_length=200, blank=True
    )
    notes = models.TextField(_('Notes générales'), blank=True)

    # Métadonnées
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Modifié le'), auto_now=True)

    class Meta:
        verbose_name = _('Candidature')
        verbose_name_plural = _('Candidatures')
        ordering = ['-application_date']
        # Un candidat ne peut postuler qu'une fois à une offre
        unique_together = [['job_opening', 'candidate']]

    def __str__(self):
        return f'{self.candidate.full_name} - {self.job_opening.title}'

    def delete(self, *args, **kwargs):
        # Supprimer les fichiers associés
        if self.resume:
            self.resume.delete(save=False)
        if self.cover_letter:
            self.cover_letter.delete(save=False)

        # Si la candidature n'a pas dépassé la phase de présélection et est rejetée
        if self.status == 'rejected_screening':
            # Supprimer également le candidat si c'est sa seule candidature
            if self.candidate.applications.count() == 1:
                self.candidate.delete()

        super().delete(*args, **kwargs)


class InterviewPanel(models.Model):
    """Panel d'évaluateurs pour un entretien."""

    job_opening = models.ForeignKey(
        JobOpening,
        on_delete=models.CASCADE,
        related_name='interview_panels',
        verbose_name=_("Offre d'emploi"),
    )
    name = models.CharField(_('Nom du panel'), max_length=200)

    # Métadonnées
    created_by = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_panels',
        verbose_name=_('Créé par'),
    )
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Modifié le'), auto_now=True)

    class Meta:
        verbose_name = _("Panel d'entretien")
        verbose_name_plural = _("Panels d'entretien")

    def __str__(self):
        return f'{self.name} - {self.job_opening.title}'


class Interviewer(models.Model):
    """Évaluateur dans un panel d'entretien."""

    panel = models.ForeignKey(
        InterviewPanel,
        on_delete=models.CASCADE,
        related_name='interviewers',
        verbose_name=_('Panel'),
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='interview_participations',
        verbose_name=_('Employé'),
    )
    role = models.CharField(_("Rôle dans l'entretien"), max_length=100, blank=True)

    class Meta:
        verbose_name = _('Évaluateur')
        verbose_name_plural = _('Évaluateurs')
        unique_together = [['panel', 'employee']]

    def __str__(self):
        return f'{self.employee.full_name} - {self.panel.name}'


class EvaluationCriterion(models.Model):
    """Critère d'évaluation pour les candidats."""

    name = models.CharField(_('Nom'), max_length=200)
    description = models.TextField(_('Description'), blank=True)

    # Catégorie du critère
    CATEGORY_CHOICES = [
        ('technical', _('Expertises Techniques')),
        ('personal', _('Compétences personnelles')),
        ('motivation', _('Motivations et intérêt')),
    ]
    category = models.CharField(_('Catégorie'), max_length=20, choices=CATEGORY_CHOICES)

    # Pondération (poids du critère)
    weight = models.PositiveSmallIntegerField(_('Pondération'), default=1)

    # Ordre d'affichage
    display_order = models.PositiveSmallIntegerField(_("Ordre d'affichage"), default=1)

    # Métadonnées
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Modifié le'), auto_now=True)

    class Meta:
        verbose_name = _("Critère d'évaluation")
        verbose_name_plural = _("Critères d'évaluation")
        ordering = ['category', 'display_order', 'name']

    def __str__(self):
        return f'{self.name} ({self.get_category_display()})'


class CandidateEvaluation(models.Model):
    """Évaluation d'un candidat par un évaluateur."""

    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        related_name='evaluations',
        verbose_name=_('Candidature'),
    )
    interviewer = models.ForeignKey(
        Interviewer,
        on_delete=models.CASCADE,
        related_name='candidate_evaluations',
        verbose_name=_('Évaluateur'),
    )

    # Impression générale
    IMPRESSION_CHOICES = [
        (1, _('Défavorable')),
        (2, _('Réservé')),
        (3, _('Favorable')),
        (4, _('Très favorable')),
    ]
    general_impression = models.PositiveSmallIntegerField(
        _('Impression générale'), choices=IMPRESSION_CHOICES
    )

    # Anglais (optionnel)
    english_level = models.PositiveSmallIntegerField(
        _("Niveau d'anglais"), null=True, blank=True
    )

    # Notes globales
    strengths = models.TextField(_("Qualités pour exercer l'activité"), blank=True)
    weaknesses = models.TextField(_("Limites à exercer l'activité"), blank=True)

    # Métadonnées
    evaluation_date = models.DateField(_("Date d'évaluation"), default=timezone.now)
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Modifié le'), auto_now=True)

    # Document d'évaluation
    evaluation_form = models.FileField(
        _("Fiche d'évaluation"),
        upload_to='recruitment/evaluations/%Y/%m/',
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = _('Évaluation de candidat')
        verbose_name_plural = _('Évaluations de candidats')
        unique_together = [['application', 'interviewer']]

    def __str__(self):
        return f'Évaluation de {self.application.candidate.full_name} par {self.interviewer.employee.full_name}'

    @property
    def total_score(self):
        """Calcule le score total de l'évaluation."""
        total = 0
        for score in self.criterion_scores.all():
            total += score.score * score.criterion.weight
        return total


class CriterionScore(models.Model):
    """Score pour un critère spécifique dans une évaluation."""

    evaluation = models.ForeignKey(
        CandidateEvaluation,
        on_delete=models.CASCADE,
        related_name='criterion_scores',
        verbose_name=_('Évaluation'),
    )
    criterion = models.ForeignKey(
        EvaluationCriterion,
        on_delete=models.CASCADE,
        related_name='scores',
        verbose_name=_('Critère'),
    )
    score = models.DecimalField(_('Score'), max_digits=4, decimal_places=1)

    # Commentaire spécifique pour ce critère
    comment = models.TextField(_('Commentaire'), blank=True)

    class Meta:
        verbose_name = _('Score de critère')
        verbose_name_plural = _('Scores de critères')
        unique_together = [['evaluation', 'criterion']]

    def __str__(self):
        return f'{self.criterion.name}: {self.score}'


class RecruitmentStats(models.Model):
    """Statistiques de recrutement."""

    # Période concernée
    period_start = models.DateField(_('Début de période'))
    period_end = models.DateField(_('Fin de période'))

    # Statistiques globales
    total_job_openings = models.PositiveIntegerField(
        _("Total des offres d'emploi"), default=0
    )
    total_applications = models.PositiveIntegerField(
        _('Total des candidatures'), default=0
    )
    applications_per_opening = models.DecimalField(
        _('Candidatures par offre'), max_digits=5, decimal_places=2, default=0
    )

    # Statistiques par phase
    preselected_applications = models.PositiveIntegerField(
        _('Candidatures présélectionnées'), default=0
    )
    interviewed_candidates = models.PositiveIntegerField(
        _('Candidats interviewés'), default=0
    )
    hired_candidates = models.PositiveIntegerField(_('Candidats embauchés'), default=0)

    # Taux de conversion
    preselection_rate = models.DecimalField(
        _('Taux de présélection (%)'), max_digits=5, decimal_places=2, default=0
    )
    interview_rate = models.DecimalField(
        _("Taux d'entretien (%)"), max_digits=5, decimal_places=2, default=0
    )
    hiring_rate = models.DecimalField(
        _("Taux d'embauche (%)"), max_digits=5, decimal_places=2, default=0
    )

    # Temps moyen
    avg_time_to_hire = models.PositiveIntegerField(
        _("Temps moyen d'embauche (jours)"), default=0
    )

    # Métadonnées
    generated_at = models.DateTimeField(_('Généré le'), auto_now_add=True)

    class Meta:
        verbose_name = _('Statistique de recrutement')
        verbose_name_plural = _('Statistiques de recrutement')
        ordering = ['-period_end']

    def __str__(self):
        return f'Stats recrutement {self.period_start} - {self.period_end}'


class RecruitmentNotification(models.Model):
    """Notifications du module recrutement."""

    # Destinataire
    recipient = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='recruitment_notifications',
        verbose_name=_('Destinataire'),
    )

    # Contenu
    title = models.CharField(_('Titre'), max_length=255)
    message = models.TextField(_('Message'))

    # Statut
    is_read = models.BooleanField(_('Lu'), default=False)

    # Type de notification
    TYPE_CHOICES = [
        ('job_opening', _("Nouvelle offre d'emploi")),
        ('application', _('Nouvelle candidature')),
        ('interview', _('Entretien planifié')),
        ('evaluation', _('Évaluation requise')),
        ('hiring', _('Embauche finalisée')),
    ]
    type = models.CharField(_('Type'), max_length=20, choices=TYPE_CHOICES)

    # Références (ID des objets concernés)
    job_opening_id = models.PositiveIntegerField(
        _("ID Offre d'emploi"), null=True, blank=True
    )
    application_id = models.PositiveIntegerField(
        _('ID Candidature'), null=True, blank=True
    )

    # Métadonnées
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)

    class Meta:
        verbose_name = _('Notification de recrutement')
        verbose_name_plural = _('Notifications de recrutement')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} - {self.recipient.full_name}'
