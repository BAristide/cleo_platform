from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from hr.models import Employee, Department, JobTitle
from core.models import Currency

class PayrollPeriod(models.Model):
    """Période de paie mensuelle."""
    name = models.CharField(_("Nom"), max_length=100)
    start_date = models.DateField(_("Date de début"))
    end_date = models.DateField(_("Date de fin"))
    is_closed = models.BooleanField(_("Clôturée"), default=False)
    
    # Métadonnées
    created_at = models.DateTimeField(_("Créé le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Modifié le"), auto_now=True)
    
    class Meta:
        verbose_name = _("Période de paie")
        verbose_name_plural = _("Périodes de paie")
        ordering = ['-start_date']
    
    def __str__(self):
        return self.name

class PayrollParameter(models.Model):
    """Paramètres généraux de paie (SMIG, plafonds CNSS, etc.)."""
    code = models.CharField(_("Code"), max_length=50, unique=True)
    name = models.CharField(_("Nom"), max_length=100)
    value = models.DecimalField(_("Valeur"), max_digits=12, decimal_places=2)
    effective_date = models.DateField(_("Date d'effet"))
    end_date = models.DateField(_("Date de fin"), null=True, blank=True)
    description = models.TextField(_("Description"), blank=True)
    is_active = models.BooleanField(_("Actif"), default=True)
    
    # Métadonnées
    created_at = models.DateTimeField(_("Créé le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Modifié le"), auto_now=True)
    
    class Meta:
        verbose_name = _("Paramètre de paie")
        verbose_name_plural = _("Paramètres de paie")
        ordering = ['code']
    
    def __str__(self):
        return f"{self.code} - {self.name}: {self.value}"

class ContractType(models.Model):
    """Types de contrats (CDI, CDD, ANAPEC, etc.)."""
    code = models.CharField(_("Code"), max_length=20, unique=True)
    name = models.CharField(_("Nom"), max_length=100)
    description = models.TextField(_("Description"), blank=True)
    is_active = models.BooleanField(_("Actif"), default=True)
    
    # Métadonnées
    created_at = models.DateTimeField(_("Créé le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Modifié le"), auto_now=True)
    
    class Meta:
        verbose_name = _("Type de contrat")
        verbose_name_plural = _("Types de contrat")
        ordering = ['name']
    
    def __str__(self):
        return self.name

class SalaryComponent(models.Model):
    """Composants de salaire (salaire de base, primes, cotisations, etc.)."""
    TYPE_CHOICES = [
        ('brut', _('Élément de salaire brut')),
        ('cotisation', _('Cotisation sociale')),
        ('non_soumise', _('Indemnité non soumise')),
    ]
    
    code = models.CharField(_("Code"), max_length=20, unique=True)
    name = models.CharField(_("Nom"), max_length=100)
    description = models.TextField(_("Description"), blank=True)
    component_type = models.CharField(_("Type"), max_length=20, choices=TYPE_CHOICES)
    is_taxable = models.BooleanField(_("Imposable"), default=True)
    is_cnss_eligible = models.BooleanField(_("Soumis CNSS"), default=True)
    is_active = models.BooleanField(_("Actif"), default=True)
    formula = models.TextField(_("Formule de calcul"), blank=True, 
                              help_text=_("Formule ou référence à une fonction de calcul"))
    
    # Métadonnées
    created_at = models.DateTimeField(_("Créé le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Modifié le"), auto_now=True)
    
    class Meta:
        verbose_name = _("Composant de salaire")
        verbose_name_plural = _("Composants de salaire")
        ordering = ['component_type', 'code']
    
    def __str__(self):
        return f"{self.code} - {self.name}"

class TaxBracket(models.Model):
    """Tranches d'imposition pour l'IR."""
    min_amount = models.DecimalField(_("Montant minimum"), max_digits=12, decimal_places=2)
    max_amount = models.DecimalField(_("Montant maximum"), max_digits=12, decimal_places=2, 
                                    null=True, blank=True)
    rate = models.DecimalField(_("Taux"), max_digits=5, decimal_places=2, 
                              help_text=_("Taux en pourcentage"))
    deduction = models.DecimalField(_("Somme à déduire"), max_digits=12, decimal_places=2, default=0)
    effective_date = models.DateField(_("Date d'effet"))
    end_date = models.DateField(_("Date de fin"), null=True, blank=True)
    
    # Métadonnées
    created_at = models.DateTimeField(_("Créé le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Modifié le"), auto_now=True)
    
    class Meta:
        verbose_name = _("Tranche d'imposition")
        verbose_name_plural = _("Tranches d'imposition")
        ordering = ['min_amount']
    
    def __str__(self):
        if self.max_amount:
            return f"{self.min_amount} à {self.max_amount}: {self.rate}%"
        return f"Plus de {self.min_amount}: {self.rate}%"

