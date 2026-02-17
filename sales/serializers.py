from django.contrib.auth.models import User
from rest_framework import serializers

from core.models import Currency  # Importation de Currency depuis core.models

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


class UserSerializer(serializers.ModelSerializer):
    """Serializer pour les utilisateurs."""

    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name']

    def get_full_name(self, obj):
        return (
            f'{obj.first_name} {obj.last_name}'
            if obj.first_name or obj.last_name
            else obj.username
        )


class CurrencySerializer(serializers.ModelSerializer):
    """Serializer pour les devises."""

    class Meta:
        model = Currency
        fields = ['id', 'code', 'name', 'is_default']


class BankAccountSerializer(serializers.ModelSerializer):
    """Serializer pour les comptes bancaires."""

    currency_display = serializers.SerializerMethodField()

    class Meta:
        model = BankAccount
        fields = [
            'id',
            'name',
            'bank_name',
            'rib',
            'iban',
            'swift',
            'currency',
            'currency_display',
            'is_default',
        ]

    def get_currency_display(self, obj):
        return obj.currency.code if obj.currency else None


class ProductSerializer(serializers.ModelSerializer):
    """Serializer pour les produits."""

    currency_display = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'reference',
            'description',
            'unit_price',
            'currency',
            'currency_display',
            'tax_rate',
            'is_active',
        ]

    def get_currency_display(self, obj):
        return obj.currency.code if obj.currency else None


class QuoteItemSerializer(serializers.ModelSerializer):
    """Serializer pour les lignes de devis."""

    product_name = serializers.SerializerMethodField()
    product_reference = serializers.SerializerMethodField()

    class Meta:
        model = QuoteItem
        fields = [
            'id',
            'quote',
            'product',
            'product_name',
            'product_reference',
            'description',
            'quantity',
            'unit_price',
            'tax_rate',
            'subtotal',
            'tax_amount',
            'total',
        ]

    def get_product_name(self, obj):
        return obj.product.name if obj.product else None

    def get_product_reference(self, obj):
        return obj.product.reference if obj.product else None


class QuoteSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des devis."""

    company_name = serializers.SerializerMethodField()
    contact_name = serializers.SerializerMethodField()
    currency_code = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    discount_amount = serializers.SerializerMethodField()
    subtotal_after_discount = serializers.SerializerMethodField()

    class Meta:
        model = Quote
        fields = [
            'id',
            'number',
            'company',
            'company_name',
            'contact',
            'contact_name',
            'date',
            'expiration_date',
            'currency',
            'currency_code',
            'discount_percentage',
            'discount_amount',
            'subtotal_after_discount',
            'subtotal',
            'tax_amount',
            'total',
            'status',
            'status_display',
            'converted_to_order',
            'converted_to_invoice',
            'is_expired',
            'is_tax_exempt',
            'tax_exemption_reason',
            'pdf_file',
            'email_sent',
            'email_sent_date',
        ]

    def get_company_name(self, obj):
        return obj.company.name if obj.company else None

    def get_contact_name(self, obj):
        return (
            f'{obj.contact.first_name} {obj.contact.last_name}' if obj.contact else None
        )

    def get_currency_code(self, obj):
        return obj.currency.code if obj.currency else None

    def get_status_display(self, obj):
        status_map = {
            'draft': 'Brouillon',
            'sent': 'Envoyé',
            'accepted': 'Accepté',
            'rejected': 'Refusé',
            'cancelled': 'Annulé',
            'expired': 'Expiré',
        }
        return status_map.get(obj.status, obj.status)

    def get_is_expired(self, obj):
        from django.utils import timezone

        return (
            obj.expiration_date < timezone.now().date()
            if obj.expiration_date
            else False
        )

    def get_discount_amount(self, obj):
        return obj.discount_amount

    def get_subtotal_after_discount(self, obj):
        return obj.subtotal_after_discount


class QuoteDetailSerializer(serializers.ModelSerializer):
    """Serializer détaillé pour les devis."""

    items = QuoteItemSerializer(many=True, read_only=True)
    status_display = serializers.SerializerMethodField()
    discount_amount = serializers.SerializerMethodField()
    subtotal_after_discount = serializers.SerializerMethodField()

    class Meta:
        model = Quote
        fields = [
            'id',
            'number',
            'company',
            'contact',
            'opportunity',
            'date',
            'expiration_date',
            'validity_period',
            'currency',
            'exchange_rate',
            'bank_account',
            'payment_terms',
            'discount_percentage',
            'discount_amount',
            'subtotal_after_discount',
            'is_tax_exempt',
            'tax_exemption_reason',
            'subtotal',
            'tax_amount',
            'total',
            'status',
            'status_display',
            'notes',
            'terms',
            'created_at',
            'updated_at',
            'items',
            'converted_to_order',
            'converted_to_invoice',
            'pdf_file',
            'email_sent',
            'email_sent_date',
        ]
        read_only_fields = [
            'created_at',
            'updated_at',
            'converted_to_order',
            'converted_to_invoice',
            'pdf_file',
            'email_sent',
            'email_sent_date',
        ]

    def get_status_display(self, obj):
        status_map = {
            'draft': 'Brouillon',
            'sent': 'Envoyé',
            'accepted': 'Accepté',
            'rejected': 'Refusé',
            'cancelled': 'Annulé',
            'expired': 'Expiré',
        }
        return status_map.get(obj.status, obj.status)

    def get_discount_amount(self, obj):
        return obj.discount_amount

    def get_subtotal_after_discount(self, obj):
        return obj.subtotal_after_discount


class OrderItemSerializer(serializers.ModelSerializer):
    """Serializer pour les lignes de commande."""

    product_name = serializers.SerializerMethodField()
    product_reference = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            'id',
            'order',
            'product',
            'product_name',
            'product_reference',
            'description',
            'quantity',
            'unit_price',
            'tax_rate',
            'subtotal',
            'tax_amount',
            'total',
        ]

    def get_product_name(self, obj):
        return obj.product.name if obj.product else None

    def get_product_reference(self, obj):
        return obj.product.reference if obj.product else None


class OrderSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des commandes."""

    company_name = serializers.SerializerMethodField()
    contact_name = serializers.SerializerMethodField()
    currency_code = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    quote_number = serializers.SerializerMethodField()
    discount_amount = serializers.SerializerMethodField()
    subtotal_after_discount = serializers.SerializerMethodField()
    has_deposit_invoice = serializers.BooleanField(read_only=True)
    has_final_invoice = serializers.BooleanField(read_only=True)
    deposit_total = serializers.SerializerMethodField()
    remaining_amount = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id',
            'number',
            'company',
            'company_name',
            'contact',
            'contact_name',
            'quote',
            'quote_number',
            'date',
            'delivery_date',
            'currency',
            'currency_code',
            'discount_percentage',
            'discount_amount',
            'subtotal_after_discount',
            'subtotal',
            'tax_amount',
            'total',
            'status',
            'status_display',
            'is_tax_exempt',
            'tax_exemption_reason',
            'converted_to_invoice',
            'has_deposit_invoice',
            'has_final_invoice',
            'deposit_total',
            'remaining_amount',
            'pdf_file',
            'email_sent',
            'email_sent_date',
        ]

    def get_company_name(self, obj):
        return obj.company.name if obj.company else None

    def get_contact_name(self, obj):
        return (
            f'{obj.contact.first_name} {obj.contact.last_name}' if obj.contact else None
        )

    def get_currency_code(self, obj):
        return obj.currency.code if obj.currency else None

    def get_status_display(self, obj):
        status_map = {
            'draft': 'Brouillon',
            'confirmed': 'Confirmé',
            'processing': 'En traitement',
            'delivered': 'Livré',
            'cancelled': 'Annulé',
        }
        return status_map.get(obj.status, obj.status)

    def get_quote_number(self, obj):
        return obj.quote.number if obj.quote else None

    def get_discount_amount(self, obj):
        return obj.discount_amount

    def get_subtotal_after_discount(self, obj):
        return obj.subtotal_after_discount

    def get_deposit_total(self, obj):
        return obj.get_deposit_total()

    def get_remaining_amount(self, obj):
        return obj.get_remaining_amount()


