import os
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import F, Sum
from django.utils.translation import gettext_lazy as _

from core.models import Currency


class SalesDocument(models.Model):
    """
    Classe de base abstraite pour les documents de vente (devis, commandes, factures).
    Contient les champs et méthodes communs à tous les documents.
    """

    number = models.CharField(_('Numéro'), max_length=20, unique=True)
    date = models.DateField(_("Date d'émission"))

    # Champs financiers
    subtotal = models.DecimalField(
        _('Sous-total HT'), max_digits=15, decimal_places=2, default=0
    )
    tax_amount = models.DecimalField(
        _('Montant TVA'), max_digits=15, decimal_places=2, default=0
    )
    total = models.DecimalField(
        _('Total TTC'), max_digits=15, decimal_places=2, default=0
    )

    # Nouveau champ pour la remise
    discount_percentage = models.DecimalField(
        _('Remise (%)'), max_digits=5, decimal_places=2, default=0.00
    )

    # Devise et taux de change
    currency = models.ForeignKey(
        Currency, on_delete=models.CASCADE, verbose_name=_('Devise')
    )
    exchange_rate = models.DecimalField(
        _('Taux de change'), max_digits=10, decimal_places=4, default=1.0000
    )

    # Conditions de paiement
    payment_terms = models.CharField(
        _('Conditions de paiement'),
        max_length=20,
        choices=[
            ('immediate', _('Paiement immédiat')),
            ('30_days', _('30 jours')),
            ('60_days', _('60 jours')),
        ],
        default='30_days',
    )

    # Nouveaux champs pour l'exonération de TVA
    is_tax_exempt = models.BooleanField(_('Exonéré de TVA'), default=False)
    tax_exemption_reason = models.CharField(
        _("Raison d'exonération"), max_length=255, blank=True, null=True
    )

    # Notes et conditions
    notes = models.TextField(_('Notes'), blank=True, null=True)
    terms = models.TextField(_('Conditions'), blank=True, null=True)

    # Métadonnées
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Modifié le'), auto_now=True)

    # Chemins des fichiers PDF
    pdf_file = models.CharField(_('Fichier PDF'), max_length=255, blank=True, null=True)

    # Statut d'envoi par email
    email_sent = models.BooleanField(_('Email envoyé'), default=False)
    email_sent_date = models.DateTimeField(
        _("Date d'envoi de l'email"), blank=True, null=True
    )

    class Meta:
        abstract = True

    def calculate_amounts(self):
        """
        Calcule le sous-total, la remise, la TVA et le total du document à partir des lignes.
        La remise est appliquée sur le sous-total, puis la TVA est calculée sur le montant après remise.
        """
        # Initialisation des montants à zéro
        self.subtotal = Decimal('0.00')
        self.tax_amount = Decimal('0.00')
        self.total = Decimal('0.00')

        # Si le document est déjà sauvegardé et a des lignes
        if self.pk:
            # Récupérer les items associés à ce document
            items = self.get_items()

            if items.exists():
                # Calculer le sous-total HT (avant remise)
                self.subtotal = items.aggregate(
                    total=Sum(F('quantity') * F('unit_price'))
                )['total'] or Decimal('0.00')

                # Calculer le montant de la remise
                discount_amount = Decimal('0.00')
                if self.discount_percentage > 0:
                    discount_amount = (
                        self.subtotal * self.discount_percentage
                    ) / Decimal('100')

                # Montant après remise
                subtotal_after_discount = self.subtotal - discount_amount

                # Calculer la TVA sur le montant après remise (sauf si exonéré)
                if not getattr(self, 'is_tax_exempt', False):
                    for item in items:
                        # Calculer la part de cet item dans le total pour appliquer la remise proportionnellement
                        item_proportion = (
                            (item.quantity * item.unit_price) / self.subtotal
                            if self.subtotal > 0
                            else 0
                        )

                        # Appliquer la remise proportionnellement à cet item
                        item_after_discount = (item.quantity * item.unit_price) - (
                            discount_amount * item_proportion
                        )

                        # Calculer la TVA sur le montant après remise
                        item_tax = item_after_discount * (
                            item.tax_rate / Decimal('100')
                        )
                        self.tax_amount += item_tax

                # Calculer le total TTC (montant après remise + TVA)
                self.total = subtotal_after_discount + self.tax_amount

        return self.subtotal, self.tax_amount, self.total

    # Propriété pour obtenir le montant de la remise
    @property
    def discount_amount(self):
        """Calcule le montant de la remise basé sur le pourcentage."""
        if self.discount_percentage > 0:
            return (self.subtotal * self.discount_percentage) / Decimal('100')
        return Decimal('0.00')

    # Propriété pour obtenir le sous-total après remise
    @property
    def subtotal_after_discount(self):
        """Calcule le sous-total après application de la remise."""
        return self.subtotal - self.discount_amount

    def get_items(self):
        """
        Méthode à implémenter dans les sous-classes pour récupérer les lignes associées.
        """
        raise NotImplementedError('Les sous-classes doivent implémenter get_items()')

    def save(self, *args, **kwargs):
        """
        Surcharge de la méthode save pour vérifier automatiquement si l'exonération
        de TVA doit être appliquée en fonction de la devise.
        """
        # Vérifier si c'est une devise étrangère (différente de MAD)
        # et appliquer automatiquement l'exonération si c'est le cas
        if hasattr(self, 'currency') and self.currency:
            from core.models import Currency

            default_currency = Currency.objects.filter(is_default=True).first()

            # Si la devise du document n'est pas la devise par défaut, exonérer de TVA
            if default_currency and self.currency != default_currency:
                self.is_tax_exempt = True

                # Définir une raison d'exonération par défaut si elle n'est pas déjà définie
                if not self.tax_exemption_reason:
                    self.tax_exemption_reason = (
                        'Exonération de TVA pour facturation en devise étrangère'
                    )

        # Calculer les montants (cette méthode tient maintenant compte de l'exonération)
        if self.pk:
            self.calculate_amounts()
        else:
            # Pour les nouveaux documents, initialiser les montants à zéro
            self.subtotal = Decimal('0.00')
            self.tax_amount = Decimal('0.00')
            self.total = Decimal('0.00')

        super().save(*args, **kwargs)

    def get_template_name(self):
        """
        Retourne le nom du template à utiliser pour générer le PDF.
        À surcharger dans les sous-classes.
        """
        raise NotImplementedError(
            'Les sous-classes doivent implémenter get_template_name()'
        )

    def get_pdf_filename(self):
        """
        Retourne le nom du fichier PDF pour ce document.
        À surcharger dans les sous-classes.
        """
        raise NotImplementedError(
            'Les sous-classes doivent implémenter get_pdf_filename()'
        )

    def get_email_template(self):
        """
        Retourne le nom du template email à utiliser.
        À surcharger dans les sous-classes.
        """
        raise NotImplementedError(
            'Les sous-classes doivent implémenter get_email_template()'
        )

    def get_email_subject(self):
        """
        Retourne le sujet de l'email.
        À surcharger dans les sous-classes.
        """
        raise NotImplementedError(
            'Les sous-classes doivent implémenter get_email_subject()'
        )

    def generate_pdf(self):
        """
        Génère un fichier PDF pour ce document.
        """
        from .services.pdf_generator import PDFGenerator

        # Créer le répertoire de destination s'il n'existe pas
        pdf_dir = os.path.join(settings.MEDIA_ROOT, 'sales', 'pdf')
        os.makedirs(pdf_dir, exist_ok=True)

        # Générer le PDF en fonction du type de document
        document_type = self.__class__.__name__.lower()

        if document_type == 'quote':
            pdf_path = PDFGenerator.generate_quote_pdf(self)
        elif document_type == 'order':
            pdf_path = PDFGenerator.generate_order_pdf(self)
        elif document_type == 'invoice':
            pdf_path = PDFGenerator.generate_invoice_pdf(self)
        else:
            raise ValueError(f'Type de document non pris en charge: {document_type}')

        # Mettre à jour le chemin du fichier PDF
        # Extraire juste le nom du fichier du chemin complet
        pdf_filename = os.path.basename(pdf_path)
        self.pdf_file = os.path.join('sales', 'pdf', pdf_filename)
        self.save(update_fields=['pdf_file'])

        return pdf_path

    def send_by_email(self, recipient_email=None):
        """
        Envoie le document par email.
        Si recipient_email n'est pas fourni, utilise l'email du contact.
        """
        from django.utils import timezone

        from .services.email_service import EmailService

        # Générer le PDF s'il n'existe pas
        if not self.pdf_file or not os.path.exists(
            os.path.join(settings.MEDIA_ROOT, self.pdf_file)
        ):
            pdf_path = self.generate_pdf()
        else:
            pdf_path = os.path.join(settings.MEDIA_ROOT, self.pdf_file)

        # Déterminer l'email du destinataire
        if not recipient_email:
            if hasattr(self, 'contact') and self.contact and self.contact.email:
                recipient_email = self.contact.email
            elif hasattr(self, 'company') and self.company and self.company.email:
                recipient_email = self.company.email
            else:
                raise ValueError('Aucun email de destinataire disponible')

        # Envoyer l'email
        email_service = EmailService()
        email_sent = email_service.send_email(
            template_name=self.get_email_template(),
            context={'document': self},
            subject=self.get_email_subject(),
            recipient_email=recipient_email,
            attachments=[pdf_path],
        )

        # Mettre à jour le statut d'envoi
        if email_sent:
            self.email_sent = True
            self.email_sent_date = timezone.now()
            self.save(update_fields=['email_sent', 'email_sent_date'])

        return email_sent