class EmployeePayroll(models.Model):
    """Données de paie spécifiques à un employé."""
    employee = models.OneToOneField(Employee, on_delete=models.CASCADE, 
                                   related_name="payroll_info", verbose_name=_("Employé"))
    contract_type = models.ForeignKey(ContractType, on_delete=models.PROTECT, 
                                     verbose_name=_("Type de contrat"))
    base_salary = models.DecimalField(_("Salaire de base"), max_digits=12, decimal_places=2)
    hourly_rate = models.DecimalField(_("Taux horaire"), max_digits=10, decimal_places=2, 
                                     null=True, blank=True)
    
    # Informations bancaires et fiscales
    cnss_number = models.CharField(_("N° CNSS"), max_length=30, blank=True)
    bank_account = models.CharField(_("N° compte bancaire"), max_length=50, blank=True)
    bank_name = models.CharField(_("Banque"), max_length=100, blank=True)
    bank_swift = models.CharField(_("Code SWIFT"), max_length=20, blank=True)
    
    # Méthode de paiement
    PAYMENT_METHOD_CHOICES = [
        ('bank_transfer', _('Virement bancaire')),
        ('check', _('Chèque')),
        ('cash', _('Espèces')),
    ]
    payment_method = models.CharField(_("Méthode de paiement"), max_length=20, 
                                     choices=PAYMENT_METHOD_CHOICES, 
                                     default='bank_transfer')
    
    # Primes et indemnités régulières
    transport_allowance = models.DecimalField(_("Indemnité de transport"), 
                                             max_digits=10, decimal_places=2, 
                                             default=0)
    meal_allowance = models.DecimalField(_("Prime de panier"), 
                                         max_digits=10, decimal_places=2, 
                                         default=0)
    
    # Métadonnées
    created_at = models.DateTimeField(_("Créé le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Modifié le"), auto_now=True)
    
    class Meta:
        verbose_name = _("Données de paie employé")
        verbose_name_plural = _("Données de paie employés")
        ordering = ['employee__last_name', 'employee__first_name']
    
    def __str__(self):
        return f"Paie - {self.employee.full_name}"

class PayrollRun(models.Model):
    """Lancement de paie pour une période."""
    STATUS_CHOICES = [
        ('draft', _('Brouillon')),
        ('in_progress', _('En cours')),
        ('calculated', _('Calculé')),
        ('validated', _('Validé')),
        ('paid', _('Payé')),
        ('cancelled', _('Annulé')),
    ]
    
    period = models.ForeignKey(PayrollPeriod, on_delete=models.PROTECT, 
                              verbose_name=_("Période"))
    name = models.CharField(_("Nom"), max_length=100)
    description = models.TextField(_("Description"), blank=True)
    department = models.ForeignKey(Department, on_delete=models.PROTECT, 
                                  null=True, blank=True, 
                                  verbose_name=_("Département"))
    status = models.CharField(_("Statut"), max_length=20, 
                             choices=STATUS_CHOICES, default='draft')
    
    # Dates de traitement
    run_date = models.DateTimeField(_("Date de lancement"), auto_now_add=True)
    calculated_date = models.DateTimeField(_("Date de calcul"), null=True, blank=True)
    validated_date = models.DateTimeField(_("Date de validation"), null=True, blank=True)
    paid_date = models.DateTimeField(_("Date de paiement"), null=True, blank=True)
    
    # Utilisateurs impliqués
    created_by = models.ForeignKey(Employee, on_delete=models.SET_NULL, 
                                  null=True, related_name="created_payrolls", 
                                  verbose_name=_("Créé par"))
    validated_by = models.ForeignKey(Employee, on_delete=models.SET_NULL, 
                                    null=True, blank=True, 
                                    related_name="validated_payrolls", 
                                    verbose_name=_("Validé par"))
    
    # Notes
    notes = models.TextField(_("Notes"), blank=True)
    
    # Métadonnées
    created_at = models.DateTimeField(_("Créé le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Modifié le"), auto_now=True)
    
    class Meta:
        verbose_name = _("Lancement de paie")
        verbose_name_plural = _("Lancements de paie")
        ordering = ['-period__start_date']
    
    def __str__(self):
        return f"{self.name} - {self.period}"