class OrderDetailSerializer(serializers.ModelSerializer):
    """Serializer détaillé pour les commandes."""

    items = OrderItemSerializer(many=True, read_only=True)
    status_display = serializers.SerializerMethodField()
    discount_amount = serializers.SerializerMethodField()
    subtotal_after_discount = serializers.SerializerMethodField()
    deposit_invoices = serializers.SerializerMethodField()
    deposit_total = serializers.SerializerMethodField()
    remaining_amount = serializers.SerializerMethodField()
    can_create_deposit_invoice = serializers.SerializerMethodField()
    can_create_final_invoice = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id',
            'number',
            'company',
            'contact',
            'opportunity',
            'quote',
            'date',
            'delivery_date',
            'delivery_address',
            'currency',
            'exchange_rate',
            'bank_account',
            'payment_terms',
            'discount_percentage',
            'discount_amount',
            'subtotal_after_discount',
            'is_tax_exempt',
            'tax_exemption_reason',
            'subtotal',
            'tax_amount',
            'total',
            'status',
            'status_display',
            'notes',
            'terms',
            'created_by',
            'created_at',
            'updated_at',
            'items',
            'converted_to_invoice',
            'has_deposit_invoice',
            'has_final_invoice',
            'deposit_invoices',
            'deposit_total',
            'remaining_amount',
            'can_create_deposit_invoice',
            'can_create_final_invoice',
            'pdf_file',
            'email_sent',
            'email_sent_date',
        ]
        read_only_fields = [
            'created_by',
            'created_at',
            'updated_at',
            'converted_to_invoice',
            'has_deposit_invoice',
            'has_final_invoice',
            'pdf_file',
            'email_sent',
            'email_sent_date',
        ]

    def get_status_display(self, obj):
        status_map = {
            'draft': 'Brouillon',
            'confirmed': 'Confirmé',
            'processing': 'En traitement',
            'delivered': 'Livré',
            'cancelled': 'Annulé',
        }
        return status_map.get(obj.status, obj.status)

    def get_discount_amount(self, obj):
        return obj.discount_amount

    def get_subtotal_after_discount(self, obj):
        return obj.subtotal_after_discount

    def get_deposit_invoices(self, obj):
        return [
            {'id': inv.id, 'number': inv.number, 'total': inv.total, 'date': inv.date}
            for inv in obj.get_deposit_invoices()
        ]

    def get_deposit_total(self, obj):
        return obj.get_deposit_total()

    def get_remaining_amount(self, obj):
        return obj.get_remaining_amount()

    def get_can_create_deposit_invoice(self, obj):
        return obj.can_create_deposit_invoice()

    def get_can_create_final_invoice(self, obj):
        return obj.can_create_final_invoice()