class BankAccount(models.Model):
    """
    Comptes bancaires de l'entreprise.
    """

    name = models.CharField(_('Nom'), max_length=100)
    bank_name = models.CharField(_('Nom de la banque'), max_length=100)
    rib = models.CharField(_('RIB'), max_length=30)
    iban = models.CharField(_('IBAN'), max_length=34, blank=True, null=True)
    swift = models.CharField(_('Code SWIFT/BIC'), max_length=11, blank=True, null=True)
    currency = models.ForeignKey(
        Currency, on_delete=models.CASCADE, verbose_name=_('Devise')
    )
    is_default = models.BooleanField(_('Compte par défaut'), default=False)

    class Meta:
        verbose_name = _('Compte bancaire')
        verbose_name_plural = _('Comptes bancaires')

    def __str__(self):
        return f'{self.name} - {self.currency.code}'

    def save(self, *args, **kwargs):
        """
        Si ce compte est défini par défaut, désactive le statut par défaut des autres comptes
        ayant la même devise.
        """
        if self.is_default:
            BankAccount.objects.filter(currency=self.currency, is_default=True).exclude(
                pk=self.pk
            ).update(is_default=False)

        super().save(*args, **kwargs)


class Product(models.Model):
    """
    Produits et services vendus par l'entreprise.
    """

    name = models.CharField(_('Nom'), max_length=200)
    reference = models.CharField(_('Référence'), max_length=30, unique=True)
    description = models.TextField(_('Description'), blank=True)
    unit_price = models.DecimalField(
        _('Prix unitaire'), max_digits=15, decimal_places=2
    )
    currency = models.ForeignKey(
        Currency, on_delete=models.CASCADE, verbose_name=_('Devise')
    )
    tax_rate = models.DecimalField(
        _('Taux de TVA (%)'), max_digits=5, decimal_places=2, default=20.00
    )
    is_active = models.BooleanField(_('Actif'), default=True)

    class Meta:
        verbose_name = _('Produit')
        verbose_name_plural = _('Produits')

    def __str__(self):
        return f'{self.reference} - {self.name}'


