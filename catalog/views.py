from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

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

    @action(detail=False, methods=['get'])
    def generate_reference(self, request):
        """Génère la prochaine référence disponible pour un produit."""
        prefix = request.query_params.get('prefix', 'PROD')
        last = (
            Product.objects.filter(reference__startswith=prefix + '-')
            .order_by('-reference')
            .values_list('reference', flat=True)
            .first()
        )
        next_num = 1
        if last:
            try:
                next_num = int(last.replace(prefix + '-', '')) + 1
            except ValueError:
                pass
        reference = f'{prefix}-{next_num:04d}'
        while Product.objects.filter(reference=reference).exists():
            next_num += 1
            reference = f'{prefix}-{next_num:04d}'
        return Response({'reference': reference})


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

    @action(detail=False, methods=['get'])
    def generate_code(self, request):
        """Génère le prochain code disponible pour une catégorie."""
        prefix = request.query_params.get('prefix', 'CAT')
        last = (
            ProductCategory.objects.filter(code__startswith=prefix + '-')
            .order_by('-code')
            .values_list('code', flat=True)
            .first()
        )
        next_num = 1
        if last:
            try:
                next_num = int(last.replace(prefix + '-', '')) + 1
            except ValueError:
                pass
        code = f'{prefix}-{next_num:04d}'
        while ProductCategory.objects.filter(code=code).exists():
            next_num += 1
            code = f'{prefix}-{next_num:04d}'
        return Response({'code': code})
