from django import forms
from django.contrib import admin
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _

from .models import (
    BankAccount,
    Invoice,
    InvoiceItem,
    Order,
    OrderItem,
    Payment,
    Product,
    Quote,
    QuoteItem,
)


# Formulaires personnalisés pour rendre le champ 'number' non requis
class QuoteAdminForm(forms.ModelForm):
    class Meta:
        model = Quote
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Rendre le champ 'number' non requis
        if 'number' in self.fields:
            self.fields['number'].required = False


class OrderAdminForm(forms.ModelForm):
    class Meta:
        model = Order
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if 'number' in self.fields:
            self.fields['number'].required = False


class InvoiceAdminForm(forms.ModelForm):
    class Meta:
        model = Invoice
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if 'number' in self.fields:
            self.fields['number'].required = False


@admin.register(BankAccount)
class BankAccountAdmin(admin.ModelAdmin):
    list_display = ('name', 'bank_name', 'rib', 'currency', 'is_default')
    list_filter = ('currency', 'is_default')
    search_fields = ('name', 'bank_name', 'rib', 'iban')
    ordering = ('currency', '-is_default', 'name')


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        'reference',
        'name',
        'unit_price',
        'currency',
        'tax_rate',
        'is_active',
    )
    list_filter = ('is_active', 'currency', 'tax_rate')
    search_fields = ('name', 'reference', 'description')
    ordering = ('reference',)


class QuoteItemInline(admin.TabularInline):
    model = QuoteItem
    extra = 1
    fields = ('product', 'description', 'quantity', 'unit_price', 'tax_rate')

    def get_formset(self, request, obj=None, **kwargs):
        """
        Surcharge pour rendre certains champs obligatoires dans l'admin et
        initialiser les valeurs depuis le produit sélectionné.
        """
        formset = super().get_formset(request, obj, **kwargs)
        formset.validate_min = True
        return formset


