from rest_framework import serializers
from django.db.models import Sum
from decimal import Decimal

from .models import (
    AccountType, Account, Journal, FiscalYear, FiscalPeriod,
    JournalEntry, JournalEntryLine, Reconciliation,
    BankStatement, BankStatementLine, AnalyticAccount,
    Tax, AssetCategory, Asset, AssetDepreciation
)

class AccountTypeSerializer(serializers.ModelSerializer):
    """Serializer pour les types de comptes comptables."""
    class Meta:
        model = AccountType
        fields = ['id', 'code', 'name', 'is_debit', 'sequence']

class AccountSerializer(serializers.ModelSerializer):
    """Serializer pour les comptes comptables."""
    type_name = serializers.SerializerMethodField()
    parent_code = serializers.SerializerMethodField()
    parent_name = serializers.SerializerMethodField()
    balance = serializers.SerializerMethodField()

    class Meta:
        model = Account
        fields = [
            'id', 'code', 'name', 'type_id', 'type_name', 
            'parent_id', 'parent_code', 'parent_name',
            'is_reconcilable', 'is_active', 
            'is_tax_account', 'tax_type', 'tax_rate',
            'balance'
        ]

    def get_type_name(self, obj):
        return obj.type_id.name if obj.type_id else None

    def get_parent_code(self, obj):
        return obj.parent_id.code if obj.parent_id else None

    def get_parent_name(self, obj):
        return obj.parent_id.name if obj.parent_id else None

    def get_balance(self, obj):
        # On peut récupérer les dates du contexte pour le calcul du solde
        request = self.context.get('request', None)
        start_date = None
        end_date = None
        
        if request:
            start_date = request.query_params.get('start_date', None)
            end_date = request.query_params.get('end_date', None)
            
        # Utiliser la méthode du modèle pour calculer le solde
        balance = obj.get_balance(start_date=start_date, end_date=end_date)
        return float(balance)

class AccountDetailSerializer(serializers.ModelSerializer):
    """Serializer détaillé pour les comptes comptables."""
    type_name = serializers.SerializerMethodField()
    parent_code = serializers.SerializerMethodField()
    parent_name = serializers.SerializerMethodField()
    children = serializers.SerializerMethodField()
    balance = serializers.SerializerMethodField()

    class Meta:
        model = Account
        fields = [
            'id', 'code', 'name', 'type_id', 'type_name', 
            'parent_id', 'parent_code', 'parent_name',
            'is_reconcilable', 'is_active', 
            'is_tax_account', 'tax_type', 'tax_rate',
            'description', 'created_at', 'updated_at',
            'children', 'balance'
        ]

    def get_type_name(self, obj):
        return obj.type_id.name if obj.type_id else None

    def get_parent_code(self, obj):
        return obj.parent_id.code if obj.parent_id else None

    def get_parent_name(self, obj):
        return obj.parent_id.name if obj.parent_id else None

    def get_children(self, obj):
        return AccountSerializer(obj.children.all(), many=True).data

    def get_balance(self, obj):
        # On peut récupérer les dates du contexte pour le calcul du solde
        request = self.context.get('request', None)
        start_date = None
        end_date = None
        
        if request:
            start_date = request.query_params.get('start_date', None)
            end_date = request.query_params.get('end_date', None)
            
        # Utiliser la méthode du modèle pour calculer le solde
        balance = obj.get_balance(start_date=start_date, end_date=end_date)
        return float(balance)

class JournalSerializer(serializers.ModelSerializer):
    """Serializer pour les journaux comptables."""
    default_debit_account_code = serializers.SerializerMethodField()
    default_debit_account_name = serializers.SerializerMethodField()
    default_credit_account_code = serializers.SerializerMethodField()
    default_credit_account_name = serializers.SerializerMethodField()

    class Meta:
        model = Journal
        fields = [
            'id', 'code', 'name', 'type', 
            'default_debit_account_id', 'default_debit_account_code', 'default_debit_account_name',
            'default_credit_account_id', 'default_credit_account_code', 'default_credit_account_name',
            'sequence_id', 'active'
        ]

    def get_default_debit_account_code(self, obj):
        return obj.default_debit_account_id.code if obj.default_debit_account_id else None

    def get_default_debit_account_name(self, obj):
        return obj.default_debit_account_id.name if obj.default_debit_account_id else None

    def get_default_credit_account_code(self, obj):
        return obj.default_credit_account_id.code if obj.default_credit_account_id else None

    def get_default_credit_account_name(self, obj):
        return obj.default_credit_account_id.name if obj.default_credit_account_id else None

