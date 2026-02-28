from django.contrib import admin

from .models import (
    StockInventory,
    StockInventoryLine,
    StockLevel,
    StockMove,
    Warehouse,
)


@admin.register(Warehouse)
class WarehouseAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'is_active', 'is_default']
    list_filter = ['is_active', 'is_default']
    search_fields = ['code', 'name']


class StockInventoryLineInline(admin.TabularInline):
    model = StockInventoryLine
    extra = 0


@admin.register(StockMove)
class StockMoveAdmin(admin.ModelAdmin):
    list_display = [
        'date',
        'product',
        'warehouse',
        'move_type',
        'quantity',
        'reference',
    ]
    list_filter = ['move_type', 'warehouse', 'date']
    search_fields = ['product__name', 'reference']
    date_hierarchy = 'date'


@admin.register(StockLevel)
class StockLevelAdmin(admin.ModelAdmin):
    list_display = [
        'product',
        'warehouse',
        'quantity_on_hand',
        'quantity_reserved',
        'quantity_available',
    ]
    list_filter = ['warehouse']
    search_fields = ['product__name', 'product__reference']


@admin.register(StockInventory)
class StockInventoryAdmin(admin.ModelAdmin):
    list_display = ['reference', 'warehouse', 'date', 'state']
    list_filter = ['state', 'warehouse']
    search_fields = ['reference']
    inlines = [StockInventoryLineInline]
