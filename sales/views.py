import os
from decimal import Decimal

from django.conf import settings
from django.db.models import Count, Sum
from django.http import FileResponse
from django.utils import timezone
from django_filters import rest_framework as django_filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    BankAccount,
    Invoice,
    InvoiceItem,
    Order,
    OrderItem,
    Payment,
    Product,
    Quote,
    QuoteItem,
)
from .serializers import (
    BankAccountSerializer,
    InvoiceDetailSerializer,
    InvoiceItemSerializer,
    InvoiceSerializer,
    OrderDetailSerializer,
    OrderItemSerializer,
    OrderSerializer,
    PaymentSerializer,
    ProductSerializer,
    QuoteDetailSerializer,
    QuoteItemSerializer,
    QuoteSerializer,
)


# Filtres personnalisés
class InvoiceFilter(django_filters.FilterSet):
    """Filtre personnalisé pour les factures."""

    type = django_filters.CharFilter(field_name='type')
    payment_status = django_filters.CharFilter(field_name='payment_status')

    class Meta:
        model = Invoice
        fields = [
            'type',
            'payment_status',
            'currency',
            'company',
            'contact',
            'quote',
            'order',
            'parent_invoice',
        ]


class OrderFilter(django_filters.FilterSet):
    """Filtre personnalisé pour les commandes."""

    status = django_filters.CharFilter(field_name='status')

    class Meta:
        model = Order
        fields = [
            'status',
            'currency',
            'company',
            'contact',
            'quote',
            'converted_to_invoice',
            'has_deposit_invoice',
            'has_final_invoice',
        ]


class QuoteFilter(django_filters.FilterSet):
    """Filtre personnalisé pour les devis."""

    status = django_filters.CharFilter(field_name='status')

    class Meta:
        model = Quote
        fields = [
            'status',
            'currency',
            'company',
            'contact',
            'converted_to_order',
            'converted_to_invoice',
        ]


