from django.db import models
from django.utils.translation import gettext_lazy as _


class Currency(models.Model):
    """Modèle de devise centralisé pour tous les modules de l'ERP."""

    code = models.CharField(_('Code'), max_length=3, unique=True)
    name = models.CharField(_('Nom'), max_length=50)
    symbol = models.CharField(_('Symbole'), max_length=5, blank=True)
    is_default = models.BooleanField(_('Par défaut'), default=False)

    # Taux de change par rapport à la devise de base (habituellement 1.0 pour la devise par défaut)
    exchange_rate = models.DecimalField(
        _('Taux de change'), max_digits=10, decimal_places=6, default=1.0
    )

    # Paramètres de formatage
    decimal_places = models.PositiveSmallIntegerField(_('Décimales'), default=2)
    decimal_separator = models.CharField(
        _('Séparateur décimal'), max_length=1, default='.'
    )
    thousand_separator = models.CharField(
        _('Séparateur de milliers'), max_length=1, default=',', blank=True
    )

    # Indique si le symbole est placé avant ou après le montant
    symbol_position = models.CharField(
        _('Position du symbole'),
        max_length=10,
        choices=[
            ('before', _('Avant')),
            ('after', _('Après')),
        ],
        default='before',
    )

    # Données d'audit
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Modifié le'), auto_now=True)

    class Meta:
        verbose_name = _('Devise')
        verbose_name_plural = _('Devises')
        ordering = ['-is_default', 'code']

    def __str__(self):
        return f'{self.code} - {self.name}'

    def save(self, *args, **kwargs):
        if self.is_default:
            Currency.objects.filter(is_default=True).exclude(pk=self.pk).update(
                is_default=False
            )
        elif (
            not self.is_default
            and not Currency.objects.exclude(pk=self.pk)
            .filter(is_default=True)
            .exists()
        ):
            self.is_default = True

        super().save(*args, **kwargs)

    def format_amount(self, amount):
        """Formater un montant selon les paramètres de la devise."""
        amount = round(amount, self.decimal_places)
        amount_str = f'{amount:.{self.decimal_places}f}'

        if self.decimal_separator != '.':
            amount_str = amount_str.replace('.', self.decimal_separator)

        if self.thousand_separator:
            integer_part, decimal_part = amount_str.split(self.decimal_separator)
            integer_part = ''
            for i, char in enumerate(reversed(integer_part)):
                if i > 0 and i % 3 == 0:
                    integer_part = self.thousand_separator + integer_part
                integer_part = char + integer_part
            amount_str = integer_part + self.decimal_separator + decimal_part

        if self.symbol_position == 'before':
            return f'{self.symbol}{amount_str}'
        else:
            return f'{amount_str} {self.symbol}'


class Company(models.Model):
    """Informations sur l'entreprise utilisatrice de l'ERP."""

    name = models.CharField(_('Nom'), max_length=100)
    legal_name = models.CharField(_('Raison sociale'), max_length=100, blank=True)
    tax_id = models.CharField(_('Identifiant fiscal'), max_length=50, blank=True)
    registration_number = models.CharField(
        _("Numéro d'immatriculation"), max_length=50, blank=True
    )

    website = models.URLField(_('Site web'), blank=True)
    email = models.EmailField(_('Email'), blank=True)
    phone = models.CharField(_('Téléphone'), max_length=20, blank=True)

    street = models.CharField(_('Adresse'), max_length=100, blank=True)
    street2 = models.CharField(_("Complément d'adresse"), max_length=100, blank=True)
    city = models.CharField(_('Ville'), max_length=50, blank=True)
    zip_code = models.CharField(_('Code postal'), max_length=20, blank=True)
    state = models.CharField(_('État/Province'), max_length=50, blank=True)
    country = models.CharField(_('Pays'), max_length=50, blank=True)

    currency = models.ForeignKey(
        Currency,
        on_delete=models.PROTECT,
        related_name='companies',
        verbose_name=_('Devise'),
    )
    fiscal_year_start = models.DateField(
        _("Début de l'année fiscale"), null=True, blank=True
    )

    logo = models.ImageField(
        _('Logo'), upload_to='company/logos/', null=True, blank=True
    )

    is_active = models.BooleanField(_('Actif'), default=True)
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Modifié le'), auto_now=True)

    class Meta:
        verbose_name = _('Entreprise')
        verbose_name_plural = _('Entreprises')

    def __str__(self):
        return self.name


