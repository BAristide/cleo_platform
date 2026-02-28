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
