from rest_framework import serializers

from .models import (
    ProductCategory,
    StockInventory,
    StockInventoryLine,
    StockLevel,
    StockMove,
    Warehouse,
)


class WarehouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = '__all__'


class ProductCategorySerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(
        source='parent.name', read_only=True, default=None
    )

    class Meta:
        model = ProductCategory
        fields = '__all__'


class StockMoveSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_reference = serializers.CharField(
        source='product.reference', read_only=True
    )
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    move_type_display = serializers.CharField(
        source='get_move_type_display', read_only=True
    )
    created_by_name = serializers.CharField(
        source='created_by.get_full_name', read_only=True, default=None
    )

    class Meta:
        model = StockMove
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at']


class StockLevelSerializer(serializers.ModelSerializer):
    quantity_available = serializers.DecimalField(
        max_digits=15, decimal_places=3, read_only=True
    )
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_reference = serializers.CharField(
        source='product.reference', read_only=True
    )
    product_type = serializers.CharField(source='product.product_type', read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    stock_alert_threshold = serializers.DecimalField(
        source='product.stock_alert_threshold',
        max_digits=15,
        decimal_places=3,
        read_only=True,
    )
    is_below_threshold = serializers.SerializerMethodField()

    class Meta:
        model = StockLevel
        fields = [
            'id',
            'product',
            'warehouse',
            'quantity_on_hand',
            'quantity_reserved',
            'quantity_available',
            'last_updated',
            'product_name',
            'product_reference',
            'product_type',
            'warehouse_name',
            'stock_alert_threshold',
            'is_below_threshold',
        ]
        read_only_fields = [
            'quantity_on_hand',
            'quantity_reserved',
            'quantity_available',
            'last_updated',
        ]

    def get_is_below_threshold(self, obj):
        threshold = obj.product.stock_alert_threshold
        if threshold and threshold > 0:
            return (
                obj.quantity_available is not None
                and obj.quantity_available < threshold
            )
        return False


class StockInventoryLineSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_reference = serializers.CharField(
        source='product.reference', read_only=True
    )
    difference = serializers.DecimalField(
        max_digits=15, decimal_places=3, read_only=True
    )

    class Meta:
        model = StockInventoryLine
        fields = [
            'id',
            'inventory',
            'product',
            'theoretical_qty',
            'physical_qty',
            'difference',
            'product_name',
            'product_reference',
        ]
        read_only_fields = ['difference']


class StockInventorySerializer(serializers.ModelSerializer):
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    state_display = serializers.CharField(source='get_state_display', read_only=True)
    validated_by_name = serializers.CharField(
        source='validated_by.get_full_name', read_only=True, default=None
    )
    lines_count = serializers.IntegerField(source='lines.count', read_only=True)

    class Meta:
        model = StockInventory
        fields = '__all__'
        read_only_fields = ['validated_by', 'validated_at']


class StockInventoryDetailSerializer(StockInventorySerializer):
    lines = StockInventoryLineSerializer(many=True, read_only=True)
