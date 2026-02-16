from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django.db.models import Sum
from decimal import Decimal
from datetime import datetime, timedelta

# Modèles comptables pour Cleo ERP

class AccountType(models.Model):
    """Types de comptes comptables."""
    name = models.CharField(_("Nom"), max_length=100)
    code = models.CharField(_("Code"), max_length=10, unique=True)
    is_debit = models.BooleanField(_("Solde débiteur par défaut"), default=True)
    sequence = models.IntegerField(_("Séquence"), default=10)

    class Meta:
        verbose_name = _("Type de compte")
        verbose_name_plural = _("Types de comptes")
        ordering = ['sequence', 'code']

    def __str__(self):
        return f"{self.code} - {self.name}"

class Account(models.Model):
    """Comptes comptables du Plan Comptable Marocain."""
    code = models.CharField(_("Code"), max_length=20, unique=True)
    name = models.CharField(_("Nom"), max_length=200)
    type_id = models.ForeignKey(AccountType, on_delete=models.PROTECT, 
                             related_name='accounts', verbose_name=_("Type de compte"))
    parent_id = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, 
                                related_name='children', verbose_name=_("Compte parent"))
    is_reconcilable = models.BooleanField(_("Lettrable"), default=False)
    is_active = models.BooleanField(_("Actif"), default=True)
    
    # Champs pour la TVA
    is_tax_account = models.BooleanField(_("Compte de taxe"), default=False)
    tax_type = models.CharField(_("Type de taxe"), max_length=20, choices=[
        ('vat_collected', _('TVA collectée')),
        ('vat_deductible', _('TVA déductible')),
        ('vat_import', _('TVA à l\'importation')),
    ], null=True, blank=True)
    tax_rate = models.DecimalField(_("Taux de taxe"), max_digits=5, decimal_places=2, 
                                null=True, blank=True)
    
    description = models.TextField(_("Description"), blank=True)
    created_at = models.DateTimeField(_("Créé le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Modifié le"), auto_now=True)

    class Meta:
        verbose_name = _("Compte")
        verbose_name_plural = _("Comptes")
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.name}"
    
    @property
    def full_name(self):
        return f"{self.code} - {self.name}"
    
    @property
    def level(self):
        """Niveau du compte dans la hiérarchie."""
        return len(self.code.split('.'))
    
    def get_balance(self, start_date=None, end_date=None):
        """Calcule le solde du compte pour une période donnée."""
        # Filtre de base: écritures validées
        query = JournalEntryLine.objects.filter(
            account_id=self,
            entry_id__state='posted'
        )
        
        # Filtrer par date
        if start_date:
            query = query.filter(entry_id__date__gte=start_date)
        if end_date:
            query = query.filter(entry_id__date__lte=end_date)
        
        # Calculer les totaux
        debit_sum = query.aggregate(sum=Sum('debit'))['sum'] or Decimal('0.0')
        credit_sum = query.aggregate(sum=Sum('credit'))['sum'] or Decimal('0.0')
        
        # Calculer le solde
        balance = debit_sum - credit_sum
        
        # Ajuster le signe selon le type de compte
        if not self.type_id.is_debit:
            balance = -balance
        
        return balance