class InvoiceItemSerializer(serializers.ModelSerializer):
    """Serializer pour les lignes de facture."""

    product_name = serializers.SerializerMethodField()
    product_reference = serializers.SerializerMethodField()

    class Meta:
        model = InvoiceItem
        fields = [
            'id',
            'invoice',
            'product',
            'product_name',
            'product_reference',
            'description',
            'quantity',
            'unit_price',
            'tax_rate',
            'subtotal',
            'tax_amount',
            'total',
        ]

    def get_product_name(self, obj):
        return obj.product.name if obj.product else None

    def get_product_reference(self, obj):
        return obj.product.reference if obj.product else None


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer pour les paiements."""

    method_display = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            'id',
            'invoice',
            'amount',
            'date',
            'method',
            'method_display',
            'reference',
            'notes',
        ]
        read_only_fields = []

    def get_method_display(self, obj):
        method_map = {
            'bank_transfer': 'Virement bancaire',
            'check': 'Chèque',
            'cash': 'Espèces',
            'card': 'Carte bancaire',
            'other': 'Autre',
        }
        return method_map.get(obj.method, obj.method)


class InvoiceSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des factures."""

    company_name = serializers.SerializerMethodField()
    contact_name = serializers.SerializerMethodField()
    currency_code = serializers.SerializerMethodField()
    payment_status_display = serializers.SerializerMethodField()
    quote_number = serializers.SerializerMethodField()
    order_number = serializers.SerializerMethodField()
    payment_terms_display = serializers.SerializerMethodField()
    discount_amount = serializers.SerializerMethodField()
    subtotal_after_discount = serializers.SerializerMethodField()
    deposit_invoices = serializers.SerializerMethodField()
    remaining_amount = serializers.SerializerMethodField()
    type_display = serializers.SerializerMethodField()
    parent_invoice_number = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id',
            'number',
            'type',
            'type_display',
            'company',
            'company_name',
            'contact',
            'contact_name',
            'quote',
            'quote_number',
            'order',
            'order_number',
            'parent_invoice',
            'parent_invoice_number',
            'date',
            'due_date',
            'currency',
            'currency_code',
            'payment_terms',
            'payment_terms_display',
            'discount_percentage',
            'discount_amount',
            'subtotal_after_discount',
            'subtotal',
            'tax_amount',
            'total',
            'amount_paid',
            'amount_due',
            'is_tax_exempt',
            'tax_exemption_reason',
            'payment_status',
            'payment_status_display',
            'deposit_percentage',
            'credit_note_reason',
            'deposit_invoices',
            'remaining_amount',
            'pdf_file',
            'email_sent',
            'email_sent_date',
        ]

    def get_company_name(self, obj):
        return obj.company.name if obj.company else None

    def get_contact_name(self, obj):
        return (
            f'{obj.contact.first_name} {obj.contact.last_name}' if obj.contact else None
        )

    def get_currency_code(self, obj):
        return obj.currency.code if obj.currency else None

    def get_type_display(self, obj):
        type_map = {
            'standard': 'Facture standard',
            'deposit': "Facture d'acompte",
            'credit_note': 'Avoir',
        }
        return type_map.get(obj.type, obj.type)

    def get_payment_status_display(self, obj):
        status_map = {
            'unpaid': 'Non payée',
            'partial': 'Partiellement payée',
            'paid': 'Payée',
            'overdue': 'En retard',
            'cancelled': 'Annulée',
        }
        return status_map.get(obj.payment_status, obj.payment_status)

    def get_quote_number(self, obj):
        return obj.quote.number if obj.quote else None

    def get_order_number(self, obj):
        return obj.order.number if obj.order else None

    def get_parent_invoice_number(self, obj):
        return obj.parent_invoice.number if obj.parent_invoice else None

    def get_payment_terms_display(self, obj):
        terms_map = {
            'immediate': 'Paiement immédiat',
            '30_days': 'Paiement à 30 jours',
            '60_days': 'Paiement à 60 jours',
        }
        return terms_map.get(obj.payment_terms, obj.payment_terms)

    def get_discount_amount(self, obj):
        return obj.discount_amount

    def get_subtotal_after_discount(self, obj):
        return obj.subtotal_after_discount

    def get_deposit_invoices(self, obj):
        if obj.order:
            return [
                {'id': inv.id, 'number': inv.number, 'total': inv.total}
                for inv in obj.order.get_deposit_invoices()
            ]
        return []

    def get_remaining_amount(self, obj):
        if obj.order:
            return obj.order.get_remaining_amount()
        return 0