class JournalEntryLineSerializer(serializers.ModelSerializer):
    """Serializer pour les lignes d'écritures comptables."""
    account_code = serializers.SerializerMethodField()
    account_name = serializers.SerializerMethodField()
    partner_name = serializers.SerializerMethodField()
    currency_code = serializers.SerializerMethodField()
    analytic_account_code = serializers.SerializerMethodField()
    analytic_account_name = serializers.SerializerMethodField()
    tax_name = serializers.SerializerMethodField()

    class Meta:
        model = JournalEntryLine
        fields = [
            'id', 'account_id', 'account_code', 'account_name', 
            'name', 'partner_id', 'partner_name',
            'debit', 'credit', 'currency_id', 'currency_code', 'amount_currency',
            'date_maturity', 'is_reconciled', 'reconciliation_id',
            'analytic_account_id', 'analytic_account_code', 'analytic_account_name',
            'tax_line_id', 'tax_name', 'tax_base_amount',
            'ref'
        ]

    def get_account_code(self, obj):
        return obj.account_id.code if obj.account_id else None

    def get_account_name(self, obj):
        return obj.account_id.name if obj.account_id else None

    def get_partner_name(self, obj):
        return obj.partner_id.name if obj.partner_id else None

    def get_currency_code(self, obj):
        return obj.currency_id.code if obj.currency_id else None

    def get_analytic_account_code(self, obj):
        return obj.analytic_account_id.code if obj.analytic_account_id else None

    def get_analytic_account_name(self, obj):
        return obj.analytic_account_id.name if obj.analytic_account_id else None

    def get_tax_name(self, obj):
        return obj.tax_line_id.name if obj.tax_line_id else None

class JournalEntryLineCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de lignes d'écritures comptables."""
    class Meta:
        model = JournalEntryLine
        fields = [
            'account_id', 'name', 'partner_id',
            'debit', 'credit', 'currency_id', 'amount_currency',
            'date_maturity', 'analytic_account_id',
            'tax_line_id', 'tax_base_amount', 'ref'
        ]

class JournalEntrySerializer(serializers.ModelSerializer):
    """Serializer pour les écritures comptables."""
    journal_code = serializers.SerializerMethodField()
    journal_name = serializers.SerializerMethodField()
    period_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    total_debit = serializers.SerializerMethodField()
    total_credit = serializers.SerializerMethodField()
    is_balanced = serializers.SerializerMethodField()
    state_display = serializers.SerializerMethodField()

    class Meta:
        model = JournalEntry
        fields = [
            'id', 'name', 'journal_id', 'journal_code', 'journal_name',
            'date', 'period_id', 'period_name', 'ref', 'state', 'state_display',
            'source_module', 'source_model', 'source_id',
            'narration', 'is_manual', 'created_by', 'created_by_name',
            'created_at', 'updated_at', 'total_debit', 'total_credit', 'is_balanced'
        ]

    def get_journal_code(self, obj):
        return obj.journal_id.code if obj.journal_id else None

    def get_journal_name(self, obj):
        return obj.journal_id.name if obj.journal_id else None

    def get_period_name(self, obj):
        return obj.period_id.name if obj.period_id else None

    def get_created_by_name(self, obj):
        return f"{obj.created_by.first_name} {obj.created_by.last_name}" if obj.created_by else None

    def get_total_debit(self, obj):
        return float(obj.total_debit)

    def get_total_credit(self, obj):
        return float(obj.total_credit)

    def get_is_balanced(self, obj):
        return obj.is_balanced

    def get_state_display(self, obj):
        return obj.get_state_display()

class JournalEntryDetailSerializer(serializers.ModelSerializer):
    """Serializer détaillé pour les écritures comptables."""
    journal_code = serializers.SerializerMethodField()
    journal_name = serializers.SerializerMethodField()
    period_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    total_debit = serializers.SerializerMethodField()
    total_credit = serializers.SerializerMethodField()
    is_balanced = serializers.SerializerMethodField()
    state_display = serializers.SerializerMethodField()
    lines = JournalEntryLineSerializer(many=True, read_only=True)

    class Meta:
        model = JournalEntry
        fields = [
            'id', 'name', 'journal_id', 'journal_code', 'journal_name',
            'date', 'period_id', 'period_name', 'ref', 'state', 'state_display',
            'source_module', 'source_model', 'source_id',
            'narration', 'is_manual', 'created_by', 'created_by_name',
            'created_at', 'updated_at', 'total_debit', 'total_credit', 'is_balanced',
            'lines'
        ]

    def get_journal_code(self, obj):
        return obj.journal_id.code if obj.journal_id else None

    def get_journal_name(self, obj):
        return obj.journal_id.name if obj.journal_id else None

    def get_period_name(self, obj):
        return obj.period_id.name if obj.period_id else None

    def get_created_by_name(self, obj):
        return f"{obj.created_by.first_name} {obj.created_by.last_name}" if obj.created_by else None

    def get_total_debit(self, obj):
        return float(obj.total_debit)

    def get_total_credit(self, obj):
        return float(obj.total_credit)

    def get_is_balanced(self, obj):
        return obj.is_balanced

    def get_state_display(self, obj):
        return obj.get_state_display()

class JournalEntryCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création d'écritures comptables."""
    lines = JournalEntryLineCreateSerializer(many=True)

    class Meta:
        model = JournalEntry
        fields = [
            'journal_id', 'date', 'ref', 'narration', 'lines'
        ]

    def create(self, validated_data):
        lines_data = validated_data.pop('lines')
        
        # Récupérer la période fiscale
        from .models import FiscalPeriod
        try:
            period = FiscalPeriod.objects.get(
                start_date__lte=validated_data['date'],
                end_date__gte=validated_data['date'],
                state='open'
            )
        except FiscalPeriod.DoesNotExist:
            raise serializers.ValidationError("Aucune période fiscale ouverte pour cette date")
        
        # Créer l'écriture
        validated_data['period_id'] = period
        validated_data['state'] = 'draft'
        validated_data['is_manual'] = True
        validated_data['created_by'] = self.context['request'].user
        
        entry = JournalEntry.objects.create(**validated_data)
        
        # Créer les lignes
        for line_data in lines_data:
            JournalEntryLine.objects.create(entry_id=entry, **line_data)
        
        return entry

class FiscalYearSerializer(serializers.ModelSerializer):
    """Serializer pour les exercices fiscaux."""
    state_display = serializers.SerializerMethodField()
    periods_count = serializers.SerializerMethodField()

    class Meta:
        model = FiscalYear
        fields = ['id', 'name', 'start_date', 'end_date', 'state', 'state_display', 'periods_count']

    def get_state_display(self, obj):
        return obj.get_state_display()

    def get_periods_count(self, obj):
        return obj.periods.count()

class FiscalPeriodSerializer(serializers.ModelSerializer):
    """Serializer pour les périodes fiscales."""
    fiscal_year_name = serializers.SerializerMethodField()
    state_display = serializers.SerializerMethodField()

    class Meta:
        model = FiscalPeriod
        fields = ['id', 'fiscal_year', 'fiscal_year_name', 'name', 'start_date', 'end_date', 'state', 'state_display']

    def get_fiscal_year_name(self, obj):
        return obj.fiscal_year.name if obj.fiscal_year else None

    def get_state_display(self, obj):
        return obj.get_state_display()

class ReconciliationSerializer(serializers.ModelSerializer):
    """Serializer pour les lettrages comptables."""
    account_code = serializers.SerializerMethodField()
    account_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    lines_count = serializers.SerializerMethodField()
    balance = serializers.SerializerMethodField()

    class Meta:
        model = Reconciliation
        fields = [
            'id', 'name', 'date', 'account_id', 'account_code', 'account_name',
            'created_by', 'created_by_name', 'created_at', 'lines_count', 'balance'
        ]

    def get_account_code(self, obj):
        return obj.account_id.code if obj.account_id else None

    def get_account_name(self, obj):
        return obj.account_id.name if obj.account_id else None

    def get_created_by_name(self, obj):
        return f"{obj.created_by.first_name} {obj.created_by.last_name}" if obj.created_by else None

    def get_lines_count(self, obj):
        return obj.reconciled_lines.count()

    def get_balance(self, obj):
        return float(obj.balance)

class ReconciliationDetailSerializer(serializers.ModelSerializer):
    """Serializer détaillé pour les lettrages comptables."""
    account_code = serializers.SerializerMethodField()
    account_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    lines = JournalEntryLineSerializer(source='reconciled_lines', many=True, read_only=True)
    balance = serializers.SerializerMethodField()

    class Meta:
        model = Reconciliation
        fields = [
            'id', 'name', 'date', 'account_id', 'account_code', 'account_name',
            'created_by', 'created_by_name', 'created_at', 'lines', 'balance'
        ]

    def get_account_code(self, obj):
        return obj.account_id.code if obj.account_id else None

    def get_account_name(self, obj):
        return obj.account_id.name if obj.account_id else None

    def get_created_by_name(self, obj):
        return f"{obj.created_by.first_name} {obj.created_by.last_name}" if obj.created_by else None

    def get_balance(self, obj):
        return float(obj.balance)