class Journal(models.Model):
    """Journaux comptables."""
    code = models.CharField(_("Code"), max_length=10, unique=True)
    name = models.CharField(_("Nom"), max_length=100)
    type = models.CharField(_("Type"), max_length=20, choices=[
        ('sale', _('Ventes')),
        ('purchase', _('Achats')),
        ('cash', _('Caisse')),
        ('bank', _('Banque')),
        ('general', _('Opérations diverses')),
        ('situation', _('Situation')),
    ])
    default_debit_account_id = models.ForeignKey(Account, on_delete=models.RESTRICT, 
                                              related_name='debit_journals', 
                                              verbose_name=_("Compte de débit par défaut"),
                                              null=True, blank=True)
    default_credit_account_id = models.ForeignKey(Account, on_delete=models.RESTRICT, 
                                               related_name='credit_journals', 
                                               verbose_name=_("Compte de crédit par défaut"),
                                               null=True, blank=True)
    sequence_id = models.CharField(_("Séquence"), max_length=50, default="YYYY/####")
    active = models.BooleanField(_("Actif"), default=True)
    
    class Meta:
        verbose_name = _("Journal")
        verbose_name_plural = _("Journaux")
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.name}"
    
    def next_sequence(self, date=None):
        """Génère le prochain numéro de séquence pour ce journal."""
        if not date:
            date = timezone.now().date()
            
        year = date.year
        month = date.month
        
        # Récupérer la dernière écriture de ce journal
        last_entry = self.entries.filter(date__year=year).order_by('-name').first()
        
        if not last_entry:
            # Aucune écriture pour cette année, commencer à 1
            sequence_number = 1
        else:
            # Extraire le numéro de séquence de la dernière écriture
            try:
                sequence_number = int(last_entry.name.split('/')[-1]) + 1
            except (ValueError, IndexError):
                sequence_number = 1
        
        # Formater le numéro selon le modèle de séquence
        sequence_format = self.sequence_id.replace('YYYY', str(year))
        sequence_format = sequence_format.replace('MM', f"{month:02d}")
        sequence_format = sequence_format.replace('####', f"{sequence_number:04d}")
        
        return sequence_format

class FiscalYear(models.Model):
    """Exercices fiscaux."""
    name = models.CharField(_("Nom"), max_length=100)
    start_date = models.DateField(_("Date de début"))
    end_date = models.DateField(_("Date de fin"))
    state = models.CharField(_("État"), max_length=20, choices=[
        ('draft', _('Brouillon')),
        ('open', _('Ouvert')),
        ('closed', _('Clôturé')),
    ], default='draft')
    
    class Meta:
        verbose_name = _("Exercice fiscal")
        verbose_name_plural = _("Exercices fiscaux")
        ordering = ['-start_date']

    def __str__(self):
        return self.name
    
    def create_periods(self):
        """Crée les périodes fiscales (mensuelles) pour cet exercice."""
        current_date = self.start_date
        month_count = 1
        
        while current_date <= self.end_date:
            month_start = current_date.replace(day=1)
            
            # Calculer la fin du mois
            if month_start.month == 12:
                month_end = month_start.replace(year=month_start.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                month_end = month_start.replace(month=month_start.month + 1, day=1) - timedelta(days=1)
            
            # Ajuster la dernière période si nécessaire
            if month_end > self.end_date:
                month_end = self.end_date
            
            # Créer la période
            FiscalPeriod.objects.create(
                fiscal_year=self,
                name=f"{self.name} - Mois {month_count}",
                start_date=month_start,
                end_date=month_end,
                state='open' if self.state == 'open' else 'draft'
            )
            
            # Passer au mois suivant
            month_count += 1
            if month_start.month == 12:
                current_date = month_start.replace(year=month_start.year + 1, month=1, day=1)
            else:
                current_date = month_start.replace(month=month_start.month + 1, day=1)

class FiscalPeriod(models.Model):
    """Périodes fiscales (mois)."""
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.CASCADE, 
                                   related_name='periods', verbose_name=_("Exercice fiscal"))
    name = models.CharField(_("Nom"), max_length=100)
    start_date = models.DateField(_("Date de début"))
    end_date = models.DateField(_("Date de fin"))
    state = models.CharField(_("État"), max_length=20, choices=[
        ('draft', _('Brouillon')),
        ('open', _('Ouvert')),
        ('closed', _('Clôturé')),
    ], default='draft')
    
    class Meta:
        verbose_name = _("Période fiscale")
        verbose_name_plural = _("Périodes fiscales")
        ordering = ['start_date']

    def __str__(self):
        return self.name

