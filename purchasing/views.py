import mimetypes
from decimal import Decimal

from django.db.models import Count, F, Sum
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from inventory.services.credit_note_stock import process_supplier_credit_note_returns
from users.permissions import HasModulePermission, module_permission_required

from .models import (
    PurchaseOrder,
    PurchaseOrderItem,
    Reception,
    ReceptionItem,
    Supplier,
    SupplierInvoice,
    SupplierInvoiceDocument,
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
    SupplierInvoiceDocumentSerializer,
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
            from django.contrib.contenttypes.models import ContentType

            reception_ct = ContentType.objects.get_for_model(Reception)
            StockMove.objects.create(
                product=item.product,
                warehouse=reception.warehouse,
                move_type='IN',
                quantity=item.quantity_received,
                unit_cost=item.purchase_order_item.unit_price,
                reference=f'REC-{reception.number}',
                content_type=reception_ct,
                object_id=reception.pk,
                date=now,
                notes=f'Reception {reception.number} -- BC {reception.purchase_order.number}',
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

        # Génération de l'écriture comptable
        journal_entry = None
        try:
            from accounting.services.journal_entry_service import JournalEntryService

            journal_entry = JournalEntryService.create_supplier_invoice_entry(
                invoice, user=request.user
            )
            if journal_entry:
                invoice.journal_entry = journal_entry
                invoice.save(update_fields=['journal_entry'])
        except Exception as e:
            import logging

            logging.getLogger(__name__).warning(
                f'Écriture comptable facture fournisseur {invoice.number}: {e}'
            )

        # Mettre à jour le statut du BC si lié
        if invoice.purchase_order and invoice.purchase_order.state == 'received':
            invoice.purchase_order.state = 'invoiced'
            invoice.purchase_order.save(update_fields=['state'])

        return Response(
            {
                'detail': _('Facture fournisseur validée.'),
                'journal_entry_id': journal_entry.id if journal_entry else None,
            }
        )

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

    @action(detail=True, methods=['post'])
    def create_credit_note(self, request, pk=None):
        """
        Créer un avoir pour une facture fournisseur.

        Supporte 2 modes :
        - Mode proportionnel : {amount, reason, return_to_stock}
        - Mode par lignes : {items: [{supplier_invoice_item_id, quantity, return_to_stock}], reason}
        """
        invoice = self.get_object()

        if invoice.type == 'credit_note':
            return Response(
                {'detail': _('Impossible de créer un avoir sur un avoir.')},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if invoice.state not in ('validated', 'paid'):
            return Response(
                {
                    'detail': _(
                        'La facture doit être validée ou payée pour créer un avoir.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            items_data = request.data.get('items', None)
            reason = request.data.get('reason', 'Avoir fournisseur')
            global_return_to_stock = request.data.get('return_to_stock', False)

            if items_data:
                credit_note = self._create_supplier_cn_by_items(
                    invoice, items_data, reason, request.user
                )
            else:
                credit_note = self._create_supplier_cn_proportional(
                    invoice, request.data, reason, global_return_to_stock, request.user
                )

            serializer = self.get_serializer(credit_note)
            return Response(
                {
                    'success': True,
                    'detail': _('Avoir fournisseur créé avec succès.'),
                    'credit_note': serializer.data,
                }
            )
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _create_supplier_cn_proportional(
        self, invoice, data, reason, return_to_stock, user
    ):
        """Avoir fournisseur proportionnel."""
        if 'amount' in data:
            credit_amount = Decimal(str(data.get('amount')))
            if credit_amount <= 0 or credit_amount > abs(invoice.total):
                raise ValueError(
                    'Le montant doit être positif et ne pas dépasser le total de la facture'
                )
            proportion = credit_amount / abs(invoice.total)
        else:
            credit_amount = abs(invoice.total)
            proportion = Decimal('1.0')

        credit_note = SupplierInvoice.objects.create(
            type='credit_note',
            supplier=invoice.supplier,
            purchase_order=invoice.purchase_order,
            date=timezone.now().date(),
            currency=invoice.currency,
            subtotal=-abs(invoice.subtotal * proportion),
            tax_amount=-abs(invoice.tax_amount * proportion),
            total=-abs(credit_amount),
            amount_paid=0,
            amount_due=-abs(credit_amount),
            parent_invoice=invoice,
            credit_note_reason=reason,
            notes=f'Avoir pour la facture fournisseur {invoice.number}',
            created_by=user,
        )

        return_items = []
        for item in invoice.items.all():
            SupplierInvoiceItem.objects.create(
                invoice=credit_note,
                product=item.product,
                description=f'Avoir: {item.description or item.product.name}',
                quantity=item.quantity * proportion,
                unit_price=-abs(item.unit_price),
                tax_rate=item.tax_rate,
            )
            if return_to_stock and item.product:
                return_items.append(
                    {
                        'product': item.product,
                        'quantity': item.quantity * proportion,
                        'unit_cost': abs(item.unit_price),
                        'supplier_invoice_item_id': item.pk,
                    }
                )

        if return_to_stock and return_items:
            process_supplier_credit_note_returns(credit_note, return_items, user=user)

        # Mettre à jour la facture d'origine si avoir total
        if proportion >= Decimal('0.99'):
            invoice.amount_due = Decimal('0')
            invoice.save(update_fields=['amount_due'])

        return credit_note

    def _create_supplier_cn_by_items(self, invoice, items_data, reason, user):
        """Avoir fournisseur par sélection de lignes."""
        invoice_items = {item.pk: item for item in invoice.items.all()}
        validated_items = []

        for item_req in items_data:
            item_id = item_req.get('supplier_invoice_item_id')
            qty = Decimal(str(item_req.get('quantity', 0)))
            rts = item_req.get('return_to_stock', False)

            if item_id not in invoice_items:
                raise ValueError(
                    f'Ligne {item_id} introuvable dans la facture {invoice.number}'
                )

            original_item = invoice_items[item_id]
            if qty <= 0 or qty > original_item.quantity:
                raise ValueError(
                    f'Quantité invalide {qty} pour la ligne {item_id} (max: {original_item.quantity})'
                )

            validated_items.append(
                {
                    'original_item': original_item,
                    'quantity': qty,
                    'return_to_stock': rts,
                }
            )

        if not validated_items:
            raise ValueError('Aucune ligne valide fournie')

        credit_subtotal = Decimal('0')
        credit_tax = Decimal('0')
        for vi in validated_items:
            item = vi['original_item']
            line_subtotal = vi['quantity'] * abs(item.unit_price)
            line_tax = line_subtotal * item.tax_rate / 100
            credit_subtotal += line_subtotal
            credit_tax += line_tax

        credit_total = credit_subtotal + credit_tax

        credit_note = SupplierInvoice.objects.create(
            type='credit_note',
            supplier=invoice.supplier,
            purchase_order=invoice.purchase_order,
            date=timezone.now().date(),
            currency=invoice.currency,
            subtotal=-abs(credit_subtotal),
            tax_amount=-abs(credit_tax),
            total=-abs(credit_total),
            amount_paid=0,
            amount_due=-abs(credit_total),
            parent_invoice=invoice,
            credit_note_reason=reason,
            notes=f'Avoir par lignes pour la facture fournisseur {invoice.number}',
            created_by=user,
        )

        return_items = []
        for vi in validated_items:
            item = vi['original_item']
            SupplierInvoiceItem.objects.create(
                invoice=credit_note,
                product=item.product,
                description=f'Avoir: {item.description or item.product.name}',
                quantity=vi['quantity'],
                unit_price=-abs(item.unit_price),
                tax_rate=item.tax_rate,
            )
            if vi['return_to_stock'] and item.product:
                return_items.append(
                    {
                        'product': item.product,
                        'quantity': vi['quantity'],
                        'unit_cost': abs(item.unit_price),
                        'supplier_invoice_item_id': item.pk,
                    }
                )

        if return_items:
            process_supplier_credit_note_returns(credit_note, return_items, user=user)

        return credit_note

    @action(detail=True, methods=['get'])
    def credit_notes(self, request, pk=None):
        """Lister les avoirs associés à une facture fournisseur."""
        invoice = self.get_object()
        credit_notes = SupplierInvoice.objects.filter(
            parent_invoice=invoice, type='credit_note'
        ).order_by('-date')
        serializer = SupplierInvoiceSerializer(credit_notes, many=True)
        return Response(serializer.data)

    # ── Pièces jointes ───────────────────────────────────────────────

    @action(detail=True, methods=['get', 'post'], url_path='documents')
    def documents(self, request, pk=None):
        """GET: liste des pièces jointes. POST: upload d'un fichier."""
        invoice = self.get_object()

        if request.method == 'GET':
            docs = invoice.documents.all()
            serializer = SupplierInvoiceDocumentSerializer(docs, many=True)
            return Response(serializer.data)

        # POST — upload
        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response(
                {'error': 'Aucun fichier fourni.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validation taille (10 Mo max)
        max_size = 10 * 1024 * 1024
        if uploaded_file.size > max_size:
            return Response(
                {'error': 'Le fichier dépasse la taille maximale de 10 Mo.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validation type MIME
        allowed_types = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/webp',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv',
        ]
        content_type = (
            uploaded_file.content_type
            or mimetypes.guess_type(uploaded_file.name)[0]
            or 'application/octet-stream'
        )
        if content_type not in allowed_types:
            return Response(
                {
                    'error': f'Type de fichier non autorisé : {content_type}. '
                    f'Types acceptés : PDF, JPEG, PNG, WebP, Excel, CSV.'
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        doc = SupplierInvoiceDocument.objects.create(
            invoice=invoice,
            file=uploaded_file,
            filename=uploaded_file.name,
            file_size=uploaded_file.size,
            mime_type=content_type,
            description=request.data.get('description', ''),
            uploaded_by=request.user,
        )
        serializer = SupplierInvoiceDocumentSerializer(doc)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=['get'],
        url_path='documents/(?P<doc_id>[0-9]+)/download',
    )
    def document_download(self, request, pk=None, doc_id=None):
        """Téléchargement d'une pièce jointe."""
        invoice = self.get_object()
        try:
            doc = invoice.documents.get(pk=doc_id)
        except SupplierInvoiceDocument.DoesNotExist:
            return Response(
                {'error': 'Pièce jointe non trouvée.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        from django.http import FileResponse

        response = FileResponse(
            doc.file.open('rb'),
            content_type=doc.mime_type,
        )
        response['Content-Disposition'] = f'attachment; filename="{doc.filename}"'
        return response

    @action(
        detail=True,
        methods=['delete'],
        url_path='documents/(?P<doc_id>[0-9]+)',
    )
    def document_delete(self, request, pk=None, doc_id=None):
        """Suppression d'une pièce jointe."""
        invoice = self.get_object()
        try:
            doc = invoice.documents.get(pk=doc_id)
        except SupplierInvoiceDocument.DoesNotExist:
            return Response(
                {'error': 'Pièce jointe non trouvée.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        doc.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


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
        payment = serializer.save(created_by=self.request.user)
        # Génération de l'écriture comptable
        try:
            from accounting.services.journal_entry_service import JournalEntryService

            JournalEntryService.create_supplier_payment_entry(
                payment, user=self.request.user
            )
        except Exception as e:
            import logging

            logging.getLogger(__name__).warning(
                f'Écriture comptable paiement fournisseur {payment.id}: {e}'
            )


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
    total_purchases = (
        SupplierInvoice.objects.filter(state__in=['validated', 'paid']).aggregate(
            total=Sum(F('total') * F('currency__exchange_rate'))
        )['total']
        or Decimal('0')
    ).quantize(Decimal('0.01'))

    # Dettes fournisseurs (montant dû)
    total_due = (
        SupplierInvoice.objects.filter(state='validated').aggregate(
            total=Sum(F('amount_due') * F('currency__exchange_rate'))
        )['total']
        or Decimal('0')
    ).quantize(Decimal('0.01'))

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
