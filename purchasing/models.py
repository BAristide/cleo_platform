from decimal import Decimal

from django.db import models
from django.db.models import Sum
from django.utils.translation import gettext_lazy as _


class Supplier(models.Model):
    """Fournisseur — peut être lié à une Company CRM existante."""

    company = models.ForeignKey(
        'crm.Company',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='supplier_profile',
        verbose_name=_('Entreprise CRM'),
        help_text=_('Lien optionnel vers le CRM'),
    )
    name = models.CharField(_('Nom'), max_length=200)
    code = models.CharField(_('Code'), max_length=20, unique=True)
    contact_name = models.CharField(_('Nom du contact'), max_length=200, blank=True)
    email = models.EmailField(_('Email'), blank=True)
    phone = models.CharField(_('Téléphone'), max_length=50, blank=True)
    address = models.TextField(_('Adresse'), blank=True)
    tax_id = models.CharField(
        _('Identifiant fiscal'),
        max_length=50,
        blank=True,
        help_text=_('ICE, IF, RC…'),
    )
    currency = models.ForeignKey(
        'core.Currency',
        on_delete=models.PROTECT,
        verbose_name=_('Devise'),
    )
    payment_terms = models.IntegerField(_('Délai de paiement (jours)'), default=30)
    is_active = models.BooleanField(_('Actif'), default=True)
    notes = models.TextField(_('Notes'), blank=True)
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Modifié le'), auto_now=True)

    class Meta:
        verbose_name = _('Fournisseur')
        verbose_name_plural = _('Fournisseurs')
        ordering = ['name']

    def __str__(self):
        return f'{self.code} - {self.name}'


class PurchaseOrder(models.Model):
    """Bon de commande fournisseur."""

    STATES = [
        ('draft', _('Brouillon')),
        ('confirmed', _('Confirmé')),
        ('received', _('Réceptionné')),
        ('invoiced', _('Facturé')),
        ('cancelled', _('Annulé')),
    ]

    number = models.CharField(_('Numéro'), max_length=50, unique=True)
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        related_name='purchase_orders',
        verbose_name=_('Fournisseur'),
    )
    date = models.DateField(_('Date de commande'))
    expected_delivery_date = models.DateField(
        _('Date de livraison prévue'), null=True, blank=True
    )
    state = models.CharField(_('État'), max_length=20, choices=STATES, default='draft')
    currency = models.ForeignKey(
        'core.Currency',
        on_delete=models.PROTECT,
        verbose_name=_('Devise'),
    )
    subtotal = models.DecimalField(
        _('Sous-total HT'), max_digits=15, decimal_places=2, default=0
    )
    tax_amount = models.DecimalField(
        _('Montant TVA'), max_digits=15, decimal_places=2, default=0
    )
    total = models.DecimalField(
        _('Total TTC'), max_digits=15, decimal_places=2, default=0
    )
    notes = models.TextField(_('Notes'), blank=True)
    created_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        verbose_name=_('Créé par'),
    )
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Modifié le'), auto_now=True)

    class Meta:
        verbose_name = _('Bon de commande fournisseur')
        verbose_name_plural = _('Bons de commande fournisseur')
        ordering = ['-date', '-number']

    def __str__(self):
        return f'{self.number} - {self.supplier.name}'

    def calculate_amounts(self):
        """Recalcule les montants à partir des lignes."""
        items = self.items.all()
        self.subtotal = sum(item.subtotal for item in items)
        self.tax_amount = sum(item.tax_amount for item in items)
        self.total = self.subtotal + self.tax_amount

    def save(self, *args, **kwargs):
        # Auto-numérotation
        if not self.number:
            last = PurchaseOrder.objects.order_by('-id').first()
            next_num = (last.id + 1) if last else 1
            self.number = f'BC-{next_num:05d}'
        super().save(*args, **kwargs)