class JournalEntry(models.Model):
    """Écritures comptables."""
    name = models.CharField(_("Numéro"), max_length=100)
    journal_id = models.ForeignKey(Journal, on_delete=models.RESTRICT, 
                                 related_name='entries', verbose_name=_("Journal"))
    date = models.DateField(_("Date"))
    period_id = models.ForeignKey(FiscalPeriod, on_delete=models.RESTRICT, 
                                related_name='entries', verbose_name=_("Période fiscale"))
    ref = models.CharField(_("Référence"), max_length=100, blank=True)
    state = models.CharField(_("État"), max_length=20, choices=[
        ('draft', _('Brouillon')),
        ('posted', _('Validé')),
        ('cancel', _('Annulé')),
    ], default='draft')
    
    # Origine de l'écriture (module et objet source)
    source_module = models.CharField(_("Module source"), max_length=50, blank=True, null=True)
    source_model = models.CharField(_("Modèle source"), max_length=50, blank=True, null=True)
    source_id = models.IntegerField(_("ID source"), blank=True, null=True)
    
    narration = models.TextField(_("Libellé"), blank=True)
    is_manual = models.BooleanField(_("Saisie manuelle"), default=True)
    created_by = models.ForeignKey('auth.User', on_delete=models.RESTRICT, 
                                 related_name='journal_entries', verbose_name=_("Créé par"))
    created_at = models.DateTimeField(_("Créé le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Modifié le"), auto_now=True)
    
    class Meta:
        verbose_name = _("Écriture comptable")
        verbose_name_plural = _("Écritures comptables")
        ordering = ['-date', '-id']
        # Chaque numéro doit être unique par journal
        unique_together = [['journal_id', 'name']]

    def __str__(self):
        return f"{self.journal_id.code}/{self.name} - {self.date}"
    
    @property
    def total_debit(self):
        """Total du débit de l'écriture."""
        return self.lines.aggregate(total=Sum('debit'))['total'] or Decimal('0.0')
    
    @property
    def total_credit(self):
        """Total du crédit de l'écriture."""
        return self.lines.aggregate(total=Sum('credit'))['total'] or Decimal('0.0')
    
    @property
    def is_balanced(self):
        """Vérifie si l'écriture est équilibrée."""
        return self.total_debit == self.total_credit
    
    def post(self):
        """Valide l'écriture comptable."""
        if self.state != 'draft':
            raise ValidationError(_("Impossible de valider une écriture qui n'est pas en brouillon"))
        
        if not self.is_balanced:
            raise ValidationError(_("L'écriture n'est pas équilibrée"))
        
        if not self.lines.exists():
            raise ValidationError(_("L'écriture ne contient aucune ligne"))
        
        self.state = 'posted'
        self.save(update_fields=['state'])
        
        # Lettrage automatique si possible
        self.try_auto_reconcile()
        
        return True
    
    def cancel(self):
        """Annule l'écriture comptable."""
        if self.state != 'posted':
            raise ValidationError(_("Impossible d'annuler une écriture qui n'est pas validée"))
        
        # Vérifier si l'écriture peut être annulée (pas déjà lettrée)
        if self.lines.filter(is_reconciled=True).exists():
            raise ValidationError(_("Impossible d'annuler une écriture dont les lignes sont lettrées"))
        
        self.state = 'cancel'
        self.save(update_fields=['state'])
        
        return True
    
    def try_auto_reconcile(self):
        """Essaie de lettrer automatiquement les lignes de l'écriture avec des lignes existantes."""
        # Pour chaque compte lettrable dans l'écriture
        reconcilable_accounts = set(
            self.lines.filter(
                account_id__is_reconcilable=True,
                is_reconciled=False
            ).values_list('account_id', flat=True)
        )
        
        for account_id in reconcilable_accounts:
            # Récupérer les lignes de ce compte dans l'écriture
            lines = self.lines.filter(account_id=account_id, is_reconciled=False)
            
            # Calculer le solde des lignes
            balance = sum(line.debit - line.credit for line in lines)
            
            # Si le solde est nul, pas besoin de lettrer avec d'autres écritures
            if balance == 0:
                # On peut lettrer ces lignes entre elles
                if lines.count() > 1:
                    from .models import Reconciliation
                    reconciliation = Reconciliation.objects.create(
                        name=f"AUTO-{self.journal_id.code}-{self.name}",
                        date=self.date,
                        account_id=Account.objects.get(id=account_id),
                        created_by=self.created_by
                    )
                    lines.update(is_reconciled=True, reconciliation_id=reconciliation)
                continue
            
            # Essayer de trouver des lignes d'autres écritures qui équilibrent
            opposite_balance = -balance
            
            # Chercher une ligne unique qui correspond exactement
            matching_line = JournalEntryLine.objects.filter(
                account_id=account_id,
                is_reconciled=False,
                entry_id__state='posted',
                entry_id__id__ne=self.id
            ).exclude(
                entry_id=self.id
            ).annotate(
                balance=models.F('debit') - models.F('credit')
            ).filter(
                balance=opposite_balance
            ).first()
            
            if matching_line:
                # On a trouvé une ligne qui équilibre, on lettre
                from .models import Reconciliation
                reconciliation = Reconciliation.objects.create(
                    name=f"AUTO-{self.journal_id.code}-{self.name}",
                    date=self.date,
                    account_id=Account.objects.get(id=account_id),
                    created_by=self.created_by
                )
                
                # Lettrer les lignes de cette écriture
                lines.update(is_reconciled=True, reconciliation_id=reconciliation)
                
                # Lettrer la ligne trouvée
                matching_line.is_reconciled = True
                matching_line.reconciliation_id = reconciliation
                matching_line.save(update_fields=['is_reconciled', 'reconciliation_id'])