class Quote(SalesDocument):
    """
    Modèle pour les devis clients.
    """

    company = models.ForeignKey(
        'crm.Company', on_delete=models.CASCADE, verbose_name=_('Entreprise')
    )
    contact = models.ForeignKey(
        'crm.Contact', on_delete=models.CASCADE, verbose_name=_('Contact')
    )
    opportunity = models.ForeignKey(
        'crm.Opportunity',
        on_delete=models.CASCADE,
        verbose_name=_('Opportunité'),
        null=True,
        blank=True,
    )

    status = models.CharField(
        _('Statut'),
        max_length=20,
        choices=[
            ('draft', _('Brouillon')),
            ('sent', _('Envoyé')),
            ('accepted', _('Accepté')),
            ('rejected', _('Refusé')),
            ('expired', _('Expiré')),
            ('cancelled', _('Annulé')),
        ],
        default='draft',
    )

    # Validité du devis (20 jours ouvrés par défaut)
    validity_period = models.PositiveIntegerField(
        _('Période de validité (jours)'), default=20
    )
    expiration_date = models.DateField(_("Date d'expiration"), null=True, blank=True)

    # Conversion en commande/facture
    converted_to_order = models.BooleanField(_('Converti en commande'), default=False)
    converted_to_invoice = models.BooleanField(_('Converti en facture'), default=False)

    # Compte bancaire à utiliser pour ce devis
    bank_account = models.ForeignKey(
        BankAccount,
        on_delete=models.CASCADE,
        verbose_name=_('Compte bancaire'),
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = _('Devis')
        verbose_name_plural = _('Devis')
        ordering = ['-date']

    def __str__(self):
        return f'{self.number} - {self.company.name}'

    def get_items(self):
        """
        Récupère les lignes de devis associées.
        """
        return self.quoteitem_set.all()

    def save(self, *args, **kwargs):
        """
        Surcharge de save pour gérer le numéro de devis automatique et la date d'expiration.
        """
        # Générer un numéro de devis automatique si non défini
        if not self.number:
            last_quote = Quote.objects.order_by('-id').first()
            if last_quote:
                try:
                    # Tente d'extraire le numéro de la partie après le tiret
                    if '-' in last_quote.number:
                        last_number = int(last_quote.number.split('-')[-1])
                        self.number = f'DEV-{last_number + 1:04d}'
                    # Tente de gérer le format sans tiret (comme "DEV01")
                    else:
                        # Supprime tout ce qui n'est pas un chiffre
                        import re

                        numeric_part = re.sub(r'[^0-9]', '', last_quote.number)
                        if numeric_part:
                            last_number = int(numeric_part)
                            self.number = f'DEV-{last_number + 1:04d}'
                        else:
                            # Si pas de numéro trouvé, commencer à 1
                            self.number = 'DEV-0001'
                except (ValueError, IndexError):
                    # En cas d'erreur, utiliser un numéro par défaut
                    self.number = 'DEV-0001'
            else:
                self.number = 'DEV-0001'

        # Calculer la date d'expiration si non définie
        if not self.expiration_date and self.date:
            from datetime import timedelta

            self.expiration_date = self.date + timedelta(days=self.validity_period)

        # Sélectionner un compte bancaire par défaut si non défini
        if not self.bank_account and self.currency:
            # Chercher un compte par défaut avec la même devise
            default_account = BankAccount.objects.filter(
                currency=self.currency, is_default=True
            ).first()

            # Si aucun compte par défaut, prendre le premier avec la même devise
            if not default_account:
                default_account = BankAccount.objects.filter(
                    currency=self.currency
                ).first()

            if default_account:
                self.bank_account = default_account

        # Appel à la méthode save du parent pour calculer les montants
        super().save(*args, **kwargs)

    def get_template_name(self):
        """
        Retourne le nom du template à utiliser pour générer le PDF.
        """
        return 'sales/quote_pdf.html'

    def get_pdf_filename(self):
        """
        Retourne le nom du fichier PDF pour ce devis.
        """
        return f'devis_{self.number.replace("-", "_").lower()}.pdf'

    def get_email_template(self):
        """
        Retourne le nom du template email à utiliser.
        """
        return 'sales/emails/quote_email.html'

    def get_email_subject(self):
        """
        Retourne le sujet de l'email.
        """
        return f'Devis {self.number} - ECINTELLIGENCE'

    def generate_pdf(self):
        """
        Génère un fichier PDF pour ce devis.
        """
        import os

        from django.conf import settings

        from .services.pdf_generator import PDFGenerator

        # Créer le répertoire de destination s'il n'existe pas
        pdf_dir = os.path.join(settings.MEDIA_ROOT, 'sales', 'pdf')
        os.makedirs(pdf_dir, exist_ok=True)
        # Générer le PDF
        pdf_path = PDFGenerator.generate_quote_pdf(self)
        # Mettre à jour le chemin du fichier PDF
        # Extraire juste le nom du fichier du chemin complet
        pdf_filename = os.path.basename(pdf_path)
        self.pdf_file = os.path.join('sales', 'pdf', pdf_filename)
        self.save(update_fields=['pdf_file'])
        return pdf_path

    def send_by_email(self, recipient_email=None):
        """
        Envoie le devis par email.
        Si recipient_email n'est pas fourni, utilise l'email du contact.
        """
        import os

        from django.conf import settings
        from django.utils import timezone

        from .services.email_service import EmailService

        # Générer le PDF s'il n'existe pas
        if not self.pdf_file:
            _pdf_path = self.generate_pdf()
        else:
            _pdf_path = os.path.join(settings.MEDIA_ROOT, self.pdf_file)

        # Déterminer l'email du destinataire
        if not recipient_email:
            if hasattr(self, 'contact') and self.contact and self.contact.email:
                recipient_email = self.contact.email
            elif hasattr(self, 'company') and self.company and self.company.email:
                recipient_email = self.company.email
            else:
                raise ValueError('Aucun email de destinataire disponible')

        # Envoyer l'email en utilisant la méthode statique
        email_sent = EmailService.send_quote_email(
            self, recipient_email, f'Devis {self.number} - ECINTELLIGENCE'
        )

        # Mettre à jour le statut d'envoi
        if email_sent:
            self.email_sent = True
            self.email_sent_date = timezone.now()
            self.save(update_fields=['email_sent', 'email_sent_date'])

            # Si le devis est en brouillon, le marquer comme envoyé
            if self.status == 'draft':
                self.status = 'sent'
                self.save(update_fields=['status'])

        return email_sent

    def convert_to_order(self):
        """
        Convertit ce devis en commande.

        Returns:
            Order: La nouvelle commande créée

        Raises:
            ValueError: Si le devis n'est pas dans un état permettant la conversion
        """
        import logging

        from django.utils import timezone

        # Configurer le logger pour déboguer
        logger = logging.getLogger(__name__)
        logger.info(f'Début de la conversion du devis {self.number} en commande')

        # Vérification du statut
        if self.status != 'accepted':
            error_msg = f'Seuls les devis acceptés peuvent être convertis en commandes (statut actuel: {self.status})'
            logger.error(error_msg)
            raise ValueError(error_msg)

        # Vérification si déjà converti
        if self.converted_to_order:
            error_msg = 'Ce devis a déjà été converti en commande'
            logger.error(error_msg)
            raise ValueError(error_msg)

        logger.info(f"Création d'une nouvelle commande à partir du devis {self.number}")

        # Créer la commande
        from .models import Order, OrderItem

        # Déterminer le numéro de commande
        last_order = Order.objects.order_by('-id').first()
        if last_order and last_order.number.startswith('CMD-'):
            try:
                last_number = int(last_order.number.split('-')[-1])
                order_number = f'CMD-{last_number + 1:04d}'
            except (ValueError, IndexError):
                order_number = 'CMD-0001'
        else:
            order_number = 'CMD-0001'

        logger.info(f'Numéro de commande généré: {order_number}')

        # Créer la commande - S'assurer que l'opportunité est transmise
        order = Order.objects.create(
            number=order_number,
            date=timezone.now().date(),
            company=self.company,
            contact=self.contact,
            opportunity=self.opportunity,  # Transmettre l'opportunité liée au devis
            currency=self.currency,
            exchange_rate=self.exchange_rate,
            payment_terms=self.payment_terms,
            discount_percentage=self.discount_percentage,  # Transmettre la remise
            notes=self.notes,
            terms=self.terms,
            subtotal=self.subtotal,
            tax_amount=self.tax_amount,
            total=self.total,
            bank_account=self.bank_account,
            is_tax_exempt=self.is_tax_exempt,
            tax_exemption_reason=self.tax_exemption_reason,
            status='draft',
            quote=self,
        )

        logger.info(f'Commande {order_number} créée, copie des lignes de devis')

        # Copier les lignes de devis vers la commande
        for quote_item in self.quoteitem_set.all():
            OrderItem.objects.create(
                order=order,
                product=quote_item.product,
                description=quote_item.description,
                quantity=quote_item.quantity,
                unit_price=quote_item.unit_price,
                tax_rate=quote_item.tax_rate,
            )

        logger.info('Lignes copiées, marquage du devis comme converti')

        # Marquer le devis comme converti
        self.converted_to_order = True
        self.save(update_fields=['converted_to_order'])

        logger.info(
            f'Conversion terminée avec succès: devis {self.number} -> commande {order_number}'
        )

        return order

    def convert_to_invoice(self):
        """
        Convertit ce devis directement en facture sans passer par une commande.
        """
        if self.status != 'accepted':
            raise ValueError(
                'Seuls les devis acceptés peuvent être convertis en factures'
            )

        if self.converted_to_invoice:
            raise ValueError('Ce devis a déjà été converti en facture')

        # Créer la facture
        invoice = Invoice.objects.create(
            date=self.date,
            company=self.company,
            contact=self.contact,
            currency=self.currency,
            exchange_rate=self.exchange_rate,
            payment_terms=self.payment_terms,
            discount_percentage=self.discount_percentage,  # Transmettre la remise
            notes=self.notes,
            terms=self.terms,
            subtotal=self.subtotal,
            tax_amount=self.tax_amount,
            total=self.total,
            is_tax_exempt=self.is_tax_exempt,
            tax_exemption_reason=self.tax_exemption_reason,
            quote=self,
            bank_account=self.bank_account,
        )

        # Générer un numéro de facture
        # (le numéro est généré automatiquement dans la méthode save() de Invoice)

        # Copier les lignes de devis vers la facture
        for quote_item in self.get_items():
            InvoiceItem.objects.create(
                invoice=invoice,
                product=quote_item.product,
                description=quote_item.description,
                quantity=quote_item.quantity,
                unit_price=quote_item.unit_price,
                tax_rate=quote_item.tax_rate,
            )

        # Marquer le devis comme converti
        self.converted_to_invoice = True
        self.save(update_fields=['converted_to_invoice'])

        return invoice


class QuoteItem(models.Model):
    """
    Ligne de devis associée à un produit.
    """

    quote = models.ForeignKey(Quote, on_delete=models.CASCADE, verbose_name=_('Devis'))
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, verbose_name=_('Produit')
    )
    description = models.TextField(_('Description'), blank=True)
    quantity = models.DecimalField(
        _('Quantité'), max_digits=10, decimal_places=2, default=1
    )
    unit_price = models.DecimalField(
        _('Prix unitaire'), max_digits=15, decimal_places=2
    )
    tax_rate = models.DecimalField(
        _('Taux de TVA (%)'), max_digits=5, decimal_places=2, default=20.00
    )

    class Meta:
        verbose_name = _('Ligne de devis')
        verbose_name_plural = _('Lignes de devis')

    def __str__(self):
        return f'{self.product.name} ({self.quantity})'

    def save(self, *args, **kwargs):
        """
        Surcharge de save pour initialiser le prix unitaire et la description depuis le produit.
        """
        # Si prix unitaire non défini, utiliser celui du produit
        if self.unit_price is None or self.unit_price == 0:
            self.unit_price = self.product.unit_price

        # Si description non définie, utiliser celle du produit
        if not self.description:
            self.description = self.product.description

        # Si taux de TVA non défini, utiliser celui du produit
        if self.tax_rate is None or self.tax_rate == 0:
            self.tax_rate = self.product.tax_rate

        # Sauvegarder l'item
        super().save(*args, **kwargs)

        # Recalculer les totaux du devis
        if self.quote:
            self.quote.calculate_amounts()
            self.quote.save(update_fields=['subtotal', 'tax_amount', 'total'])