class PurchaseOrderItem(models.Model):
    """Ligne de bon de commande fournisseur."""

    order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name=_('Bon de commande'),
    )
    product = models.ForeignKey(
        'sales.Product',
        on_delete=models.PROTECT,
        verbose_name=_('Produit'),
    )
    description = models.CharField(_('Description'), max_length=300, blank=True)
    quantity = models.DecimalField(_('Quantité'), max_digits=15, decimal_places=3)
    unit_price = models.DecimalField(
        _('Prix unitaire HT'), max_digits=15, decimal_places=2
    )
    tax_rate = models.DecimalField(
        _('Taux TVA (%)'), max_digits=5, decimal_places=2, default=20
    )
    quantity_received = models.DecimalField(
        _('Quantité reçue'), max_digits=15, decimal_places=3, default=0
    )

    class Meta:
        verbose_name = _('Ligne de commande fournisseur')
        verbose_name_plural = _('Lignes de commande fournisseur')

    def __str__(self):
        return f'{self.product.name} × {self.quantity}'

    @property
    def subtotal(self):
        return self.quantity * self.unit_price

    @property
    def tax_amount(self):
        return self.subtotal * self.tax_rate / 100

    @property
    def total(self):
        return self.subtotal + self.tax_amount

    @property
    def quantity_remaining(self):
        return self.quantity - self.quantity_received


class Reception(models.Model):
    """Réception de marchandises (bon de livraison fournisseur)."""

    STATES = [
        ('draft', _('Brouillon')),
        ('validated', _('Validé')),
        ('cancelled', _('Annulé')),
    ]

    number = models.CharField(_('Numéro'), max_length=50, unique=True)
    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.PROTECT,
        related_name='receptions',
        verbose_name=_('Bon de commande'),
    )
    date = models.DateField(_('Date de réception'))
    state = models.CharField(_('État'), max_length=20, choices=STATES, default='draft')
    warehouse = models.ForeignKey(
        'inventory.Warehouse',
        on_delete=models.PROTECT,
        verbose_name=_('Entrepôt'),
    )
    notes = models.TextField(_('Notes'), blank=True)
    validated_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='validated_receptions',
        verbose_name=_('Validé par'),
    )
    validated_at = models.DateTimeField(_('Validé le'), null=True, blank=True)
    created_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_receptions',
        verbose_name=_('Créé par'),
    )
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)

    class Meta:
        verbose_name = _('Réception')
        verbose_name_plural = _('Réceptions')
        ordering = ['-date']

    def __str__(self):
        return f'{self.number} - {self.purchase_order.supplier.name}'

    def save(self, *args, **kwargs):
        if not self.number:
            last = Reception.objects.order_by('-id').first()
            next_num = (last.id + 1) if last else 1
            self.number = f'REC-{next_num:05d}'
        super().save(*args, **kwargs)


class ReceptionItem(models.Model):
    """Ligne de réception."""

    reception = models.ForeignKey(
        Reception,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name=_('Réception'),
    )
    purchase_order_item = models.ForeignKey(
        PurchaseOrderItem,
        on_delete=models.PROTECT,
        related_name='reception_items',
        verbose_name=_('Ligne de commande'),
    )
    product = models.ForeignKey(
        'sales.Product',
        on_delete=models.PROTECT,
        verbose_name=_('Produit'),
    )
    quantity_received = models.DecimalField(
        _('Quantité reçue'), max_digits=15, decimal_places=3
    )

    class Meta:
        verbose_name = _('Ligne de réception')
        verbose_name_plural = _('Lignes de réception')

    def __str__(self):
        return f'{self.product.name} × {self.quantity_received}'