class PaySlip(models.Model):
    """Bulletin de paie individuel."""
    payroll_run = models.ForeignKey(PayrollRun, on_delete=models.CASCADE, 
                                   related_name="payslips", 
                                   verbose_name=_("Lancement de paie"))
    employee = models.ForeignKey(Employee, on_delete=models.PROTECT, 
                               verbose_name=_("Employé"))
    number = models.CharField(_("Numéro"), max_length=50, unique=True)
    
    # Période travaillée
    worked_days = models.DecimalField(_("Jours travaillés"), max_digits=5, decimal_places=2, default=26)
    absence_days = models.DecimalField(_("Jours d'absence"), max_digits=5, decimal_places=2, default=0)
    paid_leave_days = models.DecimalField(_("Jours de congés payés"), max_digits=5, decimal_places=2, default=0)
    unpaid_leave_days = models.DecimalField(_("Jours de congés sans solde"), max_digits=5, decimal_places=2, default=0)
    
    # Heures supplémentaires
    overtime_25_hours = models.DecimalField(_("Heures supp. 25%"), max_digits=5, decimal_places=2, default=0)
    overtime_50_hours = models.DecimalField(_("Heures supp. 50%"), max_digits=5, decimal_places=2, default=0)
    overtime_100_hours = models.DecimalField(_("Heures supp. 100%"), max_digits=5, decimal_places=2, default=0)
    
    # Totaux calculés
    basic_salary = models.DecimalField(_("Salaire de base"), max_digits=12, decimal_places=2)
    gross_salary = models.DecimalField(_("Salaire brut"), max_digits=12, decimal_places=2)
    taxable_salary = models.DecimalField(_("Salaire imposable"), max_digits=12, decimal_places=2)
    net_salary = models.DecimalField(_("Salaire net"), max_digits=12, decimal_places=2)
    
    # Cotisations
    cnss_employee = models.DecimalField(_("CNSS employé"), max_digits=12, decimal_places=2)
    cnss_employer = models.DecimalField(_("CNSS employeur"), max_digits=12, decimal_places=2)
    amo_employee = models.DecimalField(_("AMO employé"), max_digits=12, decimal_places=2)
    amo_employer = models.DecimalField(_("AMO employeur"), max_digits=12, decimal_places=2)
    income_tax = models.DecimalField(_("IR"), max_digits=12, decimal_places=2)
    
    # Statut du bulletin
    STATUS_CHOICES = [
        ('draft', _('Brouillon')),
        ('calculated', _('Calculé')),
        ('validated', _('Validé')),
        ('paid', _('Payé')),
        ('cancelled', _('Annulé')),
    ]
    status = models.CharField(_("Statut"), max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Paiement
    is_paid = models.BooleanField(_("Payé"), default=False)
    payment_date = models.DateField(_("Date de paiement"), null=True, blank=True)
    payment_reference = models.CharField(_("Référence de paiement"), max_length=100, blank=True)
    
    # Documents générés
    pdf_file = models.CharField(_("Fichier PDF"), max_length=255, blank=True, null=True)
    
    # Notes
    notes = models.TextField(_("Notes"), blank=True)
    
    # Métadonnées
    created_at = models.DateTimeField(_("Créé le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Modifié le"), auto_now=True)
    
    class Meta:
        verbose_name = _("Bulletin de paie")
        verbose_name_plural = _("Bulletins de paie")
        ordering = ['-payroll_run__period__start_date', 'employee__last_name']
        unique_together = [['payroll_run', 'employee']]
    
    def __str__(self):
        return f"Bulletin {self.number} - {self.employee.full_name}"

class PaySlipLine(models.Model):
    """Lignes de détail d'un bulletin de paie."""
    payslip = models.ForeignKey(PaySlip, on_delete=models.CASCADE, 
                               related_name="lines", 
                               verbose_name=_("Bulletin de paie"))
    component = models.ForeignKey(SalaryComponent, on_delete=models.PROTECT, 
                                 verbose_name=_("Composant"))
    amount = models.DecimalField(_("Montant"), max_digits=12, decimal_places=2)
    base_amount = models.DecimalField(_("Montant de base"), max_digits=12, decimal_places=2, 
                                     null=True, blank=True)
    rate = models.DecimalField(_("Taux"), max_digits=5, decimal_places=2, 
                              null=True, blank=True)
    quantity = models.DecimalField(_("Quantité"), max_digits=5, decimal_places=2, 
                                  null=True, blank=True)
    is_employer_contribution = models.BooleanField(_("Contribution employeur"), default=False)
    
    # Ordre d'affichage dans le bulletin
    display_order = models.PositiveSmallIntegerField(_("Ordre d'affichage"), default=0)
    
    # Métadonnées
    created_at = models.DateTimeField(_("Créé le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Modifié le"), auto_now=True)
    
    class Meta:
        verbose_name = _("Ligne de bulletin")
        verbose_name_plural = _("Lignes de bulletin")
        ordering = ['display_order', 'component__code']
    
    def __str__(self):
        return f"{self.component.name}: {self.amount}"

class AdvanceSalary(models.Model):
    """Acomptes sur salaire."""
    employee = models.ForeignKey(Employee, on_delete=models.PROTECT, 
                               related_name="salary_advances", 
                               verbose_name=_("Employé"))
    period = models.ForeignKey(PayrollPeriod, on_delete=models.PROTECT, 
                              verbose_name=_("Période"))
    amount = models.DecimalField(_("Montant"), max_digits=12, decimal_places=2)
    payment_date = models.DateField(_("Date de paiement"))
    is_paid = models.BooleanField(_("Payé"), default=False)
    notes = models.TextField(_("Notes"), blank=True)
    
    # Référence au bulletin où l'acompte a été déduit
    payslip = models.ForeignKey(PaySlip, on_delete=models.SET_NULL, 
                               null=True, blank=True, 
                               related_name="advances", 
                               verbose_name=_("Bulletin de paie"))
    
    # Métadonnées
    created_at = models.DateTimeField(_("Créé le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Modifié le"), auto_now=True)
    
    class Meta:
        verbose_name = _("Acompte sur salaire")
        verbose_name_plural = _("Acomptes sur salaire")
        ordering = ['-payment_date']
    
    def __str__(self):
        return f"Acompte {self.employee.full_name} - {self.payment_date}"