class Order(SalesDocument):
    """
    Modèle pour les commandes clients.
    """

    company = models.ForeignKey(
        'crm.Company', on_delete=models.CASCADE, verbose_name=_('Entreprise')
    )
    contact = models.ForeignKey(
        'crm.Contact', on_delete=models.CASCADE, verbose_name=_('Contact')
    )
    opportunity = models.ForeignKey(
        'crm.Opportunity',
        on_delete=models.CASCADE,
        verbose_name=_('Opportunité'),
        null=True,
        blank=True,
    )

    status = models.CharField(
        _('Statut'),
        max_length=20,
        choices=[
            ('draft', _('Brouillon')),
            ('confirmed', _('Confirmée')),
            ('in_progress', _('En cours')),
            ('delivered', _('Livrée')),
            ('cancelled', _('Annulée')),
        ],
        default='draft',
    )

    # Provient d'un devis
    quote = models.ForeignKey(
        Quote,
        on_delete=models.SET_NULL,
        verbose_name=_("Devis d'origine"),
        null=True,
        blank=True,
    )

    # Conversion en facture
    converted_to_invoice = models.BooleanField(_('Converti en facture'), default=False)

    # Livraison
    delivery_date = models.DateField(_('Date de livraison'), null=True, blank=True)
    delivery_address = models.TextField(
        _('Adresse de livraison'), blank=True, null=True
    )

    # Compte bancaire à utiliser pour cette commande
    bank_account = models.ForeignKey(
        BankAccount,
        on_delete=models.CASCADE,
        verbose_name=_('Compte bancaire'),
        null=True,
        blank=True,
    )

    # Nouveaux champs pour suivre les factures d'acompte
    has_deposit_invoice = models.BooleanField(
        _("A une facture d'acompte"), default=False
    )
    has_final_invoice = models.BooleanField(_('A une facture finale'), default=False)

    class Meta:
        verbose_name = _('Commande')
        verbose_name_plural = _('Commandes')
        ordering = ['-date']

    def __str__(self):
        return f'{self.number} - {self.company.name}'

    def get_items(self):
        """
        Récupère les lignes de commande associées.
        """
        return self.orderitem_set.all()

    def get_deposit_invoices(self):
        """Retourne les factures d'acompte liées à cette commande."""
        return Invoice.objects.filter(order=self, type='deposit')

    def get_deposit_total(self):
        """Retourne le montant total des factures d'acompte pour cette commande."""
        from decimal import Decimal

        from django.db.models import Sum

        result = self.get_deposit_invoices().aggregate(Sum('total'))
        return result['total__sum'] or Decimal('0.00')

    def get_remaining_amount(self):
        """Retourne le montant restant à facturer après les acomptes."""
        return self.total - self.get_deposit_total()

    def can_create_deposit_invoice(self):
        """Vérifie si une facture d'acompte peut être créée."""
        return (
            self.status in ['confirmed', 'in_progress'] and not self.has_deposit_invoice
        )

    def can_create_final_invoice(self):
        """Vérifie si une facture finale peut être créée."""
        return (
            self.status in ['confirmed', 'in_progress', 'delivered']
            and not self.has_final_invoice
            and self.get_remaining_amount() > 0
        )

    def save(self, *args, **kwargs):
        """
        Surcharge de la méthode save pour gérer le numéro de commande automatique
        et d'autres traitements spécifiques aux commandes.
        """
        # Si c'est une nouvelle commande (pas encore de numéro)
        if not self.number:
            # Générer un numéro de commande automatique
            last_order = Order.objects.order_by('-id').first()
            if last_order:
                try:
                    # Tente d'extraire le numéro de la partie après le tiret
                    if '-' in last_order.number:
                        last_number = int(last_order.number.split('-')[-1])
                        self.number = f'CMD-{last_number + 1:04d}'
                    # Tente de gérer le format sans tiret (comme "CMD01")
                    else:
                        # Supprime tout ce qui n'est pas un chiffre
                        import re

                        numeric_part = re.sub(r'[^0-9]', '', last_order.number)
                        if numeric_part:
                            last_number = int(numeric_part)
                            self.number = f'CMD-{last_number + 1:04d}'
                        else:
                            # Si pas de numéro trouvé, commencer à 1
                            self.number = 'CMD-0001'
                except (ValueError, IndexError):
                    # En cas d'erreur, utiliser un numéro par défaut
                    self.number = 'CMD-0001'
            else:
                self.number = 'CMD-0001'

        # S'assurer que le champ status est correctement défini (contournement du problème)
        if 'status' in kwargs.get('update_fields', []) or not kwargs.get(
            'update_fields'
        ):
            # Mettre à jour explicitement l'attribut sur l'instance
            self._status = self.status  # Sauvegarde pour vérification

        # Sélectionner un compte bancaire par défaut si non défini
        if not self.bank_account and self.currency:
            # Chercher un compte par défaut avec la même devise
            default_account = BankAccount.objects.filter(
                currency=self.currency, is_default=True
            ).first()

            # Si aucun compte par défaut, prendre le premier avec la même devise
            if not default_account:
                default_account = BankAccount.objects.filter(
                    currency=self.currency
                ).first()

            if default_account:
                self.bank_account = default_account

        # Appel à la méthode save du parent
        super().save(*args, **kwargs)

        # Vérifier si le statut a été correctement enregistré (contournement du problème)
        if hasattr(self, '_status') and self._status != self.status:
            print(
                "ALERTE: Le statut n'a pas été correctement enregistré. Tentative supplémentaire."
            )
            # Tentative supplémentaire avec une requête directe
            from django.db import connection

            with connection.cursor() as cursor:
                cursor.execute(
                    'UPDATE sales_order SET status = %s WHERE id = %s',
                    [self._status, self.id],
                )
            # Réinitialiser _status
            del self._status

    def get_template_name(self):
        """
        Retourne le nom du template à utiliser pour générer le PDF.
        """
        return 'sales/order_pdf.html'

    def get_pdf_filename(self):
        """
        Retourne le nom du fichier PDF pour cette commande.
        """
        return f'commande_{self.number.replace("-", "_").lower()}.pdf'

    def get_email_template(self):
        """
        Retourne le nom du template email à utiliser.
        """
        return 'sales/emails/order_email.html'

    def get_email_subject(self):
        """
        Retourne le sujet de l'email.
        """
        return f'Commande {self.number} - ECINTELLIGENCE'

    def generate_pdf(self):
        """
        Génère un fichier PDF pour cette commande.
        """
        import os

        from django.conf import settings

        from .services.pdf_generator import PDFGenerator

        # Créer le répertoire de destination s'il n'existe pas
        pdf_dir = os.path.join(settings.MEDIA_ROOT, 'sales', 'pdf')
        os.makedirs(pdf_dir, exist_ok=True)

        # Générer le PDF
        pdf_path = PDFGenerator.generate_order_pdf(self)

        # Mettre à jour le chemin du fichier PDF
        # Extraire juste le nom du fichier du chemin complet
        pdf_filename = os.path.basename(pdf_path)
        self.pdf_file = os.path.join('sales', 'pdf', pdf_filename)
        self.save(update_fields=['pdf_file'])

        return pdf_path

    def send_by_email(self, recipient_email=None):
        """
        Envoie la commande par email.
        Si recipient_email n'est pas fourni, utilise l'email du contact.
        """
        import os

        from django.conf import settings
        from django.utils import timezone

        from .services.email_service import EmailService

        # Générer le PDF s'il n'existe pas
        if not self.pdf_file:
            _pdf_path = self.generate_pdf()
        else:
            _pdf_path = os.path.join(settings.MEDIA_ROOT, self.pdf_file)

        # Déterminer l'email du destinataire
        if not recipient_email:
            if hasattr(self, 'contact') and self.contact and self.contact.email:
                recipient_email = self.contact.email
            elif hasattr(self, 'company') and self.company and self.company.email:
                recipient_email = self.company.email
            else:
                raise ValueError('Aucun email de destinataire disponible')

        # Envoyer l'email en utilisant la méthode statique
        email_sent = EmailService.send_order_email(
            self, recipient_email, f'Commande {self.number} - ECINTELLIGENCE'
        )

        # Mettre à jour le statut d'envoi
        if email_sent:
            self.email_sent = True
            self.email_sent_date = timezone.now()
            self.save(update_fields=['email_sent', 'email_sent_date'])

        return email_sent


