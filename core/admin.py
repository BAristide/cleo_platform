from django.contrib import admin

from .models import CoreSettings, Currency, EmailSettings


@admin.register(Currency)
class CurrencyAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'symbol', 'exchange_rate', 'is_default')
    list_filter = ('is_default',)
    search_fields = ('code', 'name')
    ordering = ('-is_default', 'code')
    fieldsets = (
        (None, {'fields': ('code', 'name', 'symbol', 'is_default', 'exchange_rate')}),
        (
            'Formatage',
            {
                'fields': (
                    'decimal_places',
                    'decimal_separator',
                    'thousand_separator',
                    'symbol_position',
                )
            },
        ),
    )


@admin.register(CoreSettings)
class CoreSettingsAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'language', 'timezone', 'invoice_prefix')
    fieldsets = (
        (
            'Préférences système',
            {'fields': ('language', 'timezone', 'date_format', 'time_format')},
        ),
        (
            'Préférences de facturation',
            {
                'fields': (
                    'default_payment_term',
                    'invoice_prefix',
                    'quote_prefix',
                    'order_prefix',
                )
            },
        ),
        ('Préférences numériques', {'fields': ('decimal_precision',)}),
        (
            'Gestion des documents',
            {'fields': ('auto_archive_documents', 'archive_after_days')},
        ),
    )

    def has_add_permission(self, request):
        # Singleton — un seul enregistrement autorisé
        return not CoreSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(EmailSettings)
class EmailSettingsAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'email_host', 'email_port', 'email_use_tls')
    fieldsets = (
        (
            'Serveur SMTP',
            {'fields': ('email_host', 'email_port', 'email_use_tls')},
        ),
        (
            'Authentification',
            {'fields': ('email_host_user', 'email_host_password')},
        ),
        (
            'Expéditeur',
            {'fields': ('default_from_email',)},
        ),
    )

    def has_add_permission(self, request):
        return not EmailSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
