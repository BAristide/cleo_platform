from django.contrib import admin
from django.utils.html import format_html
from .models import (
    Tag, Industry, Company, Contact, SalesStage,
    Opportunity, ActivityType, Activity, StageHistory
)
from sales.models import Quote, Order, Invoice


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ('name', 'color_display', 'id')
    search_fields = ('name',)

    def color_display(self, obj):
        return format_html(
            '<span style="color: {}; font-weight: bold;">⬤</span> {}',
            obj.color, obj.color
        )
    color_display.short_description = 'Couleur'


@admin.register(Industry)
class IndustryAdmin(admin.ModelAdmin):
    list_display = ('name', 'id')
    search_fields = ('name',)


class ContactInline(admin.TabularInline):
    model = Contact
    extra = 0
    fields = ('first_name', 'last_name', 'title', 'email', 'phone')


class OpportunityInline(admin.TabularInline):
    model = Opportunity
    extra = 0
    fields = ('name', 'stage', 'amount', 'currency', 'expected_close_date')


class ActivityInline(admin.TabularInline):
    model = Activity
    extra = 0
    fields = ('subject', 'activity_type', 'start_date', 'status')
    fk_name = 'company'


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('name', 'industry', 'city', 'country', 'phone', 'email', 'website', 'score', 'assigned_to')
    list_filter = ('industry', 'country', 'city', 'created_at')
    search_fields = ('name', 'description', 'address_line1', 'city', 'country')
    filter_horizontal = ('tags',)
    fieldsets = (
        ('Informations de base', {
            'fields': ('name', 'industry', 'website', 'phone', 'email', 'score')
        }),
        ('Adresse', {
            'fields': ('address_line1', 'address_line2', 'city', 'state', 'postal_code', 'country')
        }),
        ('Informations supplémentaires', {
            'fields': ('description', 'annual_revenue', 'employee_count')
        }),
        ('Métadonnées', {
            'fields': ('tags', 'created_by', 'assigned_to')
        })
    )
    inlines = [ContactInline, OpportunityInline, ActivityInline]

    def save_model(self, request, obj, form, change):
        if not change:  # Si c'est une création (pas une modification)
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'company', 'title', 'email', 'phone', 'source', 'is_active', 'assigned_to')
    list_filter = ('company', 'source', 'is_active', 'created_at')
    search_fields = ('first_name', 'last_name', 'email', 'phone', 'company__name')
    filter_horizontal = ('tags',)
    fieldsets = (
        ('Informations de base', {
            'fields': ('first_name', 'last_name', 'title', 'company', 'is_active')
        }),
        ('Coordonnées', {
            'fields': ('email', 'phone', 'mobile')
        }),
        ('Profils sociaux', {
            'fields': ('linkedin', 'twitter')
        }),
        ('Source et suivi', {
            'fields': ('source', 'source_detail', 'notes')
        }),
        ('Métadonnées', {
            'fields': ('tags', 'created_by', 'assigned_to')
        })
    )

    def full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"
    full_name.short_description = 'Nom complet'

    def save_model(self, request, obj, form, change):
        if not change:  # Si c'est une création (pas une modification)
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(SalesStage)
class SalesStageAdmin(admin.ModelAdmin):
    list_display = ('name', 'order', 'probability', 'is_won', 'is_lost', 'color_display')
    list_editable = ('order', 'probability', 'is_won', 'is_lost')

    def color_display(self, obj):
        return format_html(
            '<span style="color: {}; font-weight: bold;">⬤</span> {}',
            obj.color, obj.color
        )
    color_display.short_description = 'Couleur'


class StageHistoryInline(admin.TabularInline):
    model = StageHistory
    extra = 0
    readonly_fields = ('changed_at', 'changed_by')
    fields = ('from_stage', 'to_stage', 'changed_at', 'changed_by', 'notes')


class RelatedDocumentsInline(admin.TabularInline):
    """
    Inline pour afficher les documents de vente liés à une opportunité.
    """
    verbose_name = "Document lié"
    verbose_name_plural = "Documents liés"
    extra = 0
    can_delete = False
    
    def has_add_permission(self, request, obj=None):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False


class QuoteInline(RelatedDocumentsInline):
    model = Quote
    fields = ('number', 'date', 'status', 'total')


