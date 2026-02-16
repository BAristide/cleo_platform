from django.contrib import admin
from .models import Currency, Company, CoreSettings

@admin.register(Currency)
class CurrencyAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'symbol', 'exchange_rate', 'is_default')
    list_filter = ('is_default',)
    search_fields = ('code', 'name')
    ordering = ('-is_default', 'code')
    fieldsets = (
        (None, {
            'fields': ('code', 'name', 'symbol', 'is_default', 'exchange_rate')
        }),
        ('Formatage', {
            'fields': ('decimal_places', 'decimal_separator', 'thousand_separator', 'symbol_position')
        }),
    )

@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('name', 'currency', 'email', 'phone', 'is_active')
    list_filter = ('is_active', 'currency')
    search_fields = ('name', 'legal_name', 'tax_id', 'email')
    fieldsets = (
        ('Informations de base', {
            'fields': ('name', 'legal_name', 'logo', 'is_active')
        }),
        ('Informations fiscales', {
            'fields': ('tax_id', 'registration_number', 'currency', 'fiscal_year_start')
        }),
        ('Contact', {
            'fields': ('website', 'email', 'phone')
        }),
        ('Adresse', {
            'fields': ('street', 'street2', 'city', 'zip_code', 'state', 'country')
        }),
    )

@admin.register(CoreSettings)
class CoreSettingsAdmin(admin.ModelAdmin):
    list_display = ('company', 'language', 'timezone')
    fieldsets = (
        ('Entreprise', {
            'fields': ('company',)
        }),
        ('Préférences système', {
            'fields': ('language', 'timezone', 'date_format', 'time_format')
        }),
        ('Préférences de facturation', {
            'fields': ('default_payment_term', 'invoice_prefix', 'quote_prefix', 'order_prefix')
        }),
        ('Préférences numériques', {
            'fields': ('decimal_precision',)
        }),
        ('Gestion des documents', {
            'fields': ('auto_archive_documents', 'archive_after_days')
        }),
    )