class OrderItem(models.Model):
    """
    Ligne de commande associée à un produit.
    """

    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, verbose_name=_('Commande')
    )
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, verbose_name=_('Produit')
    )
    description = models.TextField(_('Description'), blank=True)
    quantity = models.DecimalField(
        _('Quantité'), max_digits=10, decimal_places=2, default=1
    )
    unit_price = models.DecimalField(
        _('Prix unitaire'), max_digits=15, decimal_places=2
    )
    tax_rate = models.DecimalField(
        _('Taux de TVA (%)'), max_digits=5, decimal_places=2, default=20.00
    )

    class Meta:
        verbose_name = _('Ligne de commande')
        verbose_name_plural = _('Lignes de commande')

    def __str__(self):
        return f'{self.product.name} ({self.quantity})'

    def save(self, *args, **kwargs):
        """
        Surcharge de save pour initialiser le prix unitaire et la description depuis le produit.
        """
        # Si prix unitaire non défini, utiliser celui du produit
        if self.unit_price is None or self.unit_price == 0:
            self.unit_price = self.product.unit_price

        # Si description non définie, utiliser celle du produit
        if not self.description:
            self.description = self.product.description

        # Si taux de TVA non défini, utiliser celui du produit
        if self.tax_rate is None or self.tax_rate == 0:
            self.tax_rate = self.product.tax_rate

        # Sauvegarder l'item
        super().save(*args, **kwargs)

        # Recalculer les totaux de la commande
        if self.order:
            self.order.calculate_amounts()
            self.order.save(update_fields=['subtotal', 'tax_amount', 'total'])


