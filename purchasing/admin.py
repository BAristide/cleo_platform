from django.contrib import admin

from .models import (
    PurchaseOrder,
    PurchaseOrderItem,
    Reception,
    ReceptionItem,
    Supplier,
    SupplierInvoice,
    SupplierInvoiceDocument,
    SupplierInvoiceItem,
    SupplierPayment,
)


class PurchaseOrderItemInline(admin.TabularInline):
    model = PurchaseOrderItem
    extra = 1


class ReceptionItemInline(admin.TabularInline):
    model = ReceptionItem
    extra = 1


class SupplierInvoiceItemInline(admin.TabularInline):
    model = SupplierInvoiceItem
    extra = 1


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'email', 'phone', 'is_active']
    list_filter = ['is_active', 'currency']
    search_fields = ['code', 'name', 'email']


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ['number', 'supplier', 'date', 'state', 'total']
    list_filter = ['state', 'date']
    search_fields = ['number', 'supplier__name']
    inlines = [PurchaseOrderItemInline]


@admin.register(Reception)
class ReceptionAdmin(admin.ModelAdmin):
    list_display = ['number', 'purchase_order', 'date', 'state', 'warehouse']
    list_filter = ['state', 'warehouse']
    search_fields = ['number']
    inlines = [ReceptionItemInline]


@admin.register(SupplierInvoice)
class SupplierInvoiceAdmin(admin.ModelAdmin):
    list_display = ['number', 'supplier', 'date', 'state', 'total', 'amount_due']
    list_filter = ['state', 'date']
    search_fields = ['number', 'supplier__name', 'supplier_reference']
    inlines = [SupplierInvoiceItemInline]


@admin.register(SupplierPayment)
class SupplierPaymentAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'date', 'amount', 'method']
    list_filter = ['method', 'date']


@admin.register(SupplierInvoiceDocument)
class SupplierInvoiceDocumentAdmin(admin.ModelAdmin):
    list_display = (
        'filename',
        'invoice',
        'file_size',
        'mime_type',
        'uploaded_by',
        'uploaded_at',
    )
    list_filter = ('mime_type', 'uploaded_at')
    readonly_fields = ('uploaded_at',)
