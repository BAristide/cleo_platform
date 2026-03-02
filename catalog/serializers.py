from rest_framework import serializers

from .models import Product, ProductCategory


class ProductCategorySerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(
        source='parent.name', read_only=True, default=None
    )

    class Meta:
        model = ProductCategory
        fields = '__all__'


class ProductSerializer(serializers.ModelSerializer):
    """Serializer pour les produits."""

    currency_display = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()

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
            'currency_code',
            'tax_rate',
            'is_active',
            'product_type',
            'category',
            'category_name',
            'unit_of_measure',
            'stock_alert_threshold',
            'weight',
            'barcode',
        ]

    currency_code = serializers.SerializerMethodField()

    def get_currency_display(self, obj):
        return obj.currency.code if obj.currency else None

    def get_currency_code(self, obj):
        return obj.currency.code if obj.currency else None

    def get_category_name(self, obj):
        return str(obj.category) if obj.category else None