class Invoice(SalesDocument):
    """
    Modèle pour les factures clients.
    """

    company = models.ForeignKey(
        'crm.Company', on_delete=models.CASCADE, verbose_name=_('Entreprise')
    )
    contact = models.ForeignKey(
        'crm.Contact', on_delete=models.CASCADE, verbose_name=_('Contact')
    )
    opportunity = models.ForeignKey(
        'crm.Opportunity',
        on_delete=models.CASCADE,
        verbose_name=_('Opportunité'),
        null=True,
        blank=True,
    )

    # Date d'échéance calculée à partir de la date de facture et des conditions de paiement
    due_date = models.DateField(_("Date d'échéance"), null=True, blank=True)

    # Provient d'un devis ou d'une commande
    quote = models.ForeignKey(
        Quote,
        on_delete=models.SET_NULL,
        verbose_name=_("Devis d'origine"),
        null=True,
        blank=True,
    )
    order = models.ForeignKey(
        Order,
        on_delete=models.SET_NULL,
        verbose_name=_("Commande d'origine"),
        null=True,
        blank=True,
    )

    # Suivi des paiements
    payment_status = models.CharField(
        _('Statut de paiement'),
        max_length=20,
        choices=[
            ('unpaid', _('Non payée')),
            ('partial', _('Partiellement payée')),
            ('paid', _('Payée')),
            ('overdue', _('En retard')),
            ('cancelled', _('Annulée')),
        ],
        default='unpaid',
    )

    amount_paid = models.DecimalField(
        _('Montant payé'), max_digits=15, decimal_places=2, default=0
    )
    amount_due = models.DecimalField(
        _('Montant dû'), max_digits=15, decimal_places=2, default=0
    )

    # Compte bancaire à utiliser pour cette facture
    bank_account = models.ForeignKey(
        BankAccount,
        on_delete=models.CASCADE,
        verbose_name=_('Compte bancaire'),
        null=True,
        blank=True,
    )

    # Nouveau champ pour le type de facture
    INVOICE_TYPE_CHOICES = [
        ('standard', _('Facture standard')),
        ('deposit', _("Facture d'acompte")),
        ('credit_note', _('Avoir')),
    ]
    type = models.CharField(
        _('Type de facture'),
        max_length=20,
        choices=INVOICE_TYPE_CHOICES,
        default='standard',
    )

    # Références aux factures liées
    parent_invoice = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='child_invoices',
        verbose_name=_("Facture d'origine"),
    )

    # Pour les factures d'acompte, stocker le pourcentage d'acompte
    deposit_percentage = models.DecimalField(
        _("Pourcentage d'acompte"),
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
    )

    # Pour les avoirs, stocker la raison de l'avoir
    credit_note_reason = models.TextField(_("Motif de l'avoir"), blank=True, null=True)

    class Meta:
        verbose_name = _('Facture')
        verbose_name_plural = _('Factures')
        ordering = ['-date']

    def __str__(self):
        return f'{self.number} - {self.company.name}'

    def get_items(self):
        """
        Récupère les lignes de facture associées.
        """
        return self.invoiceitem_set.all()

    def save(self, *args, **kwargs):
        """
        Surcharge de la méthode save pour gérer le numéro de facture automatique,
        le calcul des montants et la gestion appropriée des statuts de paiement.
        """
        # Générer un numéro de facture automatique si non défini
        if not self.number:
            # Préfixe selon le type de facture
            prefix = ''
            if hasattr(self, 'type'):
                if self.type == 'standard':
                    prefix = 'FACT-'
                elif self.type == 'deposit':
                    prefix = 'AC-'  # Acompte
                elif self.type == 'credit_note':
                    prefix = 'AV-'  # Avoir
            else:
                prefix = 'FACT-'  # Par défaut

            # Rechercher la dernière facture avec ce type/préfixe
            if hasattr(self, 'type'):
                last_invoice = (
                    Invoice.objects.filter(type=self.type).order_by('-id').first()
                )
            else:
                last_invoice = Invoice.objects.order_by('-id').first()

            if last_invoice:
                try:
                    # Tente d'extraire le numéro de la partie après le tiret
                    if '-' in last_invoice.number:
                        last_number = int(last_invoice.number.split('-')[-1])
                        self.number = f'{prefix}{last_number + 1:04d}'
                    # Tente de gérer le format sans tiret
                    else:
                        # Supprime tout ce qui n'est pas un chiffre
                        import re

                        numeric_part = re.sub(r'[^0-9]', '', last_invoice.number)
                        if numeric_part:
                            last_number = int(numeric_part)
                            self.number = f'{prefix}{last_number + 1:04d}'
                        else:
                            # Si pas de numéro trouvé, commencer à 1
                            self.number = f'{prefix}0001'
                except (ValueError, IndexError):
                    # En cas d'erreur, utiliser un numéro par défaut
                    self.number = f'{prefix}0001'
            else:
                self.number = f'{prefix}0001'

        # Calculer la date d'échéance si non définie
        if not self.due_date and self.date:
            from datetime import timedelta

            days_map = {
                'immediate': 0,
                '30_days': 30,
                '60_days': 60,
            }
            days = days_map.get(self.payment_terms, 30)  # 30 jours par défaut
            self.due_date = self.date + timedelta(days=days)

        # Calculer le montant dû
        self.amount_due = self.total - self.amount_paid

        # S'assurer que le champ payment_status est correctement défini (contournement du problème)
        if 'payment_status' in kwargs.get('update_fields', []) or not kwargs.get(
            'update_fields'
        ):
            # Mettre à jour explicitement l'attribut sur l'instance
            self._payment_status = self.payment_status  # Sauvegarde pour vérification

        # Mettre à jour le statut de paiement si ce n'est pas une mise à jour explicite du statut
        # ou si le statut n'est pas "cancelled" (qui est un cas spécial)
        if self.payment_status != 'cancelled' and (
            'payment_status' not in kwargs.get('update_fields', [])
        ):
            self._update_payment_status()

        # Sélectionner un compte bancaire par défaut si non défini
        if not self.bank_account and self.currency:
            # Chercher un compte par défaut avec la même devise
            default_account = BankAccount.objects.filter(
                currency=self.currency, is_default=True
            ).first()

            # Si aucun compte par défaut, prendre le premier avec la même devise
            if not default_account:
                default_account = BankAccount.objects.filter(
                    currency=self.currency
                ).first()

            if default_account:
                self.bank_account = default_account

        # Gestion des factures d'avoir (montants négatifs)
        if hasattr(self, 'type') and self.type == 'credit_note':
            # Pour les avoirs, s'assurer que les montants sont négatifs
            self.subtotal = -abs(self.subtotal)
            self.tax_amount = -abs(self.tax_amount)
            self.total = -abs(self.total)
            self.amount_due = -abs(self.amount_due)

        # Appel à la méthode save du parent
        super().save(*args, **kwargs)

        # Vérifier si le statut a été correctement enregistré (contournement du problème)
        if (
            hasattr(self, '_payment_status')
            and self._payment_status != self.payment_status
        ):
            print(
                "ALERTE: Le statut de paiement n'a pas été correctement enregistré. Tentative supplémentaire."
            )
            print(
                f'  Statut attendu: {self._payment_status}, Statut actuel: {self.payment_status}'
            )
            # Tentative supplémentaire avec une requête directe
            from django.db import connection

            with connection.cursor() as cursor:
                cursor.execute(
                    'UPDATE sales_invoice SET payment_status = %s WHERE id = %s',
                    [self._payment_status, self.id],
                )
            # Réinitialiser _payment_status
            del self._payment_status

        # Mise à jour de la facture d'origine pour les avoirs
        if (
            hasattr(self, 'type')
            and self.type == 'credit_note'
            and hasattr(self, 'parent_invoice')
            and self.parent_invoice
        ):
            try:
                # Mettre à jour le montant payé de la facture d'origine
                parent = self.parent_invoice
                parent.amount_paid = max(
                    0, parent.amount_paid + self.total
                )  # self.total est négatif pour un avoir
                parent.amount_due = parent.total - parent.amount_paid
                parent._update_payment_status()
                parent.save(
                    update_fields=['amount_paid', 'amount_due', 'payment_status']
                )
            except Exception as e:
                print(
                    f"Erreur lors de la mise à jour de la facture d'origine: {str(e)}"
                )

    def _update_payment_status(self):
        """
        Met à jour le statut de paiement en fonction du montant payé et de la date d'échéance.
        Ne modifie pas le statut 'cancelled' qui est considéré comme définitif.
        """
        # Si le statut est déjà 'cancelled', ne rien faire
        if self.payment_status == 'cancelled':
            return

        from decimal import Decimal

        from django.utils import timezone

        today = timezone.now().date()

        # Afficher des informations de débogage
        print(f'Mise à jour du statut de paiement pour {self.number}')
        print(f'  - Montant total: {self.total}')
        print(f'  - Montant payé: {self.amount_paid}')
        print(f'  - Statut actuel: {self.payment_status}')

        # Vérifier que les valeurs sont des décimaux valides
        if not isinstance(self.amount_paid, Decimal):
            self.amount_paid = Decimal(str(self.amount_paid))
        if not isinstance(self.total, Decimal):
            self.total = Decimal(str(self.total))

        # Arrondir les montants pour éviter les problèmes de comparaison
        amount_paid_rounded = self.amount_paid.quantize(Decimal('0.01'))
        total_rounded = self.total.quantize(Decimal('0.01'))

        # Utiliser les valeurs arrondies pour la comparaison
        if amount_paid_rounded == Decimal('0.00'):
            # Vérifier si la facture est en retard
            if self.due_date and self.due_date < today:
                self.payment_status = 'overdue'
            else:
                self.payment_status = 'unpaid'

        elif amount_paid_rounded >= total_rounded:
            self.payment_status = 'paid'
            self.amount_paid = self.total  # Pour éviter les dépassements
            self.amount_due = Decimal('0.00')

        else:  # Paiement partiel
            # Vérifier si la facture est en retard malgré le paiement partiel
            if self.due_date and self.due_date < today:
                self.payment_status = 'overdue'
            else:
                self.payment_status = 'partial'

        # Afficher le nouveau statut
        print(f'  - Nouveau statut: {self.payment_status}')

    def get_template_name(self):
        """
        Retourne le nom du template à utiliser pour générer le PDF.
        """
        return 'sales/invoice_pdf.html'

    def get_pdf_filename(self):
        """
        Retourne le nom du fichier PDF pour cette facture.
        """
        return f'facture_{self.number.replace("-", "_").lower()}.pdf'

    def get_email_template(self):
        """
        Retourne le nom du template email à utiliser.
        """
        return 'sales/emails/invoice_email.html'

    def get_email_subject(self):
        """
        Retourne le sujet de l'email.
        """
        return f'Facture {self.number} - ECINTELLIGENCE'

    def generate_pdf(self):
        """
        Génère un fichier PDF pour cette facture.
        """
        import os

        from django.conf import settings

        from .services.pdf_generator import PDFGenerator

        # Créer le répertoire de destination s'il n'existe pas
        pdf_dir = os.path.join(settings.MEDIA_ROOT, 'sales', 'pdf')
        os.makedirs(pdf_dir, exist_ok=True)

        # Générer le PDF
        pdf_path = PDFGenerator.generate_invoice_pdf(self)

        # Mettre à jour le chemin du fichier PDF
        # Extraire juste le nom du fichier du chemin complet
        pdf_filename = os.path.basename(pdf_path)
        self.pdf_file = os.path.join('sales', 'pdf', pdf_filename)
        self.save(update_fields=['pdf_file'])

        return pdf_path

    def send_by_email(self, recipient_email=None):
        """
        Envoie la facture par email.
        Si recipient_email n'est pas fourni, utilise l'email du contact.
        """
        import os

        from django.conf import settings
        from django.utils import timezone

        from .services.email_service import EmailService

        # Générer le PDF s'il n'existe pas
        if not self.pdf_file:
            _pdf_path = self.generate_pdf()
        else:
            _pdf_path = os.path.join(settings.MEDIA_ROOT, self.pdf_file)

        # Déterminer l'email du destinataire
        if not recipient_email:
            if hasattr(self, 'contact') and self.contact and self.contact.email:
                recipient_email = self.contact.email
            elif hasattr(self, 'company') and self.company and self.company.email:
                recipient_email = self.company.email
            else:
                raise ValueError('Aucun email de destinataire disponible')

        # Envoyer l'email en utilisant la méthode statique
        email_sent = EmailService.send_invoice_email(
            self, recipient_email, f'Facture {self.number} - ECINTELLIGENCE'
        )

        # Mettre à jour le statut d'envoi
        if email_sent:
            self.email_sent = True
            self.email_sent_date = timezone.now()
            self.save(update_fields=['email_sent', 'email_sent_date'])

        return email_sent

    @classmethod
    def create_deposit_invoice(cls, order, deposit_percentage=30):
        """
        Crée une facture d'acompte à partir d'une commande.
        Par défaut, l'acompte est de 30% si non spécifié.
        """
        from decimal import Decimal

        from django.utils import timezone

        # Calculer le montant de l'acompte
        deposit_amount = (order.total * Decimal(deposit_percentage)) / Decimal('100')

        # Créer la facture d'acompte
        deposit_invoice = cls.objects.create(
            type='deposit',
            company=order.company,
            contact=order.contact,
            opportunity=order.opportunity,
            date=timezone.now().date(),
            currency=order.currency,
            exchange_rate=order.exchange_rate,
            payment_terms=order.payment_terms,
            bank_account=order.bank_account,
            subtotal=(order.subtotal * Decimal(deposit_percentage)) / Decimal('100'),
            tax_amount=(order.tax_amount * Decimal(deposit_percentage))
            / Decimal('100'),
            total=deposit_amount,
            amount_paid=0,
            amount_due=deposit_amount,
            deposit_percentage=deposit_percentage,
            notes=f'Acompte de {deposit_percentage}% sur la commande {order.number}',
            terms=order.terms,
            order=order,
            quote=order.quote,
            is_tax_exempt=order.is_tax_exempt,
            tax_exemption_reason=order.tax_exemption_reason,
        )

        # NOUVELLE SECTION: Copier les lignes de produits de la commande avec des quantités ajustées
        from .models import InvoiceItem

        # Obtenir les lignes de commande
        order_items = order.get_items()

        # Pour chaque ligne, créer une ligne de facture d'acompte avec quantité ajustée
        for order_item in order_items:
            # Calculer la proportion d'acompte pour cette ligne
            item_subtotal = (
                order_item.quantity
                * order_item.unit_price
                * Decimal(deposit_percentage)
            ) / Decimal('100')
            _item_tax = (
                item_subtotal * (order_item.tax_rate / Decimal('100'))
                if not order.is_tax_exempt
                else Decimal('0')
            )

            # Créer la ligne de facture d'acompte
            InvoiceItem.objects.create(
                invoice=deposit_invoice,
                product=order_item.product,
                description=f'Acompte ({deposit_percentage}%) : {order_item.description}',
                quantity=order_item.quantity,  # Garder la quantité identique pour référence
                unit_price=(order_item.unit_price * Decimal(deposit_percentage))
                / Decimal('100'),  # Ajuster le prix unitaire
                tax_rate=order_item.tax_rate,
            )

        # Marquer l'ordre comme ayant une facture d'acompte
        order.has_deposit_invoice = True
        order.save(update_fields=['has_deposit_invoice'])

        return deposit_invoice

    def add_payment(self, amount, date=None, reference=None, notes=None):
        """
        Ajoute un paiement à cette facture.
        """
        from django.utils import timezone

        # Créer le paiement
        payment = Payment.objects.create(
            invoice=self,
            amount=amount,
            date=date or timezone.now().date(),
            reference=reference,
            notes=notes,
        )

        # Mettre à jour le montant payé
        self.amount_paid += amount
        self.amount_due = self.total - self.amount_paid

        # Mettre à jour le statut de paiement
        self._update_payment_status()
        self.save(update_fields=['amount_paid', 'amount_due', 'payment_status'])

        return payment