@admin.register(Quote)
class QuoteAdmin(admin.ModelAdmin):
    form = QuoteAdminForm
    list_display = (
        'number',
        'company',
        'contact',
        'date',
        'expiration_date',
        'total_display',
        'status',
        'is_tax_exempt',
        'pdf_status',
        'email_status',
    )
    list_filter = ('status', 'currency', 'date', 'expiration_date', 'is_tax_exempt')
    search_fields = (
        'number',
        'company__name',
        'contact__first_name',
        'contact__last_name',
    )
    date_hierarchy = 'date'
    readonly_fields = (
        'subtotal',
        'tax_amount',
        'total',
        'pdf_file',
        'email_sent',
        'email_sent_date',
        'created_at',
        'updated_at',
    )
    inlines = [QuoteItemInline]
    fieldsets = (
        (
            _('Informations générales'),
            {'fields': ('number', 'company', 'contact', 'opportunity', 'status')},
        ),
        (_('Dates'), {'fields': ('date', 'expiration_date', 'validity_period')}),
        (
            _('Montants et taxes'),
            {
                'fields': (
                    'currency',
                    'exchange_rate',
                    'bank_account',
                    'is_tax_exempt',
                    'tax_exemption_reason',
                    'discount_percentage',
                    'subtotal',
                    'tax_amount',
                    'total',
                )
            },
        ),
        (_('Conditions et notes'), {'fields': ('payment_terms', 'notes', 'terms')}),
        (
            _('Métadonnées'),
            {
                'classes': ('collapse',),
                'fields': (
                    'created_at',
                    'updated_at',
                    'pdf_file',
                    'email_sent',
                    'email_sent_date',
                ),
            },
        ),
    )

    def total_display(self, obj):
        return f'{obj.total} {obj.currency.code}'

    total_display.short_description = 'Total'

    def pdf_status(self, obj):
        if obj.pdf_file:
            return format_html('<span style="color: green;">✓ Généré</span>')
        return format_html('<span style="color: red;">✗ Non généré</span>')

    pdf_status.short_description = 'PDF'

    def email_status(self, obj):
        if obj.email_sent:
            return format_html('<span style="color: green;">✓ Envoyé</span>')
        return format_html('<span style="color: orange;">✗ Non envoyé</span>')

    email_status.short_description = 'Email'

    def save_model(self, request, obj, form, change):
        """
        Surcharge pour initialiser les montants lors de la création et
        définir l'utilisateur créateur.
        """
        if not change:  # Si c'est une création (pas une modification)
            # Pour les nouveaux devis, s'assurer que les champs financiers sont initialisés
            obj.subtotal = 0
            obj.tax_amount = 0
            obj.total = 0
        super().save_model(request, obj, form, change)

    def save_formset(self, request, form, formset, change):
        """
        Surcharge pour recalculer les montants après la modification des lignes.
        """
        instances = formset.save(commit=False)

        # Supprimer les lignes marquées pour suppression
        for obj in formset.deleted_objects:
            obj.delete()

        # Sauvegarder les nouvelles instances et les instances modifiées
        for instance in instances:
            # Si prix unitaire non défini, utiliser celui du produit
            if instance.unit_price is None or instance.unit_price == 0:
                instance.unit_price = instance.product.unit_price

            # Si taux de TVA non défini, utiliser celui du produit
            if instance.tax_rate is None or instance.tax_rate == 0:
                instance.tax_rate = instance.product.tax_rate

            # Si description non définie, utiliser celle du produit
            if not instance.description:
                instance.description = instance.product.description

            instance.save()

        formset.save_m2m()

        # Recalculer les totaux du devis après modification des lignes
        if form.instance.pk:
            form.instance.calculate_amounts()
            form.instance.save(update_fields=['subtotal', 'tax_amount', 'total'])

    actions = [
        'generate_pdf',
        'send_by_email',
        'convert_to_order',
        'convert_to_invoice',
    ]

    def generate_pdf(self, request, queryset):
        for quote in queryset:
            quote.generate_pdf()
        self.message_user(request, f'{len(queryset)} devis ont été générés en PDF.')

    generate_pdf.short_description = 'Générer les PDFs'

    def send_by_email(self, request, queryset):
        sent_count = 0
        for quote in queryset:
            if quote.contact and quote.contact.email:
                try:
                    quote.send_by_email(quote.contact.email)
                    sent_count += 1
                except Exception as e:
                    self.message_user(
                        request,
                        f"Erreur lors de l'envoi du devis {quote.number}: {str(e)}",
                        level='ERROR',
                    )
            else:
                self.message_user(
                    request,
                    f"Le devis {quote.number} n'a pas d'email de contact défini.",
                    level='WARNING',
                )

        self.message_user(request, f'{sent_count} devis ont été envoyés par email.')

    send_by_email.short_description = 'Envoyer par email'

    def convert_to_order(self, request, queryset):
        """Action pour convertir les devis sélectionnés en commandes."""
        orders_created = 0

        # Ajouter des messages de débogage
        self.message_user(
            request,
            f'Tentative de conversion de {len(queryset)} devis en commandes...',
            level='INFO',
        )

        for quote in queryset:
            # Afficher les informations sur le devis en cours de traitement
            self.message_user(
                request,
                f'Traitement du devis {quote.number} (statut: {quote.status})...',
                level='INFO',
            )

            # Vérifier si le devis a un statut qui permet la conversion
            if quote.status != 'accepted':
                self.message_user(
                    request,
                    f"Le devis {quote.number} ne peut pas être converti car son statut n'est pas 'accepted' (statut actuel: {quote.status})",
                    level='WARNING',
                )
                continue

            # Vérifier si le devis a déjà été converti
            if quote.converted_to_order:
                self.message_user(
                    request,
                    f'Le devis {quote.number} a déjà été converti en commande',
                    level='WARNING',
                )
                continue

            try:
                # Tentative d'appel à la méthode de conversion
                self.message_user(
                    request,
                    f'Appel de la méthode convert_to_order sur le devis {quote.number}...',
                    level='INFO',
                )

                # Conversion du devis en commande
                order = quote.convert_to_order()

                if order:
                    orders_created += 1
                    self.message_user(
                        request,
                        f'Commande {order.number} créée avec succès à partir du devis {quote.number}',
                        level='SUCCESS',
                    )
                else:
                    self.message_user(
                        request,
                        f"La méthode convert_to_order n'a pas retourné d'objet commande pour le devis {quote.number}",
                        level='ERROR',
                    )

            except Exception as e:
                # Capturer et afficher toute exception qui pourrait se produire
                import traceback

                self.message_user(
                    request,
                    f'Erreur lors de la conversion du devis {quote.number}: {str(e)}\n{traceback.format_exc()}',
                    level='ERROR',
                )

        # Message récapitulatif
        if orders_created > 0:
            self.message_user(
                request,
                f'{orders_created} commandes ont été créées à partir des devis sélectionnés.',
            )
        else:
            self.message_user(
                request,
                "Aucune commande n'a été créée. Vérifiez les messages ci-dessus pour plus de détails.",
                level='WARNING',
            )

    convert_to_order.short_description = 'Convertir en commande'

    def convert_to_invoice(self, request, queryset):
        invoices_created = 0
        for quote in queryset:
            if quote.status == 'accepted' and not quote.converted_to_invoice:
                try:
                    quote.convert_to_invoice()
                    invoices_created += 1
                except Exception as e:
                    self.message_user(
                        request,
                        f'Erreur lors de la conversion du devis {quote.number}: {str(e)}',
                        level='ERROR',
                    )

        self.message_user(
            request,
            f'{invoices_created} factures ont été créées à partir des devis sélectionnés.',
        )

    convert_to_invoice.short_description = 'Convertir en facture'


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 1
    fields = ('product', 'description', 'quantity', 'unit_price', 'tax_rate')

    def get_formset(self, request, obj=None, **kwargs):
        formset = super().get_formset(request, obj, **kwargs)
        formset.validate_min = True
        return formset


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    form = OrderAdminForm
    list_display = (
        'number',
        'company',
        'contact',
        'date',
        'delivery_date',
        'total_display',
        'status',
        'is_tax_exempt',
        'pdf_status',
        'email_status',
    )
    list_filter = ('status', 'currency', 'date', 'delivery_date', 'is_tax_exempt')
    search_fields = (
        'number',
        'company__name',
        'contact__first_name',
        'contact__last_name',
    )
    date_hierarchy = 'date'
    readonly_fields = (
        'subtotal',
        'tax_amount',
        'total',
        'pdf_file',
        'email_sent',
        'email_sent_date',
        'created_at',
        'updated_at',
    )
    inlines = [OrderItemInline]
    fieldsets = (
        (
            _('Informations générales'),
            {
                'fields': (
                    'number',
                    'company',
                    'contact',
                    'opportunity',
                    'quote',
                    'status',
                )
            },
        ),
        (
            _('Dates & Livraison'),
            {'fields': ('date', 'delivery_date', 'delivery_address')},
        ),
        (
            _('Montants et taxes'),
            {
                'fields': (
                    'currency',
                    'exchange_rate',
                    'bank_account',
                    'is_tax_exempt',
                    'tax_exemption_reason',
                    'discount_percentage',
                    'subtotal',
                    'tax_amount',
                    'total',
                )
            },
        ),
        (_('Conditions et notes'), {'fields': ('notes', 'terms')}),
        (
            _('Métadonnées'),
            {
                'classes': ('collapse',),
                'fields': (
                    'created_at',
                    'updated_at',
                    'pdf_file',
                    'email_sent',
                    'email_sent_date',
                ),
            },
        ),
    )

    def total_display(self, obj):
        return f'{obj.total} {obj.currency.code}'

    total_display.short_description = 'Total'

    def pdf_status(self, obj):
        if obj.pdf_file:
            return format_html('<span style="color: green;">✓ Généré</span>')
        return format_html('<span style="color: red;">✗ Non généré</span>')

    pdf_status.short_description = 'PDF'

    def email_status(self, obj):
        if obj.email_sent:
            return format_html('<span style="color: green;">✓ Envoyé</span>')
        return format_html('<span style="color: orange;">✗ Non envoyé</span>')

    email_status.short_description = 'Email'

    def save_model(self, request, obj, form, change):
        if not change:  # Si c'est une création (pas une modification)
            # Pour les nouvelles commandes, s'assurer que les champs financiers sont initialisés
            obj.subtotal = 0
            obj.tax_amount = 0
            obj.total = 0
        super().save_model(request, obj, form, change)

    def save_formset(self, request, form, formset, change):
        instances = formset.save(commit=False)

        # Supprimer les lignes marquées pour suppression
        for obj in formset.deleted_objects:
            obj.delete()

        # Sauvegarder les nouvelles instances et les instances modifiées
        for instance in instances:
            # Si prix unitaire non défini, utiliser celui du produit
            if instance.unit_price is None or instance.unit_price == 0:
                instance.unit_price = instance.product.unit_price

            # Si taux de TVA non défini, utiliser celui du produit
            if instance.tax_rate is None or instance.tax_rate == 0:
                instance.tax_rate = instance.product.tax_rate

            # Si description non définie, utiliser celle du produit
            if not instance.description:
                instance.description = instance.product.description

            instance.save()

        formset.save_m2m()

        # Recalculer les totaux de la commande après modification des lignes
        if form.instance.pk:
            form.instance.calculate_amounts()
            form.instance.save(update_fields=['subtotal', 'tax_amount', 'total'])

    # Ajouter les actions pour les factures d'acompte
    actions = [
        'generate_pdf',
        'send_by_email',
        'convert_to_invoice',
        'create_deposit_invoice',
    ]

    def generate_pdf(self, request, queryset):
        for order in queryset:
            order.generate_pdf()
        self.message_user(
            request, f'{len(queryset)} commandes ont été générées en PDF.'
        )

    generate_pdf.short_description = 'Générer les PDFs'

    def send_by_email(self, request, queryset):
        sent_count = 0
        for order in queryset:
            if order.contact and order.contact.email:
                try:
                    order.send_by_email(order.contact.email)
                    sent_count += 1
                except Exception as e:
                    self.message_user(
                        request,
                        f"Erreur lors de l'envoi de la commande {order.number}: {str(e)}",
                        level='ERROR',
                    )
            else:
                self.message_user(
                    request,
                    f"La commande {order.number} n'a pas d'email de contact défini.",
                    level='WARNING',
                )

        self.message_user(
            request, f'{sent_count} commandes ont été envoyées par email.'
        )

    send_by_email.short_description = 'Envoyer par email'

    def create_deposit_invoice(self, request, queryset):
        """Action pour créer une facture d'acompte à partir d'une commande."""
        # Vérifier qu'une seule commande est sélectionnée
        if queryset.count() != 1:
            self.message_user(
                request,
                "Veuillez sélectionner une seule commande pour créer une facture d'acompte.",
                level='ERROR',
            )
            return

        order = queryset.first()

        # Vérifier que la commande est dans un état permettant la création d'une facture d'acompte
        if not order.can_create_deposit_invoice():
            self.message_user(
                request,
                "Cette commande ne peut pas avoir de facture d'acompte (statut invalide ou montant déjà facturé).",
                level='ERROR',
            )
            return

        try:
            # Créer la facture d'acompte (30% par défaut)
            deposit_invoice = Invoice.create_deposit_invoice(
                order, deposit_percentage=30
            )

            self.message_user(
                request,
                f"Facture d'acompte {deposit_invoice.number} créée avec succès pour la commande {order.number}.",
                level='SUCCESS',
            )
        except Exception as e:
            self.message_user(
                request,
                f"Erreur lors de la création de la facture d'acompte: {str(e)}",
                level='ERROR',
            )

    create_deposit_invoice.short_description = "Créer une facture d'acompte"

    def convert_to_invoice(self, request, queryset):
        """Action pour convertir les commandes sélectionnées en factures finales,
        en tenant compte des acomptes déjà réglés."""
        invoices_created = 0
        for order in queryset:
            if not order.can_create_final_invoice():
                self.message_user(
                    request,
                    f'La commande {order.number} ne peut pas être convertie en facture finale.',
                    level='WARNING',
                )
                continue

            try:
                # Calculer le montant restant à facturer
                from decimal import Decimal

                from django.db.models import Sum

                # Vérifier s'il existe déjà des factures d'acompte pour cette commande
                deposit_invoices = Invoice.objects.filter(order=order, type='deposit')
                deposit_total = deposit_invoices.aggregate(Sum('total'))[
                    'total__sum'
                ] or Decimal('0')

                # Calculer le montant restant à facturer
                remaining_amount = order.total - deposit_total

                # Si tout a déjà été facturé, retourner None ou lever une exception
                if remaining_amount <= 0:
                    self.message_user(
                        request,
                        f'Le montant total de la commande {order.number} a déjà été facturé via des acomptes.',
                        level='WARNING',
                    )
                    continue

                # Calculer les proportions pour le sous-total et la TVA
                proportion = remaining_amount / order.total if order.total > 0 else 0

                # NOUVELLE SECTION: Génération d'un numéro de facture unique
                # Trouver la dernière facture standard
                last_invoice = (
                    Invoice.objects.filter(type='standard').order_by('-id').first()
                )

                # Générer un nouveau numéro de facture
                invoice_number = 'FACT-0001'  # Valeur par défaut

                if last_invoice and last_invoice.number:
                    try:
                        # Tente d'extraire le numéro après le préfixe
                        prefix = 'FACT-'
                        if prefix in last_invoice.number:
                            # Format avec tiret (FACT-XXXX)
                            num_part = last_invoice.number.split(prefix)[1]
                            next_num = int(num_part) + 1
                            invoice_number = f'{prefix}{next_num:04d}'
                        else:
                            # Au cas où le format est différent, utiliser une approche plus générique
                            import re

                            numeric_part = re.sub(r'[^0-9]', '', last_invoice.number)
                            if numeric_part:
                                next_num = int(numeric_part) + 1
                                invoice_number = f'FACT-{next_num:04d}'
                    except (ValueError, IndexError):
                        # En cas d'erreur, ajouter un timestamp pour assurer l'unicité
                        from datetime import datetime

                        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
                        invoice_number = f'FACT-{timestamp}'

                # Pour s'assurer que le numéro est vraiment unique, vérifier une dernière fois
                while Invoice.objects.filter(number=invoice_number).exists():
                    # Si le numéro existe déjà, ajouter un suffixe aléatoire
                    import random

                    suffix = random.randint(1000, 9999)
                    invoice_number = f'FACT-{suffix}'

                # Créer une nouvelle facture finale avec le numéro unique
                from django.utils import timezone

                invoice = Invoice.objects.create(
                    number=invoice_number,  # Utiliser le numéro unique généré
                    type='standard',
                    company=order.company,
                    contact=order.contact,
                    opportunity=order.opportunity,
                    date=timezone.now().date(),
                    currency=order.currency,
                    exchange_rate=order.exchange_rate,
                    payment_terms=order.payment_terms,
                    bank_account=order.bank_account,
                    subtotal=order.subtotal * proportion,
                    tax_amount=order.tax_amount * proportion,
                    total=remaining_amount,
                    amount_paid=0,
                    amount_due=remaining_amount,
                    notes=f'Facture finale pour la commande {order.number}. Acompte(s) déduit(s): {deposit_total} {order.currency.code}',
                    terms=order.terms,
                    order=order,
                    quote=order.quote,
                    is_tax_exempt=order.is_tax_exempt,
                    tax_exemption_reason=order.tax_exemption_reason,
                )

                # Copier les lignes de produits avec des quantités ajustées
                order_items = order.get_items()

                # Pour chaque ligne, créer une ligne de facture avec quantité ajustée selon la proportion
                for order_item in order_items:
                    InvoiceItem.objects.create(
                        invoice=invoice,
                        product=order_item.product,
                        description=order_item.description,
                        quantity=order_item.quantity,  # Garder la quantité identique pour référence
                        unit_price=order_item.unit_price
                        * proportion,  # Ajuster le prix unitaire selon proportion restante
                        tax_rate=order_item.tax_rate,
                    )

                # Marquer l'ordre comme ayant une facture finale
                order.has_final_invoice = True
                order.save(update_fields=['has_final_invoice'])

                invoices_created += 1

                self.message_user(
                    request,
                    f'Facture finale {invoice.number} créée pour la commande {order.number}. '
                    + f'Acomptes déduits: {deposit_total} {order.currency.code}',
                    level='SUCCESS',
                )
            except Exception as e:
                import traceback

                self.message_user(
                    request,
                    f'Erreur lors de la création de la facture pour {order.number}: {str(e)}\n{traceback.format_exc()}',
                    level='ERROR',
                )

        if invoices_created == 0:
            self.message_user(
                request,
                "Aucune facture n'a été créée. Vérifiez les messages ci-dessus.",
                level='WARNING',
            )

    convert_to_invoice.short_description = 'Convertir en facture finale'