class BankStatementLineSerializer(serializers.ModelSerializer):
    """Serializer pour les lignes de relevé bancaire."""
    partner_name = serializers.SerializerMethodField()
    journal_entry_lines_count = serializers.SerializerMethodField()

    class Meta:
        model = BankStatementLine
        fields = [
            'id', 'statement_id', 'date', 'name', 'ref', 
            'partner_id', 'partner_name', 'amount', 'is_reconciled',
            'journal_entry_line_ids', 'journal_entry_lines_count', 'note'
        ]

    def get_partner_name(self, obj):
        return obj.partner_id.name if obj.partner_id else None

    def get_journal_entry_lines_count(self, obj):
        return obj.journal_entry_line_ids.count()

class BankStatementSerializer(serializers.ModelSerializer):
    """Serializer pour les relevés bancaires."""
    journal_code = serializers.SerializerMethodField()
    journal_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    lines_count = serializers.SerializerMethodField()
    difference = serializers.SerializerMethodField()
    state_display = serializers.SerializerMethodField()

    class Meta:
        model = BankStatement
        fields = [
            'id', 'journal_id', 'journal_code', 'journal_name',
            'name', 'date', 'reference', 'balance_start', 'balance_end',
            'balance_end_real', 'difference', 'state', 'state_display',
            'created_by', 'created_by_name', 'lines_count'
        ]

    def get_journal_code(self, obj):
        return obj.journal_id.code if obj.journal_id else None

    def get_journal_name(self, obj):
        return obj.journal_id.name if obj.journal_id else None

    def get_created_by_name(self, obj):
        return f"{obj.created_by.first_name} {obj.created_by.last_name}" if obj.created_by else None

    def get_lines_count(self, obj):
        return obj.lines.count()

    def get_difference(self, obj):
        return float(obj.difference)

    def get_state_display(self, obj):
        return obj.get_state_display()

class BankStatementDetailSerializer(serializers.ModelSerializer):
    """Serializer détaillé pour les relevés bancaires."""
    journal_code = serializers.SerializerMethodField()
    journal_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    lines = BankStatementLineSerializer(many=True, read_only=True)
    difference = serializers.SerializerMethodField()
    state_display = serializers.SerializerMethodField()

    class Meta:
        model = BankStatement
        fields = [
            'id', 'journal_id', 'journal_code', 'journal_name',
            'name', 'date', 'reference', 'balance_start', 'balance_end',
            'balance_end_real', 'difference', 'state', 'state_display',
            'created_by', 'created_by_name', 'created_at', 'updated_at',
            'lines'
        ]

    def get_journal_code(self, obj):
        return obj.journal_id.code if obj.journal_id else None

    def get_journal_name(self, obj):
        return obj.journal_id.name if obj.journal_id else None

    def get_created_by_name(self, obj):
        return f"{obj.created_by.first_name} {obj.created_by.last_name}" if obj.created_by else None

    def get_difference(self, obj):
        return float(obj.difference)

    def get_state_display(self, obj):
        return obj.get_state_display()

class AnalyticAccountSerializer(serializers.ModelSerializer):
    """Serializer pour les comptes analytiques."""
    parent_code = serializers.SerializerMethodField()
    parent_name = serializers.SerializerMethodField()
    children_count = serializers.SerializerMethodField()

    class Meta:
        model = AnalyticAccount
        fields = [
            'id', 'code', 'name', 'parent_id', 'parent_code', 'parent_name',
            'active', 'children_count'
        ]

    def get_parent_code(self, obj):
        return obj.parent_id.code if obj.parent_id else None

    def get_parent_name(self, obj):
        return obj.parent_id.name if obj.parent_id else None

    def get_children_count(self, obj):
        return obj.children.count()

class TaxSerializer(serializers.ModelSerializer):
    """Serializer pour les taxes."""
    account_code = serializers.SerializerMethodField()
    account_name = serializers.SerializerMethodField()

    class Meta:
        model = Tax
        fields = [
            'id', 'name', 'description', 'amount', 'type',
            'account_id', 'account_code', 'account_name',
            'active', 'tax_category', 'is_deductible'
        ]

    def get_account_code(self, obj):
        return obj.account_id.code if obj.account_id else None

    def get_account_name(self, obj):
        return obj.account_id.name if obj.account_id else None