class CoreSettings(models.Model):
    """Paramètres globaux de l'ERP."""

    company = models.OneToOneField(
        Company, on_delete=models.CASCADE, related_name='settings'
    )

    language = models.CharField(_('Langue'), max_length=10, default='fr')
    timezone = models.CharField(
        _('Fuseau horaire'), max_length=50, default='Africa/Casablanca'
    )
    date_format = models.CharField(_('Format de date'), max_length=20, default='d/m/Y')
    time_format = models.CharField(_("Format d'heure"), max_length=20, default='H:i')

    default_payment_term = models.PositiveIntegerField(
        _('Délai de paiement par défaut (jours)'), default=30
    )
    invoice_prefix = models.CharField(
        _('Préfixe des factures'), max_length=10, default='FACT-'
    )
    quote_prefix = models.CharField(
        _('Préfixe des devis'), max_length=10, default='DEV-'
    )
    order_prefix = models.CharField(
        _('Préfixe des commandes'), max_length=10, default='CMD-'
    )

    decimal_precision = models.PositiveSmallIntegerField(
        _('Précision décimale'), default=2
    )

    auto_archive_documents = models.BooleanField(
        _('Archiver automatiquement les documents'), default=False
    )
    archive_after_days = models.PositiveIntegerField(
        _('Archiver après (jours)'), default=365
    )

    class Meta:
        verbose_name = _('Paramètres')
        verbose_name_plural = _('Paramètres')

    def __str__(self):
        return f'Paramètres de {self.company.name}'


# ── Localization Packs — Configuration initiale ─────────────────────


class CompanySetup(models.Model):
    """Configuration initiale — créée au premier setup via wizard ou mode headless."""

    # ── Identité ─────────────────────────────────────────────────────
    company_name = models.CharField(_("Nom de l'entreprise"), max_length=200)
    country_code = models.CharField(
        _('Code pays'),
        max_length=5,
        help_text=_('Code ISO du pays (MA, CI, SN, FR...)'),
    )
    locale_pack = models.CharField(
        _('Pack de localisation'),
        max_length=10,
        choices=[
            ('MA', _('Maroc')),
            ('OHADA', _('OHADA — Afrique francophone')),
            ('FR', _('France')),
        ],
    )

    # ── Adresse ──────────────────────────────────────────────────────
    address_line1 = models.CharField(_('Adresse ligne 1'), max_length=200, blank=True)
    address_line2 = models.CharField(_('Adresse ligne 2'), max_length=200, blank=True)
    city = models.CharField(_('Ville'), max_length=100, blank=True)
    postal_code = models.CharField(_('Code postal'), max_length=20, blank=True)
    country = models.CharField(_('Pays'), max_length=100, blank=True)

    # ── Contact ──────────────────────────────────────────────────────
    phone = models.CharField(_('Téléphone'), max_length=50, blank=True)
    email = models.EmailField(_('Email'), blank=True)
    website = models.URLField(_('Site web'), blank=True)

    # ── Identifiants légaux (dynamiques selon le pays) ───────────────
    legal_id_1_label = models.CharField(
        _('Label identifiant 1'), max_length=50, blank=True
    )
    legal_id_1_value = models.CharField(
        _('Valeur identifiant 1'), max_length=100, blank=True
    )
    legal_id_2_label = models.CharField(
        _('Label identifiant 2'), max_length=50, blank=True
    )
    legal_id_2_value = models.CharField(
        _('Valeur identifiant 2'), max_length=100, blank=True
    )
    legal_id_3_label = models.CharField(
        _('Label identifiant 3'), max_length=50, blank=True
    )
    legal_id_3_value = models.CharField(
        _('Valeur identifiant 3'), max_length=100, blank=True
    )
    legal_id_4_label = models.CharField(
        _('Label identifiant 4'), max_length=50, blank=True
    )
    legal_id_4_value = models.CharField(
        _('Valeur identifiant 4'), max_length=100, blank=True
    )

    # ── Logo ─────────────────────────────────────────────────────────
    logo = models.ImageField(_('Logo'), upload_to='company/', blank=True, null=True)

    # ── Coordonnées bancaires ────────────────────────────────────────
    bank_name = models.CharField(_('Banque'), max_length=100, blank=True)
    bank_account = models.CharField(_('Compte bancaire'), max_length=50, blank=True)
    bank_swift = models.CharField(_('Code SWIFT/BIC'), max_length=20, blank=True)

    # ── État du setup ────────────────────────────────────────────────
    setup_completed = models.BooleanField(_('Setup terminé'), default=False)
    setup_date = models.DateTimeField(_('Date du setup'), null=True, blank=True)
    is_locked = models.BooleanField(
        _('Verrouillé'),
        default=False,
        help_text=_('Verrouillé après la première écriture comptable.'),
    )

    # ── Audit ────────────────────────────────────────────────────────
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Modifié le'), auto_now=True)

    class Meta:
        verbose_name = _('Configuration entreprise')
        verbose_name_plural = _('Configurations entreprise')

    def __str__(self):
        return f'{self.company_name} ({self.locale_pack})'

    def get_legal_ids(self):
        """Retourne la liste des identifiants légaux non vides."""
        ids = []
        for i in range(1, 5):
            label = getattr(self, f'legal_id_{i}_label', '')
            value = getattr(self, f'legal_id_{i}_value', '')
            if label and value:
                ids.append({'label': label, 'value': value})
        return ids
