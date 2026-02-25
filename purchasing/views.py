from decimal import Decimal

from django.db.models import Count, Sum
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from users.permissions import HasModulePermission, module_permission_required

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
from .serializers import (
    PurchaseOrderDetailSerializer,
    PurchaseOrderItemSerializer,
    PurchaseOrderSerializer,
    ReceptionDetailSerializer,
    ReceptionItemSerializer,
    ReceptionSerializer,
    SupplierInvoiceDetailSerializer,
    SupplierInvoiceItemSerializer,
    SupplierInvoiceSerializer,
    SupplierPaymentSerializer,
    SupplierSerializer,
)


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.select_related('currency', 'company').all()
    serializer_class = SupplierSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'purchasing'
    search_fields = ['name', 'code', 'email', 'contact_name']
    filterset_fields = ['is_active', 'currency']


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.select_related(
        'supplier', 'currency', 'created_by'
    ).all()
    serializer_class = PurchaseOrderSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'purchasing'
    search_fields = ['number', 'supplier__name']
    filterset_fields = ['state', 'supplier']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PurchaseOrderDetailSerializer
        return PurchaseOrderSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        order = self.get_object()
        if order.state != 'draft':
            return Response(
                {'detail': _('Seuls les brouillons peuvent être confirmés.')},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not order.items.exists():
            return Response(
                {'detail': _('Le bon de commande ne contient aucune ligne.')},
                status=status.HTTP_400_BAD_REQUEST,
            )
        order.calculate_amounts()
        order.state = 'confirmed'
        order.save()
        return Response({'detail': _('Bon de commande confirmé.')})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        order = self.get_object()
        if order.state in ('received', 'invoiced'):
            return Response(
                {
                    'detail': _(
                        "Impossible d'annuler un BC déjà réceptionné ou facturé."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        order.state = 'cancelled'
        order.save(update_fields=['state'])
        return Response({'detail': _('Bon de commande annulé.')})


class PurchaseOrderItemViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrderItem.objects.select_related('product', 'order').all()
    serializer_class = PurchaseOrderItemSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'purchasing'
    filterset_fields = ['order']

    def perform_create(self, serializer):
        instance = serializer.save()
        instance.order.calculate_amounts()
        instance.order.save(update_fields=['subtotal', 'tax_amount', 'total'])

    def perform_update(self, serializer):
        instance = serializer.save()
        instance.order.calculate_amounts()
        instance.order.save(update_fields=['subtotal', 'tax_amount', 'total'])

    def perform_destroy(self, instance):
        order = instance.order
        instance.delete()
        order.calculate_amounts()
        order.save(update_fields=['subtotal', 'tax_amount', 'total'])


class ReceptionViewSet(viewsets.ModelViewSet):
    queryset = Reception.objects.select_related(
        'purchase_order',
        'purchase_order__supplier',
        'warehouse',
        'validated_by',
        'created_by',
    ).all()
    serializer_class = ReceptionSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'purchasing'
    search_fields = ['number']
    filterset_fields = ['state', 'warehouse', 'purchase_order']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ReceptionDetailSerializer
        return ReceptionSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        """Valider une réception → génère StockMove IN pour chaque ligne."""
        reception = self.get_object()

        if reception.state == 'validated':
            return Response(
                {'detail': _('Cette réception est déjà validée.')},
                status=status.HTTP_400_BAD_REQUEST,
            )

        items = reception.items.select_related('product', 'purchase_order_item').all()
        if not items.exists():
            return Response(
                {'detail': _('Aucune ligne de réception.')},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from inventory.models import StockMove

        now = timezone.now()
        moves_created = 0

        for item in items:
            if item.quantity_received <= 0:
                continue

            # Créer le mouvement stock IN
            StockMove.objects.create(
                product=item.product,
                warehouse=reception.warehouse,
                move_type='IN',
                quantity=item.quantity_received,
                unit_cost=item.purchase_order_item.unit_price,
                reference=f'REC-{reception.number}',
                source_document_type='reception',
                source_document_id=reception.pk,
                date=now,
                notes=f'Réception {reception.number} — BC {reception.purchase_order.number}',
                created_by=request.user,
            )
            moves_created += 1

            # Mettre à jour la quantité reçue sur la ligne de BC
            po_item = item.purchase_order_item
            po_item.quantity_received += item.quantity_received
            po_item.save(update_fields=['quantity_received'])

        # Mettre à jour le statut de la réception
        reception.state = 'validated'
        reception.validated_by = request.user
        reception.validated_at = now
        reception.save(update_fields=['state', 'validated_by', 'validated_at'])

        # Vérifier si toutes les lignes du BC sont réceptionnées
        po = reception.purchase_order
        all_received = all(
            item.quantity_received >= item.quantity for item in po.items.all()
        )
        if all_received and po.state == 'confirmed':
            po.state = 'received'
            po.save(update_fields=['state'])

        return Response(
            {
                'detail': _('Réception validée avec succès.'),
                'moves_created': moves_created,
            }
        )


class ReceptionItemViewSet(viewsets.ModelViewSet):
    queryset = ReceptionItem.objects.select_related('product', 'reception').all()
    serializer_class = ReceptionItemSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'purchasing'
    filterset_fields = ['reception']


class SupplierInvoiceViewSet(viewsets.ModelViewSet):
    queryset = SupplierInvoice.objects.select_related(
        'supplier', 'currency', 'purchase_order', 'created_by'
    ).all()
    serializer_class = SupplierInvoiceSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'purchasing'
    search_fields = ['number', 'supplier__name', 'supplier_reference']
    filterset_fields = ['state', 'supplier']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return SupplierInvoiceDetailSerializer
        return SupplierInvoiceSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        """Valider une facture fournisseur → génère l'écriture comptable."""
        invoice = self.get_object()

        if invoice.state != 'draft':
            return Response(
                {'detail': _('Seuls les brouillons peuvent être validés.')},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not invoice.items.exists():
            return Response(
                {'detail': _('La facture ne contient aucune ligne.')},
                status=status.HTTP_400_BAD_REQUEST,
            )

        invoice.calculate_amounts()
        invoice.state = 'validated'
        invoice.save()

        # Mettre à jour le statut du BC si lié
        if invoice.purchase_order and invoice.purchase_order.state == 'received':
            invoice.purchase_order.state = 'invoiced'
            invoice.purchase_order.save(update_fields=['state'])

        return Response({'detail': _('Facture fournisseur validée.')})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        invoice = self.get_object()
        if invoice.state == 'paid':
            return Response(
                {'detail': _("Impossible d'annuler une facture payée.")},
                status=status.HTTP_400_BAD_REQUEST,
            )
        invoice.state = 'cancelled'
        invoice.save(update_fields=['state'])
        return Response({'detail': _('Facture fournisseur annulée.')})


class SupplierInvoiceItemViewSet(viewsets.ModelViewSet):
    queryset = SupplierInvoiceItem.objects.select_related('product', 'invoice').all()
    serializer_class = SupplierInvoiceItemSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'purchasing'
    filterset_fields = ['invoice']

    def perform_create(self, serializer):
        instance = serializer.save()
        instance.invoice.calculate_amounts()
        instance.invoice.save(
            update_fields=['subtotal', 'tax_amount', 'total', 'amount_due']
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        instance.invoice.calculate_amounts()
        instance.invoice.save(
            update_fields=['subtotal', 'tax_amount', 'total', 'amount_due']
        )

    def perform_destroy(self, instance):
        invoice = instance.invoice
        instance.delete()
        invoice.calculate_amounts()
        invoice.save(update_fields=['subtotal', 'tax_amount', 'total', 'amount_due'])


class SupplierPaymentViewSet(viewsets.ModelViewSet):
    queryset = SupplierPayment.objects.select_related(
        'invoice', 'invoice__supplier', 'created_by'
    ).all()
    serializer_class = SupplierPaymentSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    module_name = 'purchasing'
    search_fields = ['invoice__number', 'reference']
    filterset_fields = ['invoice', 'method']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
@module_permission_required('purchasing')
def dashboard_view(request):
    """KPIs du module achats."""
    # Fournisseurs actifs
    suppliers_count = Supplier.objects.filter(is_active=True).count()

    # BC par état
    po_stats = PurchaseOrder.objects.values('state').annotate(count=Count('id'))
    po_by_state = {item['state']: item['count'] for item in po_stats}

    # Total achats (factures validées + payées)
    total_purchases = SupplierInvoice.objects.filter(
        state__in=['validated', 'paid']
    ).aggregate(total=Sum('total'))['total'] or Decimal('0')

    # Dettes fournisseurs (montant dû)
    total_due = SupplierInvoice.objects.filter(state='validated').aggregate(
        total=Sum('amount_due')
    )['total'] or Decimal('0')

    # Réceptions en attente
    pending_receptions = Reception.objects.filter(state='draft').count()

    # Factures en attente de paiement
    unpaid_invoices = SupplierInvoice.objects.filter(state='validated').count()

    # BC en attente de réception
    pending_orders = PurchaseOrder.objects.filter(state='confirmed').count()

    return Response(
        {
            'suppliers_count': suppliers_count,
            'po_draft': po_by_state.get('draft', 0),
            'po_confirmed': po_by_state.get('confirmed', 0),
            'po_received': po_by_state.get('received', 0),
            'total_purchases': str(total_purchases),
            'total_due': str(total_due),
            'pending_receptions': pending_receptions,
            'unpaid_invoices': unpaid_invoices,
            'pending_orders': pending_orders,
        }
    )