class JournalEntryLine(models.Model):
    """Lignes d'écritures comptables."""
    entry_id = models.ForeignKey(JournalEntry, on_delete=models.CASCADE, 
                               related_name='lines', verbose_name=_("Écriture"))
    account_id = models.ForeignKey(Account, on_delete=models.RESTRICT, 
                                 related_name='entry_lines', verbose_name=_("Compte"))
    name = models.CharField(_("Libellé"), max_length=200)
    
    # Partenaire commercial (client, fournisseur)
    partner_id = models.ForeignKey('crm.Company', on_delete=models.RESTRICT, 
                                 null=True, blank=True, related_name='journal_entry_lines', 
                                 verbose_name=_("Partenaire"))
    
    debit = models.DecimalField(_("Débit"), max_digits=15, decimal_places=2, default=0)
    credit = models.DecimalField(_("Crédit"), max_digits=15, decimal_places=2, default=0)
    
    # Gestion des devises
    currency_id = models.ForeignKey('core.Currency', on_delete=models.RESTRICT, 
                                  null=True, blank=True, related_name='journal_entry_lines', 
                                  verbose_name=_("Devise"))
    amount_currency = models.DecimalField(_("Montant en devise"), max_digits=15, 
                                        decimal_places=2, default=0)
    
    # Échéances
    date_maturity = models.DateField(_("Date d'échéance"), null=True, blank=True)
    
    # Lettrage
    is_reconciled = models.BooleanField(_("Lettré"), default=False)
    reconciliation_id = models.ForeignKey('Reconciliation', on_delete=models.SET_NULL, 
                                        null=True, blank=True, related_name='reconciled_lines', 
                                        verbose_name=_("Lettrage"))
    
    # Analytique
    analytic_account_id = models.ForeignKey('AnalyticAccount', on_delete=models.SET_NULL, 
                                          null=True, blank=True, related_name='entry_lines',
                                          verbose_name=_("Compte analytique"))
    
    # Taxes
    tax_line_id = models.ForeignKey('Tax', on_delete=models.SET_NULL, 
                                  null=True, blank=True, related_name='tax_lines',
                                  verbose_name=_("Taxe"))
    tax_base_amount = models.DecimalField(_("Base de taxe"), max_digits=15, 
                                        decimal_places=2, default=0)
    
    # Autres informations
    ref = models.CharField(_("Référence"), max_length=100, blank=True)
    created_at = models.DateTimeField(_("Créé le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Modifié le"), auto_now=True)
    
    class Meta:
        verbose_name = _("Ligne d'écriture")
        verbose_name_plural = _("Lignes d'écritures")
        ordering = ['id']

    def __str__(self):
        return f"{self.name} ({self.debit} / {self.credit})"
    
    def clean(self):
        """Validations supplémentaires."""
        if self.debit and self.credit:
            raise ValidationError(_("Une ligne ne peut pas avoir à la fois un débit et un crédit"))
        
        if not self.debit and not self.credit:
            raise ValidationError(_("Une ligne doit avoir soit un débit soit un crédit"))
    
    @property
    def amount(self):
        """Montant signé de la ligne (positif pour débit, négatif pour crédit)."""
        return self.debit - self.credit