class InvoiceDetailSerializer(serializers.ModelSerializer):
    """Serializer détaillé pour les factures."""

    items = InvoiceItemSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    payment_status_display = serializers.SerializerMethodField()
    payment_terms_display = serializers.SerializerMethodField()
    amount_due = serializers.SerializerMethodField()
    discount_amount = serializers.SerializerMethodField()
    subtotal_after_discount = serializers.SerializerMethodField()
    deposit_invoices = serializers.SerializerMethodField()
    remaining_amount = serializers.SerializerMethodField()
    type_display = serializers.SerializerMethodField()
    parent_invoice_details = serializers.SerializerMethodField()
    child_invoices = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id',
            'number',
            'type',
            'type_display',
            'company',
            'contact',
            'opportunity',
            'quote',
            'order',
            'parent_invoice',
            'parent_invoice_details',
            'child_invoices',
            'date',
            'due_date',
            'currency',
            'exchange_rate',
            'bank_account',
            'payment_terms',
            'payment_terms_display',
            'discount_percentage',
            'discount_amount',
            'subtotal_after_discount',
            'is_tax_exempt',
            'tax_exemption_reason',
            'subtotal',
            'tax_amount',
            'total',
            'amount_paid',
            'amount_due',
            'payment_status',
            'payment_status_display',
            'deposit_percentage',
            'credit_note_reason',
            'deposit_invoices',
            'remaining_amount',
            'notes',
            'terms',
            'created_by',
            'created_at',
            'updated_at',
            'items',
            'payments',
            'pdf_file',
            'email_sent',
            'email_sent_date',
        ]
        read_only_fields = [
            'created_by',
            'created_at',
            'updated_at',
            'amount_paid',
            'pdf_file',
            'email_sent',
            'email_sent_date',
        ]

    def get_type_display(self, obj):
        type_map = {
            'standard': 'Facture standard',
            'deposit': "Facture d'acompte",
            'credit_note': 'Avoir',
        }
        return type_map.get(obj.type, obj.type)

    def get_payment_status_display(self, obj):
        status_map = {
            'unpaid': 'Non payée',
            'partial': 'Partiellement payée',
            'paid': 'Payée',
            'overdue': 'En retard',
            'cancelled': 'Annulée',
        }
        return status_map.get(obj.payment_status, obj.payment_status)

    def get_payment_terms_display(self, obj):
        terms_map = {
            'immediate': 'Paiement immédiat',
            '30_days': 'Paiement à 30 jours',
            '60_days': 'Paiement à 60 jours',
        }
        return terms_map.get(obj.payment_terms, obj.payment_terms)

    def get_amount_due(self, obj):
        return obj.total - obj.amount_paid

    def get_discount_amount(self, obj):
        return obj.discount_amount

    def get_subtotal_after_discount(self, obj):
        return obj.subtotal_after_discount

    def get_deposit_invoices(self, obj):
        if obj.order:
            return [
                {
                    'id': inv.id,
                    'number': inv.number,
                    'total': inv.total,
                    'date': inv.date,
                }
                for inv in obj.order.get_deposit_invoices()
            ]
        return []

    def get_remaining_amount(self, obj):
        if obj.order:
            return obj.order.get_remaining_amount()
        return 0

    def get_parent_invoice_details(self, obj):
        if obj.parent_invoice:
            return {
                'id': obj.parent_invoice.id,
                'number': obj.parent_invoice.number,
                'total': obj.parent_invoice.total,
                'date': obj.parent_invoice.date,
                'type': obj.parent_invoice.type,
            }
        return None

    def get_child_invoices(self, obj):
        child_invoices = obj.child_invoices.all()
        if child_invoices:
            return [
                {
                    'id': inv.id,
                    'number': inv.number,
                    'total': inv.total,
                    'date': inv.date,
                    'type': inv.type,
                }
                for inv in child_invoices
            ]
        return []