class OrderInline(RelatedDocumentsInline):
    model = Order
    fields = ('number', 'date', 'status', 'total')


class InvoiceInline(RelatedDocumentsInline):
    model = Invoice
    fields = ('number', 'date', 'payment_status', 'total')


@admin.register(Opportunity)
class OpportunityAdmin(admin.ModelAdmin):
    list_display = ('name', 'company', 'stage', 'amount_display', 'probability', 'expected_close_date', 'is_closed_display', 'assigned_to')
    list_filter = ('stage', 'company', 'created_at', 'expected_close_date')
    search_fields = ('name', 'description', 'company__name')
    filter_horizontal = ('tags', 'contacts')
    readonly_fields = ('is_closed', 'is_won', 'is_lost', 'weighted_amount')
    fieldsets = (
        ('Informations de base', {
            'fields': ('name', 'company', 'stage', 'description')
        }),
        ('Contacts', {
            'fields': ('contacts',)
        }),
        ('Détails financiers', {
            'fields': ('amount', 'currency', 'probability', 'weighted_amount')
        }),
        ('Dates', {
            'fields': ('expected_close_date', 'closed_date')
        }),
        ('Statut', {
            'fields': ('is_closed', 'is_won', 'is_lost')
        }),
        ('Métadonnées', {
            'fields': ('tags', 'created_by', 'assigned_to')
        })
    )
    inlines = [StageHistoryInline, QuoteInline, OrderInline, InvoiceInline]

    def amount_display(self, obj):
        if obj.amount:
            return f"{obj.amount} {obj.currency}"
        return "-"
    amount_display.short_description = 'Montant'

    def is_closed_display(self, obj):
        if obj.is_won:
            return format_html('<span style="color: green; font-weight: bold;">Gagné</span>')
        elif obj.is_lost:
            return format_html('<span style="color: red; font-weight: bold;">Perdu</span>')
        else:
            return format_html('<span style="color: blue;">En cours</span>')
    is_closed_display.short_description = 'Statut'

    def save_model(self, request, obj, form, change):
        if not change:  # Si c'est une création (pas une modification)
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(ActivityType)
class ActivityTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'icon', 'color_display')
    search_fields = ('name',)

    def color_display(self, obj):
        return format_html(
            '<span style="color: {}; font-weight: bold;">⬤</span> {}',
            obj.color, obj.color
        )
    color_display.short_description = 'Couleur'


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ('subject', 'activity_type', 'start_date', 'status', 'company_link', 'opportunity_link', 'assigned_to')
    list_filter = ('activity_type', 'status', 'start_date', 'company')
    search_fields = ('subject', 'description', 'company__name', 'opportunity__name')
    filter_horizontal = ('contacts',)
    readonly_fields = ('completed_date',)
    fieldsets = (
        ('Informations de base', {
            'fields': ('subject', 'activity_type', 'description')
        }),
        ('Planification', {
            'fields': ('start_date', 'end_date', 'all_day', 'status', 'completed_date')
        }),
        ('Relations', {
            'fields': ('company', 'opportunity', 'contacts')
        }),
        ('Rappel', {
            'fields': ('reminder', 'reminder_datetime')
        }),
        ('Métadonnées', {
            'fields': ('created_by', 'assigned_to')
        })
    )

    def company_link(self, obj):
        if obj.company:
            return format_html(
                '<a href="{}">{}</a>',
                f"/admin/crm/company/{obj.company.id}/change/",
                obj.company.name
            )
        return "-"
    company_link.short_description = 'Entreprise'

    def opportunity_link(self, obj):
        if obj.opportunity:
            return format_html(
                '<a href="{}">{}</a>',
                f"/admin/crm/opportunity/{obj.opportunity.id}/change/",
                obj.opportunity.name
            )
        return "-"
    opportunity_link.short_description = 'Opportunité'

    def save_model(self, request, obj, form, change):
        if not change:  # Si c'est une création (pas une modification)
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(StageHistory)
class StageHistoryAdmin(admin.ModelAdmin):
    list_display = ('opportunity', 'from_stage', 'to_stage', 'changed_at', 'changed_by')
    list_filter = ('to_stage', 'from_stage', 'changed_at')
    search_fields = ('opportunity__name', 'notes')
    readonly_fields = ('opportunity', 'from_stage', 'to_stage', 'changed_at', 'changed_by')