class Reconciliation(models.Model):
    """Lettrages des écritures."""
    name = models.CharField(_("Nom"), max_length=100)
    date = models.DateField(_("Date"), auto_now_add=True)
    account_id = models.ForeignKey(Account, on_delete=models.RESTRICT, 
                                 related_name='reconciliations', verbose_name=_("Compte"))
    created_by = models.ForeignKey('auth.User', on_delete=models.RESTRICT, 
                                 related_name='reconciliations', verbose_name=_("Créé par"))
    created_at = models.DateTimeField(_("Créé le"), auto_now_add=True)
    
    class Meta:
        verbose_name = _("Lettrage")
        verbose_name_plural = _("Lettrages")
        ordering = ['-date', 'name']

    def __str__(self):
        return f"{self.name} - {self.date}"
    
    @property
    def lines(self):
        """Lignes lettrées."""
        return self.reconciled_lines.all()
    
    @property
    def balance(self):
        """Solde du lettrage (devrait être proche de zéro)."""
        debit = self.lines.aggregate(total=Sum('debit'))['total'] or Decimal('0.0')
        credit = self.lines.aggregate(total=Sum('credit'))['total'] or Decimal('0.0')
        return debit - credit

class AnalyticAccount(models.Model):
    """Comptes analytiques."""
    code = models.CharField(_("Code"), max_length=20, unique=True)
    name = models.CharField(_("Nom"), max_length=200)
    parent_id = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, 
                                related_name='children', verbose_name=_("Compte parent"))
    active = models.BooleanField(_("Actif"), default=True)
    
    class Meta:
        verbose_name = _("Compte analytique")
        verbose_name_plural = _("Comptes analytiques")
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.name}"
    
    @property
    def full_name(self):
        """Nom complet avec code."""
        return f"{self.code} - {self.name}"

class Tax(models.Model):
    """Taxes (TVA, etc.)."""
    name = models.CharField(_("Nom"), max_length=100)
    description = models.TextField(_("Description"), blank=True)
    amount = models.DecimalField(_("Taux"), max_digits=5, decimal_places=2)
    type = models.CharField(_("Type"), max_length=20, choices=[
        ('percent', _('Pourcentage')),
        ('fixed', _('Montant fixe')),
    ], default='percent')
    
    # Comptes comptables associés
    account_id = models.ForeignKey(Account, on_delete=models.RESTRICT, 
                                 related_name='taxes', verbose_name=_("Compte de taxe"))
    
    active = models.BooleanField(_("Actif"), default=True)
    
    # Catégorie de taxe
    tax_category = models.CharField(_("Catégorie"), max_length=20, choices=[
        ('vat', _('TVA')),
        ('vat_import', _('TVA importation')),
        ('other', _('Autre')),
    ], default='vat')
    
    # Pour la TVA
    is_deductible = models.BooleanField(_("Déductible"), default=False)
    
    class Meta:
        verbose_name = _("Taxe")
        verbose_name_plural = _("Taxes")
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.amount}%)"
    
    def compute_amount(self, base_amount):
        """Calcule le montant de taxe."""
        if self.type == 'percent':
            return base_amount * (self.amount / 100)
        return self.amount

