from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from django.http import HttpResponse
from django.shortcuts import render, redirect
from django.urls import reverse
from django.db.models import Sum
from datetime import datetime
from django import forms

from .models import (
    AccountType, Account, Journal, FiscalYear, FiscalPeriod,
    JournalEntry, JournalEntryLine, Reconciliation,
    BankStatement, BankStatementLine, AnalyticAccount,
    Tax, AssetCategory, Asset, AssetDepreciation
)

class JournalEntryLineInline(admin.TabularInline):
    """Inline pour les lignes d'écritures comptables."""
    model = JournalEntryLine
    extra = 3
    fields = ('account_id', 'name', 'partner_id', 'debit', 'credit', 'date_maturity', 'analytic_account_id')

@admin.register(AccountType)
class AccountTypeAdmin(admin.ModelAdmin):
    """Configuration d'administration pour les types de comptes."""
    list_display = ('code', 'name', 'is_debit', 'sequence')
    list_filter = ('is_debit',)
    search_fields = ('code', 'name')
    ordering = ('sequence', 'code')

@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    """Configuration d'administration pour les comptes comptables."""
    list_display = ('code', 'name', 'type_id', 'parent_id', 'is_reconcilable', 'is_active')
    list_filter = ('type_id', 'is_active', 'is_reconcilable', 'is_tax_account')
    search_fields = ('code', 'name')
    ordering = ('code',)
    
    fieldsets = (
        (None, {
            'fields': ('code', 'name', 'type_id', 'parent_id', 'description')
        }),
        (_('Attributs'), {
            'fields': ('is_reconcilable', 'is_active')
        }),
        (_('TVA'), {
            'fields': ('is_tax_account', 'tax_type', 'tax_rate'),
            'classes': ('collapse',),
        }),
    )

@admin.register(Journal)
class JournalAdmin(admin.ModelAdmin):
    """Configuration d'administration pour les journaux comptables."""
    list_display = ('code', 'name', 'type', 'default_debit_account_id', 'default_credit_account_id', 'active')
    list_filter = ('type', 'active')
    search_fields = ('code', 'name')
    ordering = ('code',)

    fieldsets = (
        (None, {
            'fields': ('code', 'name', 'type', 'active')
        }),
        (_('Comptes par défaut'), {
            'fields': ('default_debit_account_id', 'default_credit_account_id')
        }),
        (_('Séquence'), {
            'fields': ('sequence_id',)
        }),
    )