class AssetCategorySerializer(serializers.ModelSerializer):
    """Serializer pour les catégories d'immobilisations."""
    account_asset_code = serializers.SerializerMethodField()
    account_asset_name = serializers.SerializerMethodField()
    account_depreciation_code = serializers.SerializerMethodField()
    account_depreciation_name = serializers.SerializerMethodField()
    account_expense_code = serializers.SerializerMethodField()
    account_expense_name = serializers.SerializerMethodField()

    class Meta:
        model = AssetCategory
        fields = [
            'id', 'name',
            'account_asset_id', 'account_asset_code', 'account_asset_name',
            'account_depreciation_id', 'account_depreciation_code', 'account_depreciation_name',
            'account_expense_id', 'account_expense_code', 'account_expense_name',
            'method', 'duration_years'
        ]

    def get_account_asset_code(self, obj):
        return obj.account_asset_id.code if obj.account_asset_id else None

    def get_account_asset_name(self, obj):
        return obj.account_asset_id.name if obj.account_asset_id else None

    def get_account_depreciation_code(self, obj):
        return obj.account_depreciation_id.code if obj.account_depreciation_id else None

    def get_account_depreciation_name(self, obj):
        return obj.account_depreciation_id.name if obj.account_depreciation_id else None

    def get_account_expense_code(self, obj):
        return obj.account_expense_id.code if obj.account_expense_id else None

    def get_account_expense_name(self, obj):
        return obj.account_expense_id.name if obj.account_expense_id else None

class AssetDepreciationSerializer(serializers.ModelSerializer):
    """Serializer pour les dotations aux amortissements."""
    move_name = serializers.SerializerMethodField()

    class Meta:
        model = AssetDepreciation
        fields = [
            'id', 'asset_id', 'name', 'sequence', 'date',
            'amount', 'remaining_value', 'move_id', 'move_name', 'state'
        ]

    def get_move_name(self, obj):
        return obj.move_id.name if obj.move_id else None

class AssetSerializer(serializers.ModelSerializer):
    """Serializer pour les immobilisations."""
    category_name = serializers.SerializerMethodField()
    depreciation_count = serializers.SerializerMethodField()
    depreciation_value = serializers.SerializerMethodField()
    net_book_value = serializers.SerializerMethodField()

    class Meta:
        model = Asset
        fields = [
            'id', 'code', 'name', 'category_id', 'category_name',
            'acquisition_date', 'acquisition_value', 'salvage_value',
            'state', 'depreciation_count', 'depreciation_value', 'net_book_value'
        ]

    def get_category_name(self, obj):
        return obj.category_id.name if obj.category_id else None

    def get_depreciation_count(self, obj):
        return obj.depreciation_lines.count()

    def get_depreciation_value(self, obj):
        return float(obj.acquisition_value - obj.salvage_value)

    def get_net_book_value(self, obj):
        # Valeur nette comptable = valeur d'acquisition - amortissements cumulés
        depreciation_sum = obj.depreciation_lines.filter(state='posted').aggregate(
            sum=Sum('amount'))['sum'] or 0
        return float(obj.acquisition_value - depreciation_sum)

class AssetDetailSerializer(serializers.ModelSerializer):
    """Serializer détaillé pour les immobilisations."""
    category_name = serializers.SerializerMethodField()
    acquisition_move_name = serializers.SerializerMethodField()
    depreciation_lines = AssetDepreciationSerializer(many=True, read_only=True)
    depreciation_value = serializers.SerializerMethodField()
    net_book_value = serializers.SerializerMethodField()

    class Meta:
        model = Asset
        fields = [
            'id', 'code', 'name', 'category_id', 'category_name',
            'acquisition_date', 'acquisition_value', 'salvage_value',
            'state', 'method', 'duration_years', 'first_depreciation_date',
            'acquisition_move_id', 'acquisition_move_name',
            'note', 'created_at', 'updated_at',
            'depreciation_lines', 'depreciation_value', 'net_book_value'
        ]

    def get_category_name(self, obj):
        return obj.category_id.name if obj.category_id else None

    def get_acquisition_move_name(self, obj):
        return obj.acquisition_move_id.name if obj.acquisition_move_id else None

    def get_depreciation_value(self, obj):
        return float(obj.acquisition_value - obj.salvage_value)

    def get_net_book_value(self, obj):
        # Valeur nette comptable = valeur d'acquisition - amortissements cumulés
        depreciation_sum = obj.depreciation_lines.filter(state='posted').aggregate(
            sum=Sum('amount'))['sum'] or 0
        return float(obj.acquisition_value - depreciation_sum)