class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 1
    fields = ('product', 'description', 'quantity', 'unit_price', 'tax_rate')

    def get_formset(self, request, obj=None, **kwargs):
        formset = super().get_formset(request, obj, **kwargs)
        formset.validate_min = True
        return formset


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 1
    fields = ('amount', 'date', 'method', 'reference', 'notes')


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    form = InvoiceAdminForm
    list_display = (
        'number',
        'company',
        'contact',
        'date',
        'due_date',
        'total_display',
        'payment_status',
        'is_tax_exempt',
        'pdf_status',
        'email_status',
    )
    list_filter = ('payment_status', 'currency', 'date', 'due_date', 'is_tax_exempt')
    search_fields = (
        'number',
        'company__name',
        'contact__first_name',
        'contact__last_name',
    )
    date_hierarchy = 'date'
    readonly_fields = (
        'subtotal',
        'tax_amount',
        'total',
        'amount_paid',
        'amount_due',
        'pdf_file',
        'email_sent',
        'email_sent_date',
        'created_at',
        'updated_at',
    )
    inlines = [InvoiceItemInline, PaymentInline]

    # Ajouter les nouveaux champs aux fieldsets
    fieldsets = (
        (
            _('Informations générales'),
            {
                'fields': (
                    'number',
                    'type',
                    'company',
                    'contact',
                    'opportunity',
                    'quote',
                    'order',
                    'parent_invoice',
                )
            },
        ),
        (
            _('Détails du document'),
            {
                'fields': (
                    'date',
                    'due_date',
                    'payment_terms',
                    'payment_status',
                    'amount_paid',
                    'amount_due',
                )
            },
        ),
        (
            _('Informations spécifiques'),
            {'fields': ('deposit_percentage', 'credit_note_reason')},
        ),
        (
            _('Montants'),
            {
                'fields': (
                    'currency',
                    'exchange_rate',
                    'bank_account',
                    'is_tax_exempt',
                    'tax_exemption_reason',
                    'discount_percentage',
                    'subtotal',
                    'tax_amount',
                    'total',
                )
            },
        ),
        (_('Conditions et notes'), {'fields': ('notes', 'terms')}),
        (
            _('Métadonnées'),
            {
                'classes': ('collapse',),
                'fields': (
                    'created_at',
                    'updated_at',
                    'pdf_file',
                    'email_sent',
                    'email_sent_date',
                ),
            },
        ),
    )

    def total_display(self, obj):
        return f'{obj.total} {obj.currency.code}'

    total_display.short_description = 'Total'

    def pdf_status(self, obj):
        if obj.pdf_file:
            return format_html('<span style="color: green;">✓ Généré</span>')
        return format_html('<span style="color: red;">✗ Non généré</span>')

    pdf_status.short_description = 'PDF'

    def email_status(self, obj):
        if obj.email_sent:
            return format_html('<span style="color: green;">✓ Envoyé</span>')
        return format_html('<span style="color: orange;">✗ Non envoyé</span>')

    email_status.short_description = 'Email'

    def save_model(self, request, obj, form, change):
        if not change:  # Si c'est une création (pas une modification)
            # Pour les nouvelles factures, s'assurer que les champs financiers sont initialisés
            obj.subtotal = 0
            obj.tax_amount = 0
            obj.total = 0
            obj.amount_paid = 0
            obj.amount_due = 0
        super().save_model(request, obj, form, change)

    def save_formset(self, request, form, formset, change):
        instances = formset.save(commit=False)

        for instance in instances:
            if isinstance(instance, InvoiceItem):
                # Si prix unitaire non défini, utiliser celui du produit
                if instance.unit_price is None or instance.unit_price == 0:
                    instance.unit_price = instance.product.unit_price

                # Si taux de TVA non défini, utiliser celui du produit
                if instance.tax_rate is None or instance.tax_rate == 0:
                    instance.tax_rate = instance.product.tax_rate

                # Si description non définie, utiliser celle du produit
                if not instance.description:
                    instance.description = instance.product.description

            instance.save()

        # Supprimer les objets marqués pour suppression
        for obj in formset.deleted_objects:
            obj.delete()

        formset.save_m2m()

        # Mise à jour des totaux selon le type de formset
        if form.instance.pk:
            instance_type = None
            if instances:
                instance_type = type(instances[0])

            # Recalculer les montants de la facture
            if instance_type == InvoiceItem or instance_type is None:
                form.instance.calculate_amounts()

            # Recalculer le statut de paiement
            form.instance._update_payment_status()
            form.instance.save()

    # Ajouter les actions pour créer des factures spéciales
    actions = [
        'generate_pdf',
        'send_by_email',
        'mark_as_paid',
        'mark_as_partial',
        'mark_as_overdue',
        'mark_as_unpaid',
        'mark_as_cancelled',
        'create_credit_note',
    ]

    def generate_pdf(self, request, queryset):
        for invoice in queryset:
            invoice.generate_pdf()
        self.message_user(request, f'{len(queryset)} factures ont été générées en PDF.')

    generate_pdf.short_description = 'Générer les PDFs'

    def send_by_email(self, request, queryset):
        sent_count = 0
        for invoice in queryset:
            if invoice.contact and invoice.contact.email:
                try:
                    invoice.send_by_email(invoice.contact.email)
                    sent_count += 1
                except Exception as e:
                    self.message_user(
                        request,
                        f"Erreur lors de l'envoi de la facture {invoice.number}: {str(e)}",
                        level='ERROR',
                    )
            else:
                self.message_user(
                    request,
                    f"La facture {invoice.number} n'a pas d'email de contact défini.",
                    level='WARNING',
                )

        self.message_user(request, f'{sent_count} factures ont été envoyées par email.')

    send_by_email.short_description = 'Envoyer par email'

    def create_credit_note(self, request, queryset):
        """Action pour créer un avoir à partir d'une facture sélectionnée."""
        # Vérifier qu'une seule facture est sélectionnée
        if queryset.count() != 1:
            self.message_user(
                request,
                'Veuillez sélectionner une seule facture pour créer un avoir.',
                level='ERROR',
            )
            return

        invoice = queryset.first()

        # Vérifier que ce n'est pas déjà un avoir
        if getattr(invoice, 'type', 'standard') == 'credit_note':
            self.message_user(
                request,
                'Impossible de créer un avoir pour un autre avoir.',
                level='ERROR',
            )
            return

        try:
            # Créer l'avoir (montant total par défaut)
            from decimal import Decimal

            from django.utils import timezone

            # Déterminer le montant de l'avoir (total par défaut)
            credit_amount = invoice.total
            proportion = Decimal('1.0')
            reason = "Avoir créé depuis l'interface d'administration"

            # Générer un numéro d'avoir unique
            last_credit_note = (
                Invoice.objects.filter(type='credit_note').order_by('-id').first()
            )

            # Générer un nouveau numéro d'avoir
            credit_note_number = 'AV-0001'  # Valeur par défaut

            if last_credit_note and last_credit_note.number:
                try:
                    # Tente d'extraire le numéro après le préfixe
                    prefix = 'AV-'
                    if prefix in last_credit_note.number:
                        # Format avec tiret (AV-XXXX)
                        num_part = last_credit_note.number.split(prefix)[1]
                        next_num = int(num_part) + 1
                        credit_note_number = f'{prefix}{next_num:04d}'
                    else:
                        # Au cas où le format est différent, utiliser une approche plus générique
                        import re

                        numeric_part = re.sub(r'[^0-9]', '', last_credit_note.number)
                        if numeric_part:
                            next_num = int(numeric_part) + 1
                            credit_note_number = f'AV-{next_num:04d}'
                except (ValueError, IndexError):
                    # En cas d'erreur, ajouter un timestamp pour assurer l'unicité
                    from datetime import datetime

                    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
                    credit_note_number = f'AV-{timestamp}'

            # Pour s'assurer que le numéro est vraiment unique, vérifier une dernière fois
            while Invoice.objects.filter(number=credit_note_number).exists():
                # Si le numéro existe déjà, ajouter un suffixe aléatoire
                import random

                suffix = random.randint(1000, 9999)
                credit_note_number = f'AV-{suffix}'

            # Créer l'avoir
            credit_note = Invoice.objects.create(
                number=credit_note_number,
                type='credit_note',
                company=invoice.company,
                contact=invoice.contact,
                opportunity=invoice.opportunity,
                date=timezone.now().date(),
                currency=invoice.currency,
                exchange_rate=invoice.exchange_rate,
                payment_terms=invoice.payment_terms,
                bank_account=invoice.bank_account,
                subtotal=-abs(invoice.subtotal * proportion),
                tax_amount=-abs(invoice.tax_amount * proportion),
                total=-abs(credit_amount),
                amount_paid=0,
                amount_due=-abs(credit_amount),
                notes=f'Avoir pour la facture {invoice.number}',
                terms=invoice.terms,
                parent_invoice=invoice,
                order=invoice.order,
                quote=invoice.quote,
                credit_note_reason=reason,
                is_tax_exempt=invoice.is_tax_exempt,
                tax_exemption_reason=invoice.tax_exemption_reason,
            )

            # Copier les lignes de produits avec des montants ajustés
            for item in invoice.get_items():
                InvoiceItem.objects.create(
                    invoice=credit_note,
                    product=item.product,
                    description=f'Avoir: {item.description}',
                    quantity=item.quantity * proportion,
                    unit_price=-abs(
                        item.unit_price
                    ),  # Montants négatifs pour les avoirs
                    tax_rate=item.tax_rate,
                )

            # Si l'avoir est total et que la facture est marquée comme payée,
            # mettre à jour le statut de paiement de la facture
            if proportion >= Decimal('0.99') and invoice.payment_status == 'paid':
                invoice.amount_paid = Decimal('0')
                invoice.amount_due = invoice.total
                invoice.payment_status = 'unpaid'
                invoice.save(
                    update_fields=['amount_paid', 'amount_due', 'payment_status']
                )

            self.message_user(
                request,
                f'Avoir {credit_note.number} créé avec succès pour la facture {invoice.number}.',
                level='SUCCESS',
            )
        except Exception as e:
            import traceback

            self.message_user(
                request,
                f"Erreur lors de la création de l'avoir: {str(e)}\n{traceback.format_exc()}",
                level='ERROR',
            )

    create_credit_note.short_description = 'Créer un avoir pour cette facture'

    def mark_as_paid(self, request, queryset):
        """Action pour marquer les factures sélectionnées comme payées."""
        from decimal import Decimal

        from django.utils import timezone

        self.message_user(
            request,
            f'Tentative de marquer {len(queryset)} factures comme payées...',
            level='INFO',
        )
        updated_count = 0

        for invoice in queryset:
            if invoice.payment_status == 'paid':
                self.message_user(
                    request,
                    f'La facture {invoice.number} est déjà marquée comme payée.',
                    level='WARNING',
                )
                continue

            try:
                # Calculer le montant restant à payer
                amount_to_pay = invoice.total - invoice.amount_paid

                if amount_to_pay > 0:
                    # Créer un paiement pour le montant restant
                    Payment.objects.create(
                        invoice=invoice,
                        amount=amount_to_pay,
                        date=timezone.now().date(),
                        method='bank_transfer',
                        reference='Paiement manuel',
                        notes="Marqué comme payé via l'interface d'administration",
                    )

                # Au lieu d'utiliser une requête SQL directe, utiliser l'API Django
                invoice.amount_paid = invoice.total
                invoice.amount_due = Decimal('0')
                invoice.payment_status = 'paid'
                invoice.save(
                    update_fields=['amount_paid', 'amount_due', 'payment_status']
                )

                updated_count += 1
                self.message_user(
                    request,
                    f'Facture {invoice.number} marquée comme payée avec succès.',
                    level='SUCCESS',
                )

            except Exception as e:
                import traceback

                self.message_user(
                    request,
                    f'Erreur lors du marquage de la facture {invoice.number} comme payée: {str(e)}\n{traceback.format_exc()}',
                    level='ERROR',
                )

        if updated_count > 0:
            self.message_user(
                request, f'{updated_count} factures ont été marquées comme payées.'
            )
        else:
            self.message_user(
                request, "Aucune facture n'a été marquée comme payée.", level='WARNING'
            )

    mark_as_paid.short_description = 'Marquer comme payées'

    def mark_as_partial(self, request, queryset):
        """Action pour marquer les factures sélectionnées comme partiellement payées."""
        from decimal import Decimal

        from django.utils import timezone

        self.message_user(
            request,
            f'Tentative de marquer {len(queryset)} factures comme partiellement payées...',
            level='INFO',
        )
        updated_count = 0

        for invoice in queryset:
            if invoice.payment_status == 'partial':
                self.message_user(
                    request,
                    f'La facture {invoice.number} est déjà marquée comme partiellement payée.',
                    level='WARNING',
                )
                continue

            try:
                # Si aucun paiement n'existe, créer un paiement pour 50% du montant
                if invoice.amount_paid == 0:
                    partial_amount = invoice.total * Decimal('0.5')
                    Payment.objects.create(
                        invoice=invoice,
                        amount=partial_amount,
                        date=timezone.now().date(),
                        method='bank_transfer',
                        reference='Paiement partiel',
                        notes="Marqué comme partiellement payé via l'interface d'administration",
                    )

                # Mettre à jour directement la base de données
                from django.db import connection

                with connection.cursor() as cursor:
                    # Si aucun paiement n'existait, on définit amount_paid à 50% du total
                    amount_paid = (
                        invoice.amount_paid
                        if invoice.amount_paid > 0
                        else (invoice.total * Decimal('0.5'))
                    )
                    amount_due = invoice.total - amount_paid

                    cursor.execute(
                        'UPDATE sales_invoice SET amount_paid = %s, amount_due = %s, payment_status = %s WHERE id = %s',
                        [amount_paid, amount_due, 'partial', invoice.id],
                    )

                updated_count += 1
                self.message_user(
                    request,
                    f'Facture {invoice.number} marquée comme partiellement payée.',
                    level='SUCCESS',
                )

            except Exception as e:
                import traceback

                self.message_user(
                    request,
                    f'Erreur lors du marquage de la facture {invoice.number}: {str(e)}\n{traceback.format_exc()}',
                    level='ERROR',
                )

        if updated_count > 0:
            self.message_user(
                request,
                f'{updated_count} factures ont été marquées comme partiellement payées.',
            )
        else:
            self.message_user(
                request,
                "Aucune facture n'a été marquée comme partiellement payée.",
                level='WARNING',
            )

    mark_as_partial.short_description = 'Marquer comme partiellement payées'

    def mark_as_overdue(self, request, queryset):
        """Action pour marquer les factures sélectionnées comme en retard."""
        self.update_invoice_status(request, queryset, 'overdue', 'en retard')

    mark_as_overdue.short_description = 'Marquer comme en retard'

    def mark_as_unpaid(self, request, queryset):
        """Action pour marquer les factures sélectionnées comme non payées."""
        self.update_invoice_status(request, queryset, 'unpaid', 'non payées')

    mark_as_unpaid.short_description = 'Marquer comme non payées'

    def mark_as_cancelled(self, request, queryset):
        """Action pour marquer les factures sélectionnées comme annulées."""
        self.update_invoice_status(request, queryset, 'cancelled', 'annulées')

    mark_as_cancelled.short_description = 'Marquer comme annulées'

    def update_invoice_status(self, request, queryset, status, status_display):
        """Méthode utilitaire pour mettre à jour le statut des factures."""
        updated_count = 0

        for invoice in queryset:
            if invoice.payment_status == status:
                self.message_user(
                    request,
                    f'La facture {invoice.number} est déjà marquée comme {status_display}.',
                    level='WARNING',
                )
                continue

            try:
                # Mettre à jour directement la base de données
                from django.db import connection

                with connection.cursor() as cursor:
                    cursor.execute(
                        'UPDATE sales_invoice SET payment_status = %s WHERE id = %s',
                        [status, invoice.id],
                    )

                updated_count += 1
                self.message_user(
                    request,
                    f'Facture {invoice.number} marquée comme {status_display}.',
                    level='SUCCESS',
                )

            except Exception as e:
                import traceback

                self.message_user(
                    request,
                    f'Erreur lors du marquage de la facture {invoice.number}: {str(e)}\n{traceback.format_exc()}',
                    level='ERROR',
                )

        if updated_count > 0:
            self.message_user(
                request,
                f'{updated_count} factures ont été marquées comme {status_display}.',
            )
        else:
            self.message_user(
                request,
                f"Aucune facture n'a été marquée comme {status_display}.",
                level='WARNING',
            )


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    # Corrigé : Retiré 'created_by' de list_display car il n'existe pas dans le modèle
    list_display = ('invoice', 'amount', 'date', 'method', 'reference')
    list_filter = ('method', 'date')
    search_fields = ('invoice__number', 'reference', 'notes')
    date_hierarchy = 'date'