class SupplierInvoice(models.Model):
    """Facture fournisseur."""

    STATES = [
        ('draft', _('Brouillon')),
        ('validated', _('Validée')),
        ('paid', _('Payée')),
        ('cancelled', _('Annulée')),
    ]

    number = models.CharField(_('Numéro'), max_length=50, unique=True)
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        related_name='invoices',
        verbose_name=_('Fournisseur'),
    )
    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='supplier_invoices',
        verbose_name=_('Bon de commande'),
    )
    supplier_reference = models.CharField(
        _('Référence fournisseur'),
        max_length=100,
        blank=True,
        help_text=_('Numéro de facture du fournisseur'),
    )
    date = models.DateField(_('Date de facture'))
    due_date = models.DateField(_("Date d'échéance"), null=True, blank=True)
    state = models.CharField(_('État'), max_length=20, choices=STATES, default='draft')
    currency = models.ForeignKey(
        'core.Currency',
        on_delete=models.PROTECT,
        verbose_name=_('Devise'),
    )
    subtotal = models.DecimalField(
        _('Sous-total HT'), max_digits=15, decimal_places=2, default=0
    )
    tax_amount = models.DecimalField(
        _('Montant TVA'), max_digits=15, decimal_places=2, default=0
    )
    total = models.DecimalField(
        _('Total TTC'), max_digits=15, decimal_places=2, default=0
    )
    amount_paid = models.DecimalField(
        _('Montant payé'), max_digits=15, decimal_places=2, default=0
    )
    amount_due = models.DecimalField(
        _('Montant dû'), max_digits=15, decimal_places=2, default=0
    )
    journal_entry = models.ForeignKey(
        'accounting.JournalEntry',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='supplier_invoices',
        verbose_name=_('Écriture comptable'),
    )
    notes = models.TextField(_('Notes'), blank=True)
    created_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        verbose_name=_('Créé par'),
    )
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Modifié le'), auto_now=True)

    class Meta:
        verbose_name = _('Facture fournisseur')
        verbose_name_plural = _('Factures fournisseur')
        ordering = ['-date', '-number']

    def __str__(self):
        return f'{self.number} - {self.supplier.name}'

    def calculate_amounts(self):
        items = self.items.all()
        self.subtotal = sum(item.subtotal for item in items)
        self.tax_amount = sum(item.tax_amount for item in items)
        self.total = self.subtotal + self.tax_amount
        self.amount_due = self.total - self.amount_paid

    def save(self, *args, **kwargs):
        if not self.number:
            last = SupplierInvoice.objects.order_by('-id').first()
            next_num = (last.id + 1) if last else 1
            self.number = f'FF-{next_num:05d}'
        if not self.due_date and self.date and self.supplier:
            from datetime import timedelta

            self.due_date = self.date + timedelta(days=self.supplier.payment_terms)
        super().save(*args, **kwargs)


class SupplierInvoiceItem(models.Model):
    """Ligne de facture fournisseur."""

    invoice = models.ForeignKey(
        SupplierInvoice,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name=_('Facture fournisseur'),
    )
    product = models.ForeignKey(
        'sales.Product',
        on_delete=models.PROTECT,
        verbose_name=_('Produit'),
    )
    description = models.CharField(_('Description'), max_length=300, blank=True)
    quantity = models.DecimalField(_('Quantité'), max_digits=15, decimal_places=3)
    unit_price = models.DecimalField(
        _('Prix unitaire HT'), max_digits=15, decimal_places=2
    )
    tax_rate = models.DecimalField(
        _('Taux TVA (%)'), max_digits=5, decimal_places=2, default=20
    )

    class Meta:
        verbose_name = _('Ligne de facture fournisseur')
        verbose_name_plural = _('Lignes de facture fournisseur')

    def __str__(self):
        return f'{self.product.name} × {self.quantity}'

    @property
    def subtotal(self):
        return self.quantity * self.unit_price

    @property
    def tax_amount(self):
        return self.subtotal * self.tax_rate / 100

    @property
    def total(self):
        return self.subtotal + self.tax_amount


class SupplierPayment(models.Model):
    """Paiement fournisseur."""

    METHODS = [
        ('bank_transfer', _('Virement bancaire')),
        ('check', _('Chèque')),
        ('cash', _('Espèces')),
        ('lcn', _('LCN')),
        ('other', _('Autre')),
    ]

    invoice = models.ForeignKey(
        SupplierInvoice,
        on_delete=models.PROTECT,
        related_name='payments',
        verbose_name=_('Facture fournisseur'),
    )
    date = models.DateField(_('Date de paiement'))
    amount = models.DecimalField(_('Montant'), max_digits=15, decimal_places=2)
    method = models.CharField(
        _('Mode de paiement'), max_length=20, choices=METHODS, default='bank_transfer'
    )
    reference = models.CharField(_('Référence'), max_length=100, blank=True)
    notes = models.TextField(_('Notes'), blank=True)
    created_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        verbose_name=_('Créé par'),
    )
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)

    class Meta:
        verbose_name = _('Paiement fournisseur')
        verbose_name_plural = _('Paiements fournisseur')
        ordering = ['-date']

    def __str__(self):
        return f'{self.invoice.number} - {self.amount} ({self.date})'

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Mettre à jour le montant payé de la facture
        invoice = self.invoice
        total_paid = invoice.payments.aggregate(total=Sum('amount'))[
            'total'
        ] or Decimal('0')
        invoice.amount_paid = total_paid
        invoice.amount_due = invoice.total - total_paid
        if invoice.amount_due <= 0:
            invoice.state = 'paid'
        invoice.save(update_fields=['amount_paid', 'amount_due', 'state'])