@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    """Configuration d'administration pour les écritures comptables."""
    list_display = ('name', 'journal_id', 'date', 'narration', 'total_debit', 'total_credit', 'state')
    list_filter = ('journal_id', 'state', 'is_manual')
    search_fields = ('name', 'ref', 'narration')
    date_hierarchy = 'date'
    ordering = ('-date', 'journal_id', 'name')
    inlines = [JournalEntryLineInline]
    readonly_fields = ('created_at', 'updated_at')
    actions = ['action_post', 'action_cancel']
    
    fieldsets = (
        (None, {
            'fields': ('journal_id', 'name', 'date', 'period_id', 'ref', 'state')
        }),
        (_('Informations'), {
            'fields': ('narration', 'is_manual')
        }),
        (_('Origine'), {
            'fields': ('source_module', 'source_model', 'source_id'),
            'classes': ('collapse',),
        }),
        (_('Métadonnées'), {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
    
    def get_readonly_fields(self, request, obj=None):
        """Rend certains champs en lecture seule selon l'état."""
        if obj and obj.state != 'draft':
            return ('journal_id', 'name', 'date', 'period_id', 'ref', 'narration', 'is_manual',
                    'source_module', 'source_model', 'source_id', 'created_by', 'created_at', 'updated_at')
        return ('created_at', 'updated_at')
    
    def has_change_permission(self, request, obj=None):
        """N'autorise la modification que pour les écritures en brouillon."""
        if obj and obj.state != 'draft':
            return False
        return super().has_change_permission(request, obj)
    
    def save_model(self, request, obj, form, change):
        """Personnalise la sauvegarde du modèle."""
        if not change:  # Création
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
    
    def action_post(self, request, queryset):
        """Action pour valider les écritures sélectionnées."""
        count = 0
        errors = 0
        
        for entry in queryset.filter(state='draft'):
            try:
                entry.post()
                count += 1
            except Exception as e:
                self.message_user(request, f"Erreur lors de la validation de l'écriture {entry.name}: {str(e)}", level='ERROR')
                errors += 1
        
        if count:
            self.message_user(request, _("%(count)d écriture(s) validée(s) avec succès.") % {'count': count})
        if errors:
            self.message_user(request, _("%(count)d écriture(s) n'ont pas pu être validées.") % {'count': errors}, level='WARNING')
    action_post.short_description = _("Valider les écritures sélectionnées")
    
    def action_cancel(self, request, queryset):
        """Action pour annuler les écritures sélectionnées."""
        count = 0
        errors = 0
        
        for entry in queryset.filter(state='posted'):
            try:
                entry.cancel()
                count += 1
            except Exception as e:
                self.message_user(request, f"Erreur lors de l'annulation de l'écriture {entry.name}: {str(e)}", level='ERROR')
                errors += 1
        
        if count:
            self.message_user(request, _("%(count)d écriture(s) annulée(s) avec succès.") % {'count': count})
        if errors:
            self.message_user(request, _("%(count)d écriture(s) n'ont pas pu être annulées.") % {'count': errors}, level='WARNING')
    action_cancel.short_description = _("Annuler les écritures sélectionnées")

@admin.register(JournalEntryLine)
class JournalEntryLineAdmin(admin.ModelAdmin):
    """Configuration d'administration pour les lignes d'écritures comptables."""
    list_display = ('entry_id', 'account_id', 'name', 'partner_id', 'debit', 'credit', 'is_reconciled')
    list_filter = ('is_reconciled', 'account_id__type_id')
    search_fields = ('name', 'ref', 'entry_id__name', 'account_id__code', 'account_id__name')
    date_hierarchy = 'entry_id__date'
    ordering = ('-entry_id__date', 'entry_id', 'id')
    readonly_fields = ('created_at', 'updated_at')
    actions = ['action_reconcile']
    
    fieldsets = (
        (None, {
            'fields': ('entry_id', 'account_id', 'name', 'partner_id')
        }),
        (_('Montants'), {
            'fields': ('debit', 'credit')
        }),
        (_('Devises'), {
            'fields': ('currency_id', 'amount_currency'),
            'classes': ('collapse',),
        }),
        (_('Échéances et lettrage'), {
            'fields': ('date_maturity', 'is_reconciled', 'reconciliation_id')
        }),
        (_('Analytique et taxes'), {
            'fields': ('analytic_account_id', 'tax_line_id', 'tax_base_amount'),
            'classes': ('collapse',),
        }),
        (_('Informations complémentaires'), {
            'fields': ('ref', 'created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
    
    def has_change_permission(self, request, obj=None):
        """N'autorise pas la modification des lignes dont l'écriture est validée."""
        if obj and obj.entry_id.state != 'draft':
            return False
        return super().has_change_permission(request, obj)
    
    def action_reconcile(self, request, queryset):
        """Action pour lettrer les lignes sélectionnées."""
        # Vérifier que les lignes peuvent être lettrées
        if queryset.filter(is_reconciled=True).exists():
            self.message_user(request, _("Certaines lignes sont déjà lettrées."), level='ERROR')
            return
        
        # Vérifier que les lignes sont du même compte
        account_ids = queryset.values_list('account_id', flat=True).distinct()
        if len(account_ids) != 1:
            self.message_user(request, _("Les lignes à lettrer doivent concerner le même compte."), level='ERROR')
            return
        
        account = Account.objects.get(id=account_ids[0])
        if not account.is_reconcilable:
            self.message_user(request, _("Le compte sélectionné n'est pas lettrable."), level='ERROR')
            return
        
        # Vérifier l'équilibre des lignes
        debit_sum = queryset.aggregate(sum=Sum('debit'))['sum'] or 0
        credit_sum = queryset.aggregate(sum=Sum('credit'))['sum'] or 0
        balance = debit_sum - credit_sum
        
        if abs(balance) > 0.01:  # Tolérance pour les erreurs d'arrondi
            self.message_user(request, _("Les lignes sélectionnées ne sont pas équilibrées (différence de %(balance).2f).") % 
                             {'balance': balance}, level='ERROR')
            return
        
        # Créer le lettrage
        reconciliation = Reconciliation.objects.create(
            name=f"R-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            date=datetime.now().date(),
            account_id=account,
            created_by=request.user
        )
        
        # Mettre à jour les lignes
        queryset.update(is_reconciled=True, reconciliation_id=reconciliation)
        
        self.message_user(request, _("%(count)d lignes ont été lettrées avec succès.") % {'count': queryset.count()})
    action_reconcile.short_description = _("Lettrer les lignes sélectionnées")

@admin.register(Reconciliation)
class ReconciliationAdmin(admin.ModelAdmin):
    """Configuration d'administration pour les lettrages comptables."""
    list_display = ('name', 'date', 'account_id', 'created_by')
    list_filter = ('account_id__type_id',)
    search_fields = ('name', 'account_id__code', 'account_id__name')
    date_hierarchy = 'date'
    ordering = ('-date', 'name')
    
    fieldsets = (
        (None, {
            'fields': ('name', 'date', 'account_id', 'created_by')
        }),
    )
    
    def has_change_permission(self, request, obj=None):
        """Les lettrages ne sont pas modifiables."""
        return False

@admin.register(FiscalYear)
class FiscalYearAdmin(admin.ModelAdmin):
    """Configuration d'administration pour les exercices fiscaux."""
    list_display = ('name', 'start_date', 'end_date', 'state')
    list_filter = ('state',)
    search_fields = ('name',)
    ordering = ('-start_date',)
    actions = ['action_open', 'action_close', 'action_create_periods']
    
    fieldsets = (
        (None, {
            'fields': ('name', 'start_date', 'end_date', 'state')
        }),
    )
    
    def action_open(self, request, queryset):
        """Action pour ouvrir les exercices sélectionnés."""
        count = 0
        
        for year in queryset.filter(state='draft'):
            year.state = 'open'
            year.save(update_fields=['state'])
            count += 1
        
        if count:
            self.message_user(request, _("%(count)d exercice(s) ouvert(s) avec succès.") % {'count': count})
    action_open.short_description = _("Ouvrir les exercices sélectionnés")
    
    def action_close(self, request, queryset):
        """Action pour clôturer les exercices sélectionnés."""
        count = 0
        errors = 0
        
        for year in queryset.filter(state='open'):
            # Vérifier si toutes les périodes sont clôturées
            if year.periods.filter(state='open').exists():
                self.message_user(request, _(f"L'exercice {year.name} a des périodes encore ouvertes."), level='ERROR')
                errors += 1
                continue
            
            year.state = 'closed'
            year.save(update_fields=['state'])
            count += 1
        
        if count:
            self.message_user(request, _("%(count)d exercice(s) clôturé(s) avec succès.") % {'count': count})
        if errors:
            self.message_user(request, _("%(count)d exercice(s) n'ont pas pu être clôturés.") % {'count': errors}, level='WARNING')
    action_close.short_description = _("Clôturer les exercices sélectionnés")
    
    def action_create_periods(self, request, queryset):
        """Action pour créer les périodes fiscales des exercices sélectionnés."""
        count = 0
        
        for year in queryset:
            year.create_periods()
            count += 1
        
        if count:
            self.message_user(request, _("Périodes créées pour %(count)d exercice(s).") % {'count': count})
    action_create_periods.short_description = _("Créer les périodes fiscales")

@admin.register(FiscalPeriod)
class FiscalPeriodAdmin(admin.ModelAdmin):
    """Configuration d'administration pour les périodes fiscales."""
    list_display = ('name', 'fiscal_year', 'start_date', 'end_date', 'state')
    list_filter = ('fiscal_year', 'state')
    search_fields = ('name', 'fiscal_year__name')
    date_hierarchy = 'start_date'
    ordering = ('start_date',)
    actions = ['action_open', 'action_close']
    
    fieldsets = (
        (None, {
            'fields': ('fiscal_year', 'name', 'start_date', 'end_date', 'state')
        }),
    )
    
    def action_open(self, request, queryset):
        """Action pour ouvrir les périodes sélectionnées."""
        count = 0
        errors = 0
        
        for period in queryset.filter(state='draft'):
            # Vérifier si l'exercice est ouvert
            if period.fiscal_year.state != 'open':
                self.message_user(request, _(f"La période {period.name} appartient à un exercice non ouvert."), level='ERROR')
                errors += 1
                continue
            
            period.state = 'open'
            period.save(update_fields=['state'])
            count += 1
        
        if count:
            self.message_user(request, _("%(count)d période(s) ouverte(s) avec succès.") % {'count': count})
        if errors:
            self.message_user(request, _("%(count)d période(s) n'ont pas pu être ouvertes.") % {'count': errors}, level='WARNING')
    action_open.short_description = _("Ouvrir les périodes sélectionnées")
    
    def action_close(self, request, queryset):
        """Action pour clôturer les périodes sélectionnées."""
        count = 0
        
        for period in queryset.filter(state='open'):
            period.state = 'closed'
            period.save(update_fields=['state'])
            count += 1
        
        if count:
            self.message_user(request, _("%(count)d période(s) clôturée(s) avec succès.") % {'count': count})
    action_close.short_description = _("Clôturer les périodes sélectionnées")

@admin.register(AnalyticAccount)
class AnalyticAccountAdmin(admin.ModelAdmin):
    """Configuration d'administration pour les comptes analytiques."""
    list_display = ('code', 'name', 'parent_id', 'active')
    list_filter = ('active',)
    search_fields = ('code', 'name')
    ordering = ('code',)
    
    fieldsets = (
        (None, {
            'fields': ('code', 'name', 'parent_id', 'active')
        }),
    )

@admin.register(Tax)
class TaxAdmin(admin.ModelAdmin):
    """Configuration d'administration pour les taxes."""
    list_display = ('name', 'amount', 'type', 'tax_category', 'account_id', 'active')
    list_filter = ('type', 'tax_category', 'active', 'is_deductible')
    search_fields = ('name', 'description')
    ordering = ('name',)
    
    fieldsets = (
        (None, {
            'fields': ('name', 'description', 'amount', 'type', 'active')
        }),
        (_('Comptabilité'), {
            'fields': ('account_id', 'tax_category', 'is_deductible')
        }),
    )

class BankStatementLineInline(admin.TabularInline):
    """Inline pour les lignes de relevé bancaire."""
    model = BankStatementLine
    extra = 3
    fields = ('date', 'name', 'ref', 'partner_id', 'amount', 'is_reconciled', 'note')

@admin.register(BankStatement)
class BankStatementAdmin(admin.ModelAdmin):
    """Configuration d'administration pour les relevés bancaires."""
    list_display = ('name', 'journal_id', 'date', 'balance_start', 'balance_end', 'balance_end_real', 'difference', 'state')
    list_filter = ('journal_id', 'state')
    search_fields = ('name', 'reference')
    date_hierarchy = 'date'
    ordering = ('-date', 'name')
    inlines = [BankStatementLineInline]
    readonly_fields = ('created_at', 'updated_at')
    actions = ['action_confirm']
    
    fieldsets = (
        (None, {
            'fields': ('journal_id', 'name', 'date', 'reference', 'state')
        }),
        (_('Soldes'), {
            'fields': ('balance_start', 'balance_end', 'balance_end_real')
        }),
        (_('Métadonnées'), {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
    
    def get_readonly_fields(self, request, obj=None):
        """Rend certains champs en lecture seule selon l'état."""
        if obj and obj.state != 'draft':
            return ('journal_id', 'name', 'date', 'reference', 'balance_start', 'balance_end', 
                    'created_by', 'created_at', 'updated_at')
        return ('created_at', 'updated_at')
    
    def has_change_permission(self, request, obj=None):
        """N'autorise la modification que pour les relevés en brouillon."""
        if obj and obj.state == 'confirm':
            return False
        return super().has_change_permission(request, obj)
    
    def save_model(self, request, obj, form, change):
        """Personnalise la sauvegarde du modèle."""
        if not change:  # Création
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
    
    def difference(self, obj):
        """Calcule la différence entre solde calculé et solde réel."""
        if obj.balance_end_real is None:
            return "-"
        diff = obj.balance_end - obj.balance_end_real
        return f"{diff:.2f}"
    difference.short_description = _("Différence")
    
    def action_confirm(self, request, queryset):
        """Action pour confirmer les relevés sélectionnés."""
        count = 0
        
        for statement in queryset.filter(state='open'):
            statement.state = 'confirm'
            statement.save(update_fields=['state'])
            count += 1

        if count:
            self.message_user(request, _("%(count)d relevé(s) confirmé(s) avec succès.") % {'count': count})
    action_confirm.short_description = _("Confirmer les relevés sélectionnés")

@admin.register(AssetCategory)
class AssetCategoryAdmin(admin.ModelAdmin):
    """Configuration d'administration pour les catégories d'immobilisations."""
    list_display = ('name', 'method', 'duration_years', 'account_asset_id', 'account_depreciation_id', 'account_expense_id')
    list_filter = ('method',)
    search_fields = ('name',)
    ordering = ('name',)

class AssetDepreciationInline(admin.TabularInline):
    """Inline pour les dotations aux amortissements."""
    model = AssetDepreciation
    extra = 0
    fields = ('name', 'sequence', 'date', 'amount', 'remaining_value', 'state')
    readonly_fields = ('name', 'sequence', 'amount', 'remaining_value')
    can_delete = False

@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    """Configuration d'administration pour les immobilisations."""
    list_display = ('code', 'name', 'category_id', 'acquisition_date', 'acquisition_value', 'state', 'depreciation_lines_count')
    list_filter = ('category_id', 'state')
    search_fields = ('code', 'name')
    date_hierarchy = 'acquisition_date'
    ordering = ('code',)
    readonly_fields = ('created_at', 'updated_at')
    inlines = [AssetDepreciationInline]
    actions = ['action_compute_depreciation', 'action_open', 'action_close']

    fieldsets = (
        (None, {
            'fields': ('code', 'name', 'category_id', 'state')
        }),
        (_('Acquisition'), {
            'fields': ('acquisition_date', 'acquisition_value', 'salvage_value', 'acquisition_move_id')
        }),
        (_('Amortissement'), {
            'fields': ('method', 'duration_years', 'first_depreciation_date')
        }),
        (_('Métadonnées'), {
            'classes': ('collapse',),
            'fields': ('note', 'created_at', 'updated_at')
        }),
    )

    def depreciation_lines_count(self, obj):
        """Affiche le nombre de lignes d'amortissement."""
        return obj.depreciation_lines.count()
    depreciation_lines_count.short_description = _("Dotations")

    def action_compute_depreciation(self, request, queryset):
        """Action pour calculer le tableau d'amortissement."""
        count = 0
        errors = []

        for asset in queryset.filter(state__in=['draft', 'open']):
            try:
                asset.compute_depreciation_board()
                count += 1
            except Exception as e:
                errors.append(f"{asset.code}: {str(e)}")

        if count:
            self.message_user(request, _("Tableau d'amortissement calculé pour %(count)d immobilisation(s).") % {'count': count})

        if errors:
            for error in errors:
                self.message_user(request, error, level='ERROR')
    action_compute_depreciation.short_description = _("Calculer les amortissements")

    def action_open(self, request, queryset):
        """Action pour mettre en service les immobilisations sélectionnées."""
        count = 0

        for asset in queryset.filter(state='draft'):
            asset.state = 'open'
            asset.save(update_fields=['state'])
            count += 1

        if count:
            self.message_user(request, _("%(count)d immobilisation(s) mise(s) en service.") % {'count': count})
    action_open.short_description = _("Mettre en service les immobilisations sélectionnées")

    def action_close(self, request, queryset):
        """Action pour clôturer les immobilisations sélectionnées."""
        count = 0

        for asset in queryset.filter(state='open'):
            asset.state = 'close'
            asset.save(update_fields=['state'])
            count += 1

        if count:
            self.message_user(request, _("%(count)d immobilisation(s) clôturée(s).") % {'count': count})
    action_close.short_description = _("Clôturer les immobilisations sélectionnées")

@admin.register(AssetDepreciation)
class AssetDepreciationAdmin(admin.ModelAdmin):
    """Configuration d'administration pour les dotations aux amortissements."""
    list_display = ('asset_id', 'name', 'sequence', 'date', 'amount', 'remaining_value', 'state')
    list_filter = ('asset_id', 'state')
    search_fields = ('asset_id__code', 'asset_id__name', 'name')
    date_hierarchy = 'date'
    ordering = ('asset_id', 'sequence')
    readonly_fields = ('asset_id', 'name', 'sequence', 'amount', 'remaining_value')
    actions = ['action_post']

    def has_add_permission(self, request):
        return False

    def action_post(self, request, queryset):
        """Action pour comptabiliser les dotations sélectionnées."""
        from django.shortcuts import redirect
        from django.urls import reverse

        # Création d'un formulaire pour sélectionner le journal et la date
        if 'apply' not in request.POST:
            # Affichage du formulaire de confirmation
            context = {
                'title': _("Comptabiliser les dotations aux amortissements"),
                'queryset': queryset,
                'action_checkbox_name': admin.helpers.ACTION_CHECKBOX_NAME,
                'opts': self.model._meta,
                'form': PostDepreciationForm(),
            }
            return render(request, 'admin/accounting/asset_depreciation/post_depreciation.html', context)

        # Traitement du formulaire
        journal_id = request.POST.get('journal')
        date = request.POST.get('date')

        if not journal_id or not date:
            self.message_user(request, _("Journal et date requis"), level='ERROR')
            return redirect(reverse('admin:accounting_assetdepreciation_changelist'))

        # Comptabiliser les dotations
        count = 0
        errors = []

        for depreciation in queryset.filter(state='draft'):
            try:
                # Créer l'écriture comptable
                from .models import Journal, JournalEntry, JournalEntryLine, FiscalPeriod

                # Récupérer le journal et la période
                journal = Journal.objects.get(id=journal_id)
                depreciation_date = datetime.strptime(date, '%Y-%m-%d').date()

                try:
                    period = FiscalPeriod.objects.get(
                        start_date__lte=depreciation_date,
                        end_date__gte=depreciation_date,
                        state='open'
                    )
                except FiscalPeriod.DoesNotExist:
                    errors.append(f"{depreciation.asset_id.code}: {_('Aucune période fiscale ouverte pour cette date')}")
                    continue

                # Créer l'écriture
                entry = JournalEntry.objects.create(
                    journal_id=journal,
                    name=journal.next_sequence(depreciation_date),
                    date=depreciation_date,
                    period_id=period,
                    ref=f"DOTATION-{depreciation.asset_id.code}",
                    narration=f"Dotation aux amortissements - {depreciation.asset_id.name}",
                    source_module='accounting',
                    source_model='AssetDepreciation',
                    source_id=depreciation.id,
                    is_manual=False,
                    created_by=request.user
                )

                # Créer les lignes
                JournalEntryLine.objects.create(
                    entry_id=entry,
                    account_id=depreciation.asset_id.category_id.account_expense_id,
                    name=f"Dotation aux amortissements - {depreciation.asset_id.name}",
                    debit=depreciation.amount,
                    credit=0,
                    date=entry.date
                )

                JournalEntryLine.objects.create(
                    entry_id=entry,
                    account_id=depreciation.asset_id.category_id.account_depreciation_id,
                    name=f"Dotation aux amortissements - {depreciation.asset_id.name}",
                    debit=0,
                    credit=depreciation.amount,
                    date=entry.date
                )

                # Valider l'écriture
                entry.post()

                # Mettre à jour la dotation
                depreciation.move_id = entry
                depreciation.state = 'posted'
                depreciation.save(update_fields=['move_id', 'state'])

                count += 1
            except Exception as e:
                errors.append(f"{depreciation.asset_id.code}: {str(e)}")

        if count:
            self.message_user(request, _("%(count)d dotation(s) comptabilisée(s) avec succès.") % {'count': count})

        if errors:
            for error in errors:
                self.message_user(request, error, level='ERROR')

        return redirect(reverse('admin:accounting_assetdepreciation_changelist'))
    action_post.short_description = _("Comptabiliser les dotations sélectionnées")

# Formulaires personnalisés pour les actions d'administration
class PostDepreciationForm(forms.Form):
    """Formulaire pour comptabiliser les dotations aux amortissements."""
    journal = forms.ModelChoiceField(
        queryset=Journal.objects.filter(type='general', active=True),
        label=_("Journal"),
        required=True
    )
    date = forms.DateField(
        label=_("Date de comptabilisation"),
        required=True,
        widget=forms.DateInput(attrs={'type': 'date'})
    )
