from decimal import Decimal

from django.db.models import F, Sum
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from users.permissions import HasModulePermission, module_permission_required

from .models import (
    ProductCategory,
    StockInventory,
    StockInventoryLine,
    StockLevel,
    StockMove,
    Warehouse,
)
from .serializers import (
    ProductCategorySerializer,
    StockInventoryDetailSerializer,
    StockInventoryLineSerializer,
    StockInventorySerializer,
    StockLevelSerializer,
    StockMoveSerializer,
    WarehouseSerializer,
)


class WarehouseViewSet(viewsets.ModelViewSet):
    """CRUD entrepôts."""

    queryset = Warehouse.objects.all()
    serializer_class = WarehouseSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'inventory'
    search_fields = ['name', 'code']
    filterset_fields = ['is_active', 'is_default']


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


class StockMoveViewSet(viewsets.ModelViewSet):
    """CRUD mouvements de stock."""

    queryset = StockMove.objects.select_related(
        'product', 'warehouse', 'created_by'
    ).all()
    serializer_class = StockMoveSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'inventory'
    search_fields = ['product__name', 'product__reference', 'reference']
    filterset_fields = ['move_type', 'warehouse', 'product']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class StockLevelViewSet(viewsets.ReadOnlyModelViewSet):
    """Consultation des niveaux de stock (lecture seule)."""

    queryset = StockLevel.objects.select_related('product', 'warehouse').all()
    serializer_class = StockLevelSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'inventory'
    search_fields = ['product__name', 'product__reference']
    filterset_fields = ['warehouse', 'product']

    @action(detail=False, methods=['get'])
    def alerts(self, request):
        """Produits dont le stock disponible est sous le seuil d'alerte."""
        levels = self.get_queryset().filter(
            product__stock_alert_threshold__gt=0,
            quantity_available__lt=F('product__stock_alert_threshold'),
            product__product_type='stockable',
        )
        serializer = self.get_serializer(levels, many=True)
        return Response(serializer.data)


class StockInventoryViewSet(viewsets.ModelViewSet):
    """CRUD inventaires physiques."""

    queryset = StockInventory.objects.select_related('warehouse', 'validated_by').all()
    serializer_class = StockInventorySerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'inventory'
    search_fields = ['reference']
    filterset_fields = ['state', 'warehouse']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return StockInventoryDetailSerializer
        return StockInventorySerializer

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        """Valider un inventaire : génère les StockMove d'ajustement."""
        inventory = self.get_object()

        if inventory.state == 'validated':
            return Response(
                {'detail': _('Cet inventaire est déjà validé.')},
                status=status.HTTP_400_BAD_REQUEST,
            )

        lines = inventory.lines.select_related('product').all()
        if not lines.exists():
            return Response(
                {'detail': _("Aucune ligne d'inventaire à valider.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()
        moves_created = 0

        for line in lines:
            diff = line.physical_qty - line.theoretical_qty
            if diff != 0:
                StockMove.objects.create(
                    product=line.product,
                    warehouse=inventory.warehouse,
                    move_type='ADJUST',
                    quantity=abs(diff),
                    reference=f'INV-{inventory.reference}',
                    source_document_type='inventory',
                    source_document_id=inventory.pk,
                    date=now,
                    notes=_('Ajustement inventaire %(ref)s : %(diff)s')
                    % {'ref': inventory.reference, 'diff': diff},
                    created_by=request.user,
                )
                moves_created += 1

        inventory.state = 'validated'
        inventory.validated_by = request.user
        inventory.validated_at = now
        inventory.save()

        return Response(
            {
                'detail': _('Inventaire validé avec succès.'),
                'moves_created': moves_created,
            }
        )


class StockInventoryLineViewSet(viewsets.ModelViewSet):
    """CRUD lignes d'inventaire."""

    queryset = StockInventoryLine.objects.select_related('product', 'inventory').all()
    serializer_class = StockInventoryLineSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'inventory'
    filterset_fields = ['inventory']


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
@module_permission_required('inventory')
def dashboard_view(request):
    """KPIs du module stock."""
    from sales.models import Product

    # Nombre de produits stockables
    total_products = Product.objects.filter(
        product_type='stockable', is_active=True
    ).count()

    # Valeur totale du stock
    stock_value = (
        StockLevel.objects.filter(product__product_type='stockable').aggregate(
            total_value=Sum(
                F('quantity_on_hand') * F('product__unit_price'),
            )
        )['total_value']
    ) or Decimal('0')

    # Nombre de produits sous seuil d'alerte
    alerts_count = StockLevel.objects.filter(
        product__stock_alert_threshold__gt=0,
        quantity_available__lt=F('product__stock_alert_threshold'),
        product__product_type='stockable',
    ).count()

    # Nombre d'entrepôts actifs
    warehouses_count = Warehouse.objects.filter(is_active=True).count()

    # Mouvements récents (30 derniers jours)
    thirty_days_ago = timezone.now() - timezone.timedelta(days=30)
    recent_moves = StockMove.objects.filter(date__gte=thirty_days_ago)
    moves_in = (
        recent_moves.filter(move_type__in=['IN', 'RETURN_IN']).aggregate(
            total=Sum('quantity')
        )['total']
        or 0
    )
    moves_out = (
        recent_moves.filter(move_type__in=['OUT', 'RETURN_OUT']).aggregate(
            total=Sum('quantity')
        )['total']
        or 0
    )

    # Inventaires en cours
    pending_inventories = StockInventory.objects.filter(
        state__in=['draft', 'in_progress']
    ).count()

    # Derniers mouvements
    latest_moves = StockMoveSerializer(
        StockMove.objects.select_related('product', 'warehouse', 'created_by')[:10],
        many=True,
    ).data

    return Response(
        {
            'total_products': total_products,
            'stock_value': str(stock_value),
            'alerts_count': alerts_count,
            'warehouses_count': warehouses_count,
            'moves_in_30d': str(moves_in),
            'moves_out_30d': str(moves_out),
            'pending_inventories': pending_inventories,
            'latest_moves': latest_moves,
        }
    )
