from rest_framework import serializers

from .models import (
    PurchaseOrder,
    PurchaseOrderItem,
    Reception,
    ReceptionItem,
    Supplier,
    SupplierInvoice,
    SupplierInvoiceItem,
    SupplierPayment,
)


class SupplierSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(
        source='company.name', read_only=True, default=None
    )
    currency_code = serializers.CharField(source='currency.code', read_only=True)

    class Meta:
        model = Supplier
        fields = '__all__'


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_reference = serializers.CharField(
        source='product.reference', read_only=True
    )
    subtotal = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    tax_amount = serializers.DecimalField(
        max_digits=15, decimal_places=2, read_only=True
    )
    total = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    quantity_remaining = serializers.DecimalField(
        max_digits=15, decimal_places=3, read_only=True
    )

    class Meta:
        model = PurchaseOrderItem
        fields = '__all__'


class PurchaseOrderSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    currency_code = serializers.CharField(source='currency.code', read_only=True)
    state_display = serializers.CharField(source='get_state_display', read_only=True)
    items_count = serializers.IntegerField(source='items.count', read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = '__all__'
        read_only_fields = ['number', 'created_by', 'created_at', 'updated_at']


class PurchaseOrderDetailSerializer(PurchaseOrderSerializer):
    items = PurchaseOrderItemSerializer(many=True, read_only=True)


class ReceptionItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_reference = serializers.CharField(
        source='product.reference', read_only=True
    )

    class Meta:
        model = ReceptionItem
        fields = '__all__'


class ReceptionSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(
        source='purchase_order.supplier.name', read_only=True
    )
    purchase_order_number = serializers.CharField(
        source='purchase_order.number', read_only=True
    )
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    state_display = serializers.CharField(source='get_state_display', read_only=True)
    items_count = serializers.IntegerField(source='items.count', read_only=True)

    class Meta:
        model = Reception
        fields = '__all__'
        read_only_fields = [
            'number',
            'validated_by',
            'validated_at',
            'created_by',
            'created_at',
        ]


class ReceptionDetailSerializer(ReceptionSerializer):
    items = ReceptionItemSerializer(many=True, read_only=True)


class SupplierInvoiceItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_reference = serializers.CharField(
        source='product.reference', read_only=True
    )
    subtotal = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    tax_amount = serializers.DecimalField(
        max_digits=15, decimal_places=2, read_only=True
    )
    total = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)

    class Meta:
        model = SupplierInvoiceItem
        fields = '__all__'


class SupplierInvoiceSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    currency_code = serializers.CharField(source='currency.code', read_only=True)
    state_display = serializers.CharField(source='get_state_display', read_only=True)
    items_count = serializers.IntegerField(source='items.count', read_only=True)

    class Meta:
        model = SupplierInvoice
        fields = '__all__'
        read_only_fields = [
            'number',
            'amount_paid',
            'amount_due',
            'journal_entry',
            'created_by',
            'created_at',
            'updated_at',
        ]


class SupplierInvoiceDetailSerializer(SupplierInvoiceSerializer):
    items = SupplierInvoiceItemSerializer(many=True, read_only=True)


class SupplierPaymentSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source='invoice.number', read_only=True)
    supplier_name = serializers.CharField(
        source='invoice.supplier.name', read_only=True
    )
    method_display = serializers.CharField(source='get_method_display', read_only=True)

    class Meta:
        model = SupplierPayment
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at']