class BankStatement(models.Model):
    """Relevés bancaires."""
    journal_id = models.ForeignKey(Journal, on_delete=models.RESTRICT, 
                                 related_name='bank_statements', verbose_name=_("Journal"))
    name = models.CharField(_("Nom"), max_length=100)
    date = models.DateField(_("Date"))
    reference = models.CharField(_("Référence"), max_length=100, blank=True)
    balance_start = models.DecimalField(_("Solde initial"), max_digits=15, decimal_places=2)
    balance_end = models.DecimalField(_("Solde final"), max_digits=15, decimal_places=2)
    balance_end_real = models.DecimalField(_("Solde final réel"), max_digits=15, 
                                         decimal_places=2, null=True, blank=True)
    state = models.CharField(_("État"), max_length=20, choices=[
        ('draft', _('Brouillon')),
        ('open', _('En cours')),
        ('confirm', _('Confirmé')),
    ], default='draft')
    
    created_by = models.ForeignKey('auth.User', on_delete=models.RESTRICT, 
                                 related_name='bank_statements', verbose_name=_("Créé par"))
    created_at = models.DateTimeField(_("Créé le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Modifié le"), auto_now=True)
    
    class Meta:
        verbose_name = _("Relevé bancaire")
        verbose_name_plural = _("Relevés bancaires")
        ordering = ['-date', 'name']

    def __str__(self):
        return f"{self.name} - {self.date}"
    
    @property
    def difference(self):
        """Différence entre solde calculé et solde réel."""
        if not self.balance_end_real:
            return Decimal('0.0')
        return self.balance_end - self.balance_end_real

class BankStatementLine(models.Model):
    """Lignes de relevé bancaire."""
    statement_id = models.ForeignKey(BankStatement, on_delete=models.CASCADE, 
                                   related_name='lines', verbose_name=_("Relevé"))
    date = models.DateField(_("Date"))
    name = models.CharField(_("Libellé"), max_length=200)
    ref = models.CharField(_("Référence"), max_length=100, blank=True)
    partner_id = models.ForeignKey('crm.Company', on_delete=models.SET_NULL, 
                                 null=True, blank=True, related_name='statement_lines', 
                                 verbose_name=_("Partenaire"))
    amount = models.DecimalField(_("Montant"), max_digits=15, decimal_places=2)
    is_reconciled = models.BooleanField(_("Rapproché"), default=False)
    
    # Lien avec les lignes d'écritures
    journal_entry_line_ids = models.ManyToManyField(JournalEntryLine, blank=True, 
                                                 related_name='statement_lines',
                                                 verbose_name=_("Lignes d'écritures"))
    
    note = models.TextField(_("Note"), blank=True)
    created_at = models.DateTimeField(_("Créé le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Modifié le"), auto_now=True)
    
    class Meta:
        verbose_name = _("Ligne de relevé")
        verbose_name_plural = _("Lignes de relevé")
        ordering = ['date', 'id']

    def __str__(self):
        return f"{self.name} - {self.amount}"

class AssetCategory(models.Model):
    """Catégories d'immobilisations."""
    name = models.CharField(_("Nom"), max_length=100)
    account_asset_id = models.ForeignKey(Account, on_delete=models.RESTRICT, 
                                       related_name='asset_categories', 
                                       verbose_name=_("Compte d'immobilisation"))
    account_depreciation_id = models.ForeignKey(Account, on_delete=models.RESTRICT, 
                                             related_name='depreciation_categories', 
                                             verbose_name=_("Compte d'amortissement"))
    account_expense_id = models.ForeignKey(Account, on_delete=models.RESTRICT, 
                                        related_name='expense_categories', 
                                        verbose_name=_("Compte de charges"))
    method = models.CharField(_("Méthode d'amortissement"), max_length=20, choices=[
        ('linear', _('Linéaire')),
        ('degressive', _('Dégressif')),
    ], default='linear')
    duration_years = models.IntegerField(_("Durée (années)"))
    
    class Meta:
        verbose_name = _("Catégorie d'immobilisation")
        verbose_name_plural = _("Catégories d'immobilisations")
        ordering = ['name']

    def __str__(self):
        return self.name

