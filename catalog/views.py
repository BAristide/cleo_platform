from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, viewsets

from users.permissions import HasModulePermission

from .models import Product, ProductCategory
from .serializers import ProductCategorySerializer, ProductSerializer


class ProductViewSet(viewsets.ModelViewSet):
    """API pour les produits."""

    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'sales'
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ['is_active', 'currency']
    search_fields = ['name', 'reference', 'description']
    ordering_fields = ['name', 'reference', 'unit_price', 'tax_rate']
    ordering = ['reference']


class ProductCategoryViewSet(viewsets.ModelViewSet):
    """CRUD catégories de produits."""

    queryset = ProductCategory.objects.select_related(
        'parent', 'accounting_account'
    ).all()
    serializer_class = ProductCategorySerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'inventory'
    search_fields = ['name', 'code']
    filterset_fields = ['parent']
