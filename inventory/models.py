from django.db import models
from django.db.models import F
from django.utils.translation import gettext_lazy as _


class Warehouse(models.Model):
    """Entrepôts / Lieux de stockage."""

    name = models.CharField(_('Nom'), max_length=200)
    code = models.CharField(_('Code'), max_length=20, unique=True)
    address = models.TextField(_('Adresse'), blank=True)
    is_active = models.BooleanField(_('Actif'), default=True)
    is_default = models.BooleanField(_('Par défaut'), default=False)

    class Meta:
        verbose_name = _('Entrepôt')
        verbose_name_plural = _('Entrepôts')
        ordering = ['-is_default', 'name']

    def __str__(self):
        return f'{self.code} - {self.name}'

    def save(self, *args, **kwargs):
        # Un seul entrepôt par défaut
        if self.is_default:
            Warehouse.objects.filter(is_default=True).exclude(pk=self.pk).update(
                is_default=False
            )
        super().save(*args, **kwargs)


# ── ProductCategory migré vers catalog.models (IC-005) ───────────────
from catalog.models import ProductCategory  # noqa: E402, F401 — rétrocompatibilité


class StockMove(models.Model):
    """Mouvement de stock unitaire (entrée, sortie, transfert)."""

    MOVE_TYPES = [
        ('IN', _('Entrée')),
        ('OUT', _('Sortie')),
        ('TRANSFER', _('Transfert')),
        ('ADJUST', _('Ajustement inventaire')),
        ('RETURN_IN', _('Retour client')),
        ('RETURN_OUT', _('Retour fournisseur')),
    ]

    product = models.ForeignKey(
        'catalog.Product',
        on_delete=models.CASCADE,
        related_name='stock_moves',
        verbose_name=_('Produit'),
    )
    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.CASCADE,
        related_name='stock_moves',
        verbose_name=_('Entrepôt'),
    )
    move_type = models.CharField(
        _('Type de mouvement'), max_length=20, choices=MOVE_TYPES
    )
    quantity = models.DecimalField(_('Quantité'), max_digits=15, decimal_places=3)
    unit_cost = models.DecimalField(
        _('Coût unitaire'), max_digits=15, decimal_places=2, null=True, blank=True
    )
    reference = models.CharField(
        _('Référence'),
        max_length=100,
        blank=True,
        help_text=_('N° BC, BL, facture...'),
    )
    source_document_type = models.CharField(
        _('Type document source'),
        max_length=50,
        blank=True,
        help_text=_('order, invoice, purchase...'),
    )
    source_document_id = models.IntegerField(
        _('ID document source'), null=True, blank=True
    )
    date = models.DateTimeField(_('Date du mouvement'))
    notes = models.TextField(_('Notes'), blank=True)
    created_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_('Créé par'),
    )
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)

    class Meta:
        verbose_name = _('Mouvement de stock')
        verbose_name_plural = _('Mouvements de stock')
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f'{self.get_move_type_display()} — {self.product} × {self.quantity}'


class StockLevel(models.Model):
    """Niveau de stock par produit × entrepôt (table dénormalisée pour performance)."""

    product = models.ForeignKey(
        'catalog.Product',
        on_delete=models.CASCADE,
        related_name='stock_levels',
        verbose_name=_('Produit'),
    )
    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.CASCADE,
        related_name='stock_levels',
        verbose_name=_('Entrepôt'),
    )
    quantity_on_hand = models.DecimalField(
        _('Quantité en stock'), max_digits=15, decimal_places=3, default=0
    )
    quantity_reserved = models.DecimalField(
        _('Quantité réservée'), max_digits=15, decimal_places=3, default=0
    )
    quantity_available = models.GeneratedField(
        expression=F('quantity_on_hand') - F('quantity_reserved'),
        output_field=models.DecimalField(max_digits=15, decimal_places=3),
        db_persist=True,
    )
    last_updated = models.DateTimeField(_('Dernière mise à jour'), auto_now=True)

    class Meta:
        verbose_name = _('Niveau de stock')
        verbose_name_plural = _('Niveaux de stock')
        unique_together = [['product', 'warehouse']]

    def __str__(self):
        return f'{self.product} @ {self.warehouse} : {self.quantity_on_hand}'


class StockInventory(models.Model):
    """Inventaire physique."""

    STATES = [
        ('draft', _('Brouillon')),
        ('in_progress', _('En cours')),
        ('validated', _('Validé')),
    ]

    reference = models.CharField(_('Référence'), max_length=50, unique=True)
    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.CASCADE,
        related_name='inventories',
        verbose_name=_('Entrepôt'),
    )
    date = models.DateField(_('Date'))
    state = models.CharField(_('État'), max_length=20, choices=STATES, default='draft')
    notes = models.TextField(_('Notes'), blank=True)
    validated_by = models.ForeignKey(
        'auth.User',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='validated_inventories',
        verbose_name=_('Validé par'),
    )
    validated_at = models.DateTimeField(_('Validé le'), null=True, blank=True)

    class Meta:
        verbose_name = _('Inventaire')
        verbose_name_plural = _('Inventaires')
        ordering = ['-date']

    def __str__(self):
        return f'{self.reference} — {self.warehouse} ({self.get_state_display()})'


class StockInventoryLine(models.Model):
    """Ligne d'inventaire : comparaison stock théorique vs physique."""

    inventory = models.ForeignKey(
        StockInventory,
        on_delete=models.CASCADE,
        related_name='lines',
        verbose_name=_('Inventaire'),
    )
    product = models.ForeignKey(
        'catalog.Product',
        on_delete=models.CASCADE,
        verbose_name=_('Produit'),
    )
    theoretical_qty = models.DecimalField(
        _('Quantité théorique'), max_digits=15, decimal_places=3
    )
    physical_qty = models.DecimalField(
        _('Quantité physique'), max_digits=15, decimal_places=3
    )
    difference = models.GeneratedField(
        expression=F('physical_qty') - F('theoretical_qty'),
        output_field=models.DecimalField(max_digits=15, decimal_places=3),
        db_persist=True,
    )

    class Meta:
        verbose_name = _("Ligne d'inventaire")
        verbose_name_plural = _("Lignes d'inventaire")

    def __str__(self):
        return (
            f'{self.product} — théo: {self.theoretical_qty}, phys: {self.physical_qty}'
        )