class Asset(models.Model):
    """Immobilisations."""
    name = models.CharField(_("Nom"), max_length=200)
    code = models.CharField(_("Code"), max_length=50, unique=True)
    category_id = models.ForeignKey(AssetCategory, on_delete=models.RESTRICT, 
                                  related_name='assets', verbose_name=_("Catégorie"))
    acquisition_date = models.DateField(_("Date d'acquisition"))
    acquisition_value = models.DecimalField(_("Valeur d'acquisition"), max_digits=15, decimal_places=2)
    salvage_value = models.DecimalField(_("Valeur résiduelle"), max_digits=15, decimal_places=2, default=0)
    
    # Méthode d'amortissement spécifique (override de la catégorie si besoin)
    method = models.CharField(_("Méthode d'amortissement"), max_length=20, choices=[
        ('linear', _('Linéaire')),
        ('degressive', _('Dégressif')),
    ], null=True, blank=True)
    
    # Durée spécifique (override de la catégorie si besoin)
    duration_years = models.IntegerField(_("Durée (années)"), null=True, blank=True)
    
    state = models.CharField(_("État"), max_length=20, choices=[
        ('draft', _('Brouillon')),
        ('open', _('En cours')),
        ('close', _('Clôturé')),
        ('sold', _('Cédé')),
    ], default='draft')
    
    # Dates d'amortissement
    first_depreciation_date = models.DateField(_("Date de début d'amortissement"), null=True, blank=True)
    
    # Écriture d'acquisition
    acquisition_move_id = models.ForeignKey(JournalEntry, on_delete=models.SET_NULL, 
                                          null=True, blank=True, related_name='acquired_assets', 
                                          verbose_name=_("Écriture d'acquisition"))
    
    note = models.TextField(_("Note"), blank=True)
    created_at = models.DateTimeField(_("Créé le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Modifié le"), auto_now=True)
    
    class Meta:
        verbose_name = _("Immobilisation")
        verbose_name_plural = _("Immobilisations")
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.name}"
    
    @property
    def depreciation_method(self):
        """Retourne la méthode d'amortissement effective."""
        return self.method or self.category_id.method
    
    @property
    def depreciation_duration(self):
        """Retourne la durée d'amortissement effective (en années)."""
        return self.duration_years or self.category_id.duration_years
    
    @property
    def depreciation_value(self):
        """Valeur amortissable."""
        return self.acquisition_value - self.salvage_value
    
    def compute_depreciation_board(self):
        """Calcule le tableau d'amortissement."""
        # Vérifier l'état de l'immobilisation
        if self.state not in ['draft', 'open']:
            raise ValidationError(_("Impossible de calculer l'amortissement pour une immobilisation clôturée ou cédée"))
        
        # Déterminer la date de début d'amortissement
        if self.first_depreciation_date:
            start_date = self.first_depreciation_date
        else:
            start_date = self.acquisition_date
        
        # Déterminer la méthode et la durée
        method = self.depreciation_method
        duration_years = self.depreciation_duration
        duration_months = duration_years * 12
        
        # Supprimer les anciennes lignes si elles existent
        AssetDepreciation.objects.filter(asset_id=self).delete()
        
        # Calculer le montant d'amortissement annuel
        annual_amount = self.depreciation_value / duration_years
        
        # Pour la méthode linéaire
        if method == 'linear':
            monthly_amount = annual_amount / 12
            
            # Générer les lignes d'amortissement
            current_date = start_date
            remaining_value = self.depreciation_value
            sequence = 1
            
            while remaining_value > 0 and sequence <= duration_months:
                # Déterminer le montant de cette dotation
                if sequence == duration_months:
                    # Dernière dotation: prendre le reste
                    amount = remaining_value
                else:
                    amount = monthly_amount
                
                # Créer la ligne d'amortissement
                AssetDepreciation.objects.create(
                    asset_id=self,
                    name=f"Dotation {sequence}",
                    sequence=sequence,
                    date=current_date,
                    amount=amount,
                    remaining_value=remaining_value - amount
                )
                
                # Mettre à jour les valeurs pour la prochaine dotation
                remaining_value -= amount
                sequence += 1
                
                # Passer au mois suivant
                if current_date.month == 12:
                    current_date = current_date.replace(year=current_date.year + 1, month=1)
                else:
                    current_date = current_date.replace(month=current_date.month + 1)
        
        # Pour la méthode dégressive
        elif method == 'degressive':
            # Taux dégressif = taux linéaire * coefficient fiscal
            base_rate = 1 / duration_years
            if duration_years <= 4:
                coefficient = 1.5
            elif duration_years <= 6:
                coefficient = 2
            else:
                coefficient = 2.5
            
            degressive_rate = base_rate * coefficient
            
            # Générer les lignes d'amortissement annuelles
            current_date = start_date
            remaining_value = self.depreciation_value
            sequence = 1
            
            for year in range(1, duration_years + 1):
                # Déterminer le montant de cette dotation
                if year == duration_years:
                    # Dernière dotation: prendre le reste
                    amount = remaining_value
                else:
                    # Application du taux dégressif
                    base_amount = remaining_value
                    
                    # Calcul de l'amortissement linéaire restant pour comparaison
                    linear_remaining = base_amount / (duration_years - year + 1)
                    
                    # Calcul de l'amortissement dégressif
                    degressive_amount = base_amount * degressive_rate
                    
                    # On prend le plus grand des deux
                    amount = max(linear_remaining, degressive_amount)
                
                # Créer la ligne d'amortissement
                AssetDepreciation.objects.create(
                    asset_id=self,
                    name=f"Dotation {sequence}",
                    sequence=sequence,
                    date=current_date,
                    amount=amount,
                    remaining_value=remaining_value - amount
                )
                
                # Mettre à jour les valeurs pour la prochaine dotation
                remaining_value -= amount
                sequence += 1
                
                # Passer à l'année suivante
                current_date = current_date.replace(year=current_date.year + 1)
        
        # Mettre à jour l'état de l'immobilisation
        if self.state == 'draft':
            self.state = 'open'
            self.save(update_fields=['state'])

