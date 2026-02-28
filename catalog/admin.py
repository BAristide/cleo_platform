from django.contrib import admin

from .models import Product, ProductCategory


@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'parent']
    list_filter = ['parent']
    search_fields = ['code', 'name']


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