class InvoiceItem(models.Model):
    """
    Ligne de facture associée à un produit.
    """

    invoice = models.ForeignKey(
        Invoice, on_delete=models.CASCADE, verbose_name=_('Facture')
    )
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, verbose_name=_('Produit')
    )
    description = models.TextField(_('Description'), blank=True)
    quantity = models.DecimalField(
        _('Quantité'), max_digits=10, decimal_places=2, default=1
    )
    unit_price = models.DecimalField(
        _('Prix unitaire'), max_digits=15, decimal_places=2
    )
    tax_rate = models.DecimalField(
        _('Taux de TVA (%)'), max_digits=5, decimal_places=2, default=20.00
    )

    class Meta:
        verbose_name = _('Ligne de facture')
        verbose_name_plural = _('Lignes de facture')

    def __str__(self):
        return f'{self.product.name} ({self.quantity})'

    def save(self, *args, **kwargs):
        """
        Surcharge de save pour initialiser le prix unitaire et la description depuis le produit.
        """
        # Si prix unitaire non défini, utiliser celui du produit
        if self.unit_price is None or self.unit_price == 0:
            self.unit_price = self.product.unit_price

        # Si description non définie, utiliser celle du produit
        if not self.description:
            self.description = self.product.description

        # Si taux de TVA non défini, utiliser celui du produit
        if self.tax_rate is None or self.tax_rate == 0:
            self.tax_rate = self.product.tax_rate

        # Sauvegarder l'item
        super().save(*args, **kwargs)

        # Recalculer les totaux de la facture
        if self.invoice:
            self.invoice.calculate_amounts()
            self.invoice.save(
                update_fields=['subtotal', 'tax_amount', 'total', 'amount_due']
            )