class BankAccountViewSet(viewsets.ModelViewSet):
    """API pour les comptes bancaires."""

    queryset = BankAccount.objects.all()
    serializer_class = BankAccountSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'bank_name', 'rib', 'iban']
    ordering_fields = ['name', 'bank_name', 'currency']
    ordering = ['currency', '-is_default', 'name']

    @action(detail=False, methods=['get'])
    def by_currency(self, request):
        """Récupérer les comptes bancaires par devise."""
        currency_id = request.query_params.get('currency_id')

        if currency_id:
            accounts = BankAccount.objects.filter(currency_id=currency_id)
        else:
            accounts = BankAccount.objects.all()

        serializer = self.get_serializer(accounts, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def default(self, request):
        """Récupérer le compte bancaire par défaut pour une devise."""
        currency_id = request.query_params.get('currency_id')

        if not currency_id:
            return Response(
                {'error': 'Currency ID is required'}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            account = BankAccount.objects.filter(
                currency_id=currency_id, is_default=True
            ).first()
            if account:
                serializer = self.get_serializer(account)
                return Response(serializer.data)
            else:
                return Response(
                    {'error': 'No default account found for this currency'},
                    status=status.HTTP_404_NOT_FOUND,
                )
        except Exception as e:
            return Response(
                {'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ProductViewSet(viewsets.ModelViewSet):
    """API pour les produits."""

    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ['is_active', 'currency']
    search_fields = ['name', 'reference', 'description']
    ordering_fields = ['name', 'reference', 'unit_price', 'tax_rate']
    ordering = ['reference']


class QuoteViewSet(viewsets.ModelViewSet):
    """API pour les devis."""

    queryset = Quote.objects.all()
    serializer_class = QuoteSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = QuoteFilter
    search_fields = [
        'number',
        'company__name',
        'contact__first_name',
        'contact__last_name',
    ]
    ordering_fields = ['number', 'date', 'expiration_date', 'total']
    ordering = ['-date', 'number']

    def get_serializer_class(self):
        if self.action in ['retrieve', 'create', 'update', 'partial_update']:
            return QuoteDetailSerializer
        return QuoteSerializer

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=['post'])
    def generate_pdf(self, request, pk=None):
        """Générer un PDF pour un devis."""
        quote = self.get_object()

        try:
            pdf_path = quote.generate_pdf()
            if os.path.exists(pdf_path):
                return Response(
                    {
                        'success': True,
                        'message': 'PDF generated successfully',
                        'path': pdf_path,
                    }
                )
            else:
                return Response(
                    {'error': 'PDF could not be generated'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        except Exception as e:
            return Response(
                {'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        """Télécharger le PDF d'un devis."""
        quote = self.get_object()

        if not quote.pdf_file:
            pdf_path = quote.generate_pdf()
        else:
            pdf_path = os.path.join(settings.MEDIA_ROOT, quote.pdf_file)

            # Si le fichier n'existe pas, le régénérer
            if not os.path.exists(pdf_path):
                pdf_path = quote.generate_pdf()

        if os.path.exists(pdf_path):
            response = FileResponse(
                open(pdf_path, 'rb'), content_type='application/pdf'
            )
            response['Content-Disposition'] = (
                f'attachment; filename="Devis_{quote.number}.pdf"'
            )
            return response
        else:
            return Response(
                {'error': 'PDF not found'}, status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def send_by_email(self, request, pk=None):
        """Envoyer un devis par email."""
        quote = self.get_object()

        recipient_email = request.data.get('recipient_email')
        _subject = request.data.get('subject')
        _message = request.data.get('message')

        if not recipient_email:
            return Response(
                {'error': 'Recipient email is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            email_sent = quote.send_by_email(recipient_email)
            if email_sent:
                return Response({'success': True, 'message': 'Email sent successfully'})
            else:
                return Response(
                    {'error': 'Failed to send email'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        except Exception as e:
            return Response(
                {'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Marquer un devis comme accepté."""
        quote = self.get_object()

        if quote.status in ['expired', 'rejected', 'cancelled']:
            return Response(
                {
                    'error': 'Cannot accept a quote that is expired, rejected, or cancelled'
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        quote.status = 'accepted'
        quote.save(update_fields=['status'])

        return Response({'success': True, 'message': 'Quote marked as accepted'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Marquer un devis comme rejeté."""
        quote = self.get_object()

        if quote.status in ['accepted', 'expired', 'cancelled']:
            return Response(
                {
                    'error': 'Cannot reject a quote that is accepted, expired, or cancelled'
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        quote.status = 'rejected'
        quote.save(update_fields=['status'])

        return Response({'success': True, 'message': 'Quote marked as rejected'})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Annuler un devis."""
        quote = self.get_object()

        if quote.status in ['expired', 'rejected']:
            return Response(
                {'error': 'Cannot cancel a quote that is already expired or rejected'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if quote.converted_to_order or quote.converted_to_invoice:
            return Response(
                {
                    'error': 'Cannot cancel a quote that has been converted to order or invoice'
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        quote.status = 'cancelled'
        quote.save(update_fields=['status'])

        return Response({'success': True, 'message': 'Quote cancelled successfully'})

    @action(detail=True, methods=['post'])
    def convert_to_order(self, request, pk=None):
        """Convertir un devis en bon de commande."""
        quote = self.get_object()

        if quote.status != 'accepted':
            return Response(
                {'error': 'Only accepted quotes can be converted to orders'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if quote.converted_to_order:
            return Response(
                {'error': 'This quote has already been converted to an order'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Utilisation de la méthode convert_to_order du modèle
            order = quote.convert_to_order()

            # Retourner la commande créée
            serializer = OrderSerializer(order)
            return Response(
                {
                    'success': True,
                    'message': 'Quote converted to order successfully',
                    'order': serializer.data,
                }
            )

        except Exception as e:
            return Response(
                {'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def convert_to_invoice(self, request, pk=None):
        """Convertir un devis en facture."""
        quote = self.get_object()

        if quote.status != 'accepted':
            return Response(
                {'error': 'Only accepted quotes can be converted to invoices'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if quote.converted_to_invoice:
            return Response(
                {'error': 'This quote has already been converted to an invoice'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Utilisation de la méthode convert_to_invoice du modèle
            invoice = quote.convert_to_invoice()

            # Retourner la facture créée
            serializer = InvoiceSerializer(invoice)
            return Response(
                {
                    'success': True,
                    'message': 'Quote converted to invoice successfully',
                    'invoice': serializer.data,
                }
            )

        except Exception as e:
            return Response(
                {'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class QuoteItemViewSet(viewsets.ModelViewSet):
    """API pour les lignes de devis."""

    queryset = QuoteItem.objects.all()
    serializer_class = QuoteItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['quote']

    def perform_create(self, serializer):
        instance = serializer.save()
        instance.quote.calculate_amounts()
        instance.quote.save(update_fields=['subtotal', 'tax_amount', 'total'])

    def perform_update(self, serializer):
        instance = serializer.save()
        instance.quote.calculate_amounts()
        instance.quote.save(update_fields=['subtotal', 'tax_amount', 'total'])

    def perform_destroy(self, instance):
        quote = instance.quote
        instance.delete()
        quote.calculate_amounts()
        quote.save(update_fields=['subtotal', 'tax_amount', 'total'])


class OrderViewSet(viewsets.ModelViewSet):
    """API pour les bons de commande."""

    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = OrderFilter
    search_fields = [
        'number',
        'company__name',
        'contact__first_name',
        'contact__last_name',
    ]
    ordering_fields = ['number', 'date', 'delivery_date', 'total']
    ordering = ['-date', 'number']

    def get_serializer_class(self):
        if self.action in ['retrieve', 'create', 'update', 'partial_update']:
            return OrderDetailSerializer
        return OrderSerializer

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=['post'])
    def generate_pdf(self, request, pk=None):
        """Générer un PDF pour un bon de commande."""
        order = self.get_object()

        try:
            pdf_path = order.generate_pdf()
            if os.path.exists(pdf_path):
                return Response(
                    {
                        'success': True,
                        'message': 'PDF generated successfully',
                        'path': pdf_path,
                    }
                )
            else:
                return Response(
                    {'error': 'PDF could not be generated'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        except Exception as e:
            return Response(
                {'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        """Télécharger le PDF d'un bon de commande."""
        order = self.get_object()

        if not order.pdf_file:
            pdf_path = order.generate_pdf()
        else:
            pdf_path = os.path.join(settings.MEDIA_ROOT, order.pdf_file)

            # Si le fichier n'existe pas, le régénérer
            if not os.path.exists(pdf_path):
                pdf_path = order.generate_pdf()

        if os.path.exists(pdf_path):
            response = FileResponse(
                open(pdf_path, 'rb'), content_type='application/pdf'
            )
            response['Content-Disposition'] = (
                f'attachment; filename="Bon_de_commande_{order.number}.pdf"'
            )
            return response
        else:
            return Response(
                {'error': 'PDF not found'}, status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def send_by_email(self, request, pk=None):
        """Envoyer un bon de commande par email."""
        order = self.get_object()

        recipient_email = request.data.get('recipient_email')
        _subject = request.data.get('subject')
        _message = request.data.get('message')

        if not recipient_email:
            return Response(
                {'error': 'Recipient email is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            email_sent = order.send_by_email(recipient_email)
            if email_sent:
                return Response({'success': True, 'message': 'Email sent successfully'})
            else:
                return Response(
                    {'error': 'Failed to send email'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        except Exception as e:
            return Response(
                {'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """Confirmer un bon de commande."""
        order = self.get_object()

        if order.status != 'draft':
            return Response(
                {'error': 'Only draft orders can be confirmed'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.status = 'confirmed'
        order.save(update_fields=['status'])

        return Response({'success': True, 'message': 'Order confirmed successfully'})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Annuler un bon de commande."""
        order = self.get_object()

        if order.status in ['delivered', 'cancelled']:
            return Response(
                {
                    'error': 'Cannot cancel an order that is already delivered or cancelled'
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if order.converted_to_invoice:
            return Response(
                {'error': 'Cannot cancel an order that has been converted to invoice'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.status = 'cancelled'
        order.save(update_fields=['status'])

        return Response({'success': True, 'message': 'Order cancelled successfully'})

    @action(detail=True, methods=['post'])
    def convert_to_invoice(self, request, pk=None):
        """Convertir un bon de commande en facture."""
        order = self.get_object()

        if order.status != 'confirmed':
            return Response(
                {'error': 'Only confirmed orders can be converted to invoices'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if order.converted_to_invoice:
            return Response(
                {'error': 'This order has already been converted to an invoice'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Vérifier s'il existe déjà des factures d'acompte pour cette commande
            deposit_invoices = Invoice.objects.filter(order=order, type='deposit')
            deposit_total = deposit_invoices.aggregate(Sum('total'))[
                'total__sum'
            ] or Decimal('0')

            # Calculer le montant restant à facturer
            remaining_amount = order.total - deposit_total

            # Si tout a déjà été facturé, retourner une erreur
            if remaining_amount <= 0:
                return Response(
                    {
                        'error': 'The total amount of the order has already been invoiced via deposit invoices'
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Calculer les proportions pour le sous-total et la TVA
            proportion = remaining_amount / order.total if order.total > 0 else 0

            # Créer une nouvelle facture finale (standard)
            invoice = Invoice.objects.create(
                type='standard',
                company=order.company,
                contact=order.contact,
                opportunity=order.opportunity,
                date=timezone.now().date(),
                currency=order.currency,
                exchange_rate=order.exchange_rate,
                payment_terms=order.payment_terms,
                bank_account=order.bank_account,
                discount_percentage=order.discount_percentage,
                is_tax_exempt=order.is_tax_exempt,
                tax_exemption_reason=order.tax_exemption_reason,
                subtotal=order.subtotal * proportion,
                tax_amount=order.tax_amount * proportion,
                total=remaining_amount,
                amount_paid=0,
                amount_due=remaining_amount,
                notes=f'Facture finale pour la commande {order.number}. Acompte(s) déduit(s): {deposit_total} {order.currency.code}',
                terms=order.terms,
                order=order,
                quote=order.quote,
            )

            # Copier les lignes de produits avec des quantités ajustées
            order_items = order.get_items()

            # Pour chaque ligne, créer une ligne de facture avec quantité ajustée selon la proportion
            for order_item in order_items:
                InvoiceItem.objects.create(
                    invoice=invoice,
                    product=order_item.product,
                    description=order_item.description,
                    quantity=order_item.quantity,  # Garder la quantité identique pour référence
                    unit_price=order_item.unit_price
                    * proportion,  # Ajuster le prix unitaire selon proportion restante
                    tax_rate=order_item.tax_rate,
                )

            # Marquer l'ordre comme ayant une facture finale
            order.has_final_invoice = True
            order.converted_to_invoice = True
            order.save(update_fields=['has_final_invoice', 'converted_to_invoice'])

            # Retourner la facture créée
            serializer = InvoiceSerializer(invoice)
            return Response(
                {
                    'success': True,
                    'message': 'Order converted to invoice successfully',
                    'invoice': serializer.data,
                }
            )

        except Exception as e:
            return Response(
                {'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def create_deposit_invoice(self, request, pk=None):
        """Créer une facture d'acompte pour une commande."""
        order = self.get_object()

        # Vérifier si la commande est dans un état permettant la création d'une facture d'acompte
        if not order.can_create_deposit_invoice():
            return Response(
                {
                    'error': 'This order cannot have a deposit invoice (invalid status or amount already invoiced)'
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Récupérer le pourcentage d'acompte (30% par défaut)
            deposit_percentage = Decimal(request.data.get('deposit_percentage', 30))

            # Créer la facture d'acompte
            deposit_invoice = Invoice.create_deposit_invoice(order, deposit_percentage)

            serializer = InvoiceSerializer(deposit_invoice)
            return Response(
                {
                    'success': True,
                    'message': f'Deposit invoice created successfully with {deposit_percentage}% of the order value',
                    'invoice': serializer.data,
                }
            )
        except Exception as e:
            return Response(
                {'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class OrderItemViewSet(viewsets.ModelViewSet):
    """API pour les lignes de bon de commande."""

    queryset = OrderItem.objects.all()
    serializer_class = OrderItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
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


class InvoiceViewSet(viewsets.ModelViewSet):
    """API pour les factures."""

    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = InvoiceFilter
    search_fields = [
        'number',
        'company__name',
        'contact__first_name',
        'contact__last_name',
    ]
    ordering_fields = ['number', 'date', 'due_date', 'total', 'amount_paid']
    ordering = ['-date', 'number']

    def get_serializer_class(self):
        if self.action in ['retrieve', 'create', 'update', 'partial_update']:
            return InvoiceDetailSerializer
        return InvoiceSerializer

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=['post'])
    def generate_pdf(self, request, pk=None):
        """Générer un PDF pour une facture."""
        invoice = self.get_object()

        try:
            pdf_path = invoice.generate_pdf()
            if os.path.exists(pdf_path):
                return Response(
                    {
                        'success': True,
                        'message': 'PDF generated successfully',
                        'path': pdf_path,
                    }
                )
            else:
                return Response(
                    {'error': 'PDF could not be generated'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        except Exception as e:
            return Response(
                {'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        """Télécharger le PDF d'une facture."""
        invoice = self.get_object()

        if not invoice.pdf_file:
            pdf_path = invoice.generate_pdf()
        else:
            pdf_path = os.path.join(settings.MEDIA_ROOT, invoice.pdf_file)

            # Si le fichier n'existe pas, le régénérer
            if not os.path.exists(pdf_path):
                pdf_path = invoice.generate_pdf()

        if os.path.exists(pdf_path):
            response = FileResponse(
                open(pdf_path, 'rb'), content_type='application/pdf'
            )
            response['Content-Disposition'] = (
                f'attachment; filename="Facture_{invoice.number}.pdf"'
            )
            return response
        else:
            return Response(
                {'error': 'PDF not found'}, status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def send_by_email(self, request, pk=None):
        """Envoyer une facture par email."""
        invoice = self.get_object()

        recipient_email = request.data.get('recipient_email')
        _subject = request.data.get('subject')
        _message = request.data.get('message')

        if not recipient_email:
            return Response(
                {'error': 'Recipient email is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            email_sent = invoice.send_by_email(recipient_email)
            if email_sent:
                return Response({'success': True, 'message': 'Email sent successfully'})
            else:
                return Response(
                    {'error': 'Failed to send email'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        except Exception as e:
            return Response(
                {'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def mark_as_paid(self, request, pk=None):
        """Marquer une facture comme payée."""
        invoice = self.get_object()

        if invoice.payment_status == 'paid':
            return Response(
                {'error': 'Invoice is already paid'}, status=status.HTTP_400_BAD_REQUEST
            )

        # Créer un paiement pour le montant total restant
        amount_to_pay = invoice.total - invoice.amount_paid
        if amount_to_pay > 0:
            payment_method = request.data.get('payment_method', 'bank_transfer')
            reference = request.data.get('reference', 'Paiement manuel')
            notes = request.data.get('notes', "Marqué comme payé via l'API")
            payment_date = request.data.get(
                'payment_date', timezone.now().date().isoformat()
            )

            try:
                # Créer le paiement
                payment = Payment.objects.create(
                    invoice=invoice,
                    date=payment_date,
                    amount=amount_to_pay,
                    method=payment_method,
                    reference=reference,
                    notes=notes,
                )

                # Mettre à jour le montant payé et le statut
                invoice.amount_paid = invoice.total
                invoice.amount_due = 0
                invoice.payment_status = 'paid'
                invoice.save(
                    update_fields=['amount_paid', 'amount_due', 'payment_status']
                )

                # Retourner le paiement créé
                serializer = PaymentSerializer(payment)
                return Response(
                    {
                        'success': True,
                        'message': 'Invoice marked as paid',
                        'payment': serializer.data,
                    }
                )

            except Exception as e:
                return Response(
                    {'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        else:
            return Response(
                {'error': 'Invoice amount is zero or negative'},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=['post'])
    def create_credit_note(self, request, pk=None):
        """Créer un avoir pour une facture."""
        invoice = self.get_object()

        # Vérifier que ce n'est pas déjà un avoir
        if invoice.type == 'credit_note':
            return Response(
                {'error': 'Cannot create a credit note for another credit note'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Déterminer le montant de l'avoir (total par défaut ou montant spécifié)
            if 'amount' in request.data:
                credit_amount = Decimal(request.data.get('amount'))
                if credit_amount <= 0 or credit_amount > invoice.total:
                    return Response(
                        {
                            'error': 'Credit amount must be positive and not exceed the invoice total'
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                proportion = credit_amount / invoice.total
            else:
                credit_amount = invoice.total
                proportion = Decimal('1.0')

            reason = request.data.get('reason', "Avoir créé via l'API")

            # Créer l'avoir
            credit_note = Invoice.objects.create(
                type='credit_note',
                company=invoice.company,
                contact=invoice.contact,
                opportunity=invoice.opportunity,
                date=timezone.now().date(),
                currency=invoice.currency,
                exchange_rate=invoice.exchange_rate,
                payment_terms=invoice.payment_terms,
                bank_account=invoice.bank_account,
                subtotal=-abs(invoice.subtotal * proportion),
                tax_amount=-abs(invoice.tax_amount * proportion),
                total=-abs(credit_amount),
                amount_paid=0,
                amount_due=-abs(credit_amount),
                notes=f'Avoir pour la facture {invoice.number}',
                terms=invoice.terms,
                parent_invoice=invoice,
                order=invoice.order,
                quote=invoice.quote,
                credit_note_reason=reason,
                is_tax_exempt=invoice.is_tax_exempt,
                tax_exemption_reason=invoice.tax_exemption_reason,
            )

            # Copier les lignes de produits avec des montants ajustés
            for item in invoice.get_items():
                InvoiceItem.objects.create(
                    invoice=credit_note,
                    product=item.product,
                    description=f'Avoir: {item.description}',
                    quantity=item.quantity * proportion,
                    unit_price=-abs(
                        item.unit_price
                    ),  # Montants négatifs pour les avoirs
                    tax_rate=item.tax_rate,
                )

            # Si l'avoir est total et que la facture est marquée comme payée,
            # mettre à jour le statut de paiement de la facture d'origine
            if proportion >= Decimal('0.99') and invoice.payment_status == 'paid':
                invoice.amount_paid = Decimal('0')
                invoice.amount_due = invoice.total
                invoice.payment_status = 'cancelled'
                invoice.save(
                    update_fields=['amount_paid', 'amount_due', 'payment_status']
                )

            serializer = InvoiceSerializer(credit_note)
            return Response(
                {
                    'success': True,
                    'message': 'Credit note created successfully',
                    'credit_note': serializer.data,
                }
            )
        except Exception as e:
            return Response(
                {'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Annuler une facture."""
        invoice = self.get_object()

        if invoice.payment_status == 'paid':
            return Response(
                {'error': 'Cannot cancel a paid invoice'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        invoice.status = 'cancelled'
        invoice.payment_status = 'cancelled'
        invoice.save(update_fields=['status', 'payment_status'])

        return Response({'success': True, 'message': 'Invoice cancelled successfully'})


class InvoiceItemViewSet(viewsets.ModelViewSet):
    """API pour les lignes de facture."""

    queryset = InvoiceItem.objects.all()
    serializer_class = InvoiceItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
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


class PaymentViewSet(viewsets.ModelViewSet):
    """API pour les paiements."""

    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ['invoice', 'method', 'date']
    search_fields = ['invoice__number', 'reference', 'notes']
    ordering_fields = ['date', 'amount']
    ordering = ['-date']

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Récupérer des statistiques sur les paiements."""
        # Somme totale des paiements
        total_payments = Payment.objects.aggregate(total=Sum('amount'))['total'] or 0

        # Paiements par méthode
        payments_by_method = Payment.objects.values('method').annotate(
            count=Count('id'), total=Sum('amount')
        )

        # Paiements par mois (pour les 12 derniers mois)
        twelve_months_ago = timezone.now().date() - timezone.timedelta(days=365)
        payments_by_month = (
            Payment.objects.filter(date__gte=twelve_months_ago)
            .extra(select={'month': "to_char(date, 'YYYY-MM')"})
            .values('month')
            .annotate(count=Count('id'), total=Sum('amount'))
            .order_by('month')
        )

        return Response(
            {
                'total_payments': total_payments,
                'payments_by_method': payments_by_method,
                'payments_by_month': payments_by_month,
            }
        )