class AssetDepreciation(models.Model):
    """Dotations aux amortissements."""
    asset_id = models.ForeignKey(Asset, on_delete=models.CASCADE, 
                               related_name='depreciation_lines', verbose_name=_("Immobilisation"))
    name = models.CharField(_("Nom"), max_length=100)
    sequence = models.IntegerField(_("Séquence"))
    date = models.DateField(_("Date d'amortissement"))
    amount = models.DecimalField(_("Montant"), max_digits=15, decimal_places=2)
    remaining_value = models.DecimalField(_("Valeur restante"), max_digits=15, decimal_places=2)
    
    # Écriture d'amortissement
    move_id = models.ForeignKey(JournalEntry, on_delete=models.SET_NULL, 
                              null=True, blank=True, related_name='depreciation_lines', 
                              verbose_name=_("Écriture d'amortissement"))
    
    state = models.CharField(_("État"), max_length=20, choices=[
        ('draft', _('Brouillon')),
        ('posted', _('Comptabilisé')),
        ('cancel', _('Annulé')),
    ], default='draft')
    
    created_at = models.DateTimeField(_("Créé le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Modifié le"), auto_now=True)
    
    class Meta:
        verbose_name = _("Dotation aux amortissements")
        verbose_name_plural = _("Dotations aux amortissements")
        ordering = ['asset_id', 'sequence']

    def __str__(self):
        return f"{self.asset_id.code} - {self.name} ({self.date})"