class Payment(models.Model):
    """
    Paiement reçu pour une facture.
    """

    invoice = models.ForeignKey(
        Invoice, on_delete=models.CASCADE, verbose_name=_('Facture')
    )
    date = models.DateField(_('Date de paiement'))
    amount = models.DecimalField(_('Montant'), max_digits=15, decimal_places=2)
    method = models.CharField(
        _('Méthode de paiement'),
        max_length=20,
        choices=[
            ('bank_transfer', _('Virement bancaire')),
            ('check', _('Chèque')),
            ('cash', _('Espèces')),
            ('credit_card', _('Carte de crédit')),
            ('other', _('Autre')),
        ],
        default='bank_transfer',
    )
    reference = models.CharField(_('Référence'), max_length=100, blank=True, null=True)
    notes = models.TextField(_('Notes'), blank=True, null=True)

    class Meta:
        verbose_name = _('Paiement')
        verbose_name_plural = _('Paiements')
        ordering = ['-date']

    def __str__(self):
        return f'{self.invoice.number} - {self.amount} {self.invoice.currency.code} ({self.date})'

    def save(self, *args, **kwargs):
        """
        Surcharge de save pour mettre à jour le statut de paiement de la facture.
        """
        is_new = self.pk is None

        # Sauvegarder le paiement
        super().save(*args, **kwargs)

        # Si c'est un nouveau paiement, mettre à jour la facture
        if is_new:
            # Mettre à jour le montant payé de la facture
            self.invoice.amount_paid += self.amount
            self.invoice.amount_due = self.invoice.total - self.invoice.amount_paid

            # Mettre à jour le statut de paiement
            self.invoice._update_payment_status()
            self.invoice.save(
                update_fields=['amount_paid', 'amount_due', 'payment_status']
            )
