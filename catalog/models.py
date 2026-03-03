from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models import Currency


class ProductCategory(models.Model):
    """Catégories de produits (arborescence simple via FK parent)."""

    name = models.CharField(_('Nom'), max_length=200)
    code = models.CharField(_('Code'), max_length=20, unique=True)
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='children',
        verbose_name=_('Catégorie parente'),
    )
    accounting_account = models.ForeignKey(
        'accounting.Account',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name=_('Compte comptable de stock'),
        help_text=_('Compte comptable de stock associé (classe 3)'),
    )

    class Meta:
        verbose_name = _('Catégorie de produit')
        verbose_name_plural = _('Catégories de produits')
        ordering = ['code']

    def __str__(self):
        return f'{self.code} - {self.name}'


class Product(models.Model):
    """Produits et services vendus par l'entreprise."""

    name = models.CharField(_('Nom'), max_length=200)
    reference = models.CharField(_('Référence'), max_length=30, unique=True)
    description = models.TextField(_('Description'), blank=True)
    unit_price = models.DecimalField(
        _('Prix unitaire'), max_digits=15, decimal_places=2
    )
    currency = models.ForeignKey(
        Currency, on_delete=models.PROTECT, verbose_name=_('Devise')
    )
    tax_rate = models.DecimalField(
        _('Taux de TVA (%)'), max_digits=5, decimal_places=2, default=0
    )
    is_active = models.BooleanField(_('Actif'), default=True)

    # ── Champs Stock ─────────────────────────────────────────────────
    product_type = models.CharField(
        _('Type de produit'),
        max_length=20,
        choices=[
            ('stockable', _('Stockable')),
            ('service', _('Service')),
            ('consumable', _('Consommable')),
        ],
        default='stockable',
    )
    category = models.ForeignKey(
        ProductCategory,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name=_('Catégorie'),
    )
    unit_of_measure = models.CharField(
        _('Unité de mesure'), max_length=20, default='unité'
    )
    stock_alert_threshold = models.DecimalField(
        _('Seuil alerte stock'),
        max_digits=15,
        decimal_places=3,
        default=0,
        help_text=_('Seuil minimum déclenchant une alerte de réapprovisionnement'),
    )
    weight = models.DecimalField(
        _('Poids (kg)'), max_digits=10, decimal_places=3, null=True, blank=True
    )
    barcode = models.CharField(
        _('Code-barres'), max_length=50, blank=True, null=True, unique=True
    )

    class Meta:
        verbose_name = _('Produit')
        verbose_name_plural = _('Produits')
        constraints = [
            models.CheckConstraint(
                check=models.Q(tax_rate__gte=0) & models.Q(tax_rate__lte=100),
                name='sales_product_tax_rate_range',
            ),
        ]

    def __str__(self):
        return f'{self.reference} - {self.name}'

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
