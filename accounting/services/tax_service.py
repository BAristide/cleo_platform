from decimal import ROUND_HALF_UP, Decimal

from django.utils.translation import gettext_lazy as _

from ..models import Account, Tax


class TaxService:
    """Service de gestion de la TVA et autres taxes."""

    VAT_RATES = {
        'standard': 20,  # Taux normal
        'intermediate1': 14,  # Taux réduit intermédiaire 1
        'intermediate2': 10,  # Taux réduit intermédiaire 2
        'reduced': 7,  # Taux super-réduit
        'zero': 0,  # Taux zéro (exonéré)
    }

    @staticmethod
    def get_vat_rates():
        """
        Retourne les taux de TVA applicables au Maroc.

        Returns:
            dict: Dictionnaire des taux de TVA avec leurs libellés
        """
        return {
            'standard': {
                'rate': 20,
                'label': _('Taux normal (20%)'),
                'description': _(
                    'Taux normal applicable à la majorité des biens et services.'
                ),
            },
            'intermediate1': {
                'rate': 14,
                'label': _('Taux intermédiaire 1 (14%)'),
                'description': _(
                    'Applicable à certains produits et services spécifiques.'
                ),
            },
            'intermediate2': {
                'rate': 10,
                'label': _('Taux intermédiaire 2 (10%)'),
                'description': _(
                    'Applicable notamment au secteur touristique et certains produits alimentaires.'
                ),
            },
            'reduced': {
                'rate': 7,
                'label': _('Taux réduit (7%)'),
                'description': _(
                    'Applicable aux produits de première nécessité et certains services sociaux.'
                ),
            },
            'zero': {
                'rate': 0,
                'label': _('Taux zéro (0%)'),
                'description': _(
                    'Applicable aux exportations et certaines opérations exonérées.'
                ),
            },
        }

    @staticmethod
    def get_tax_by_rate(rate, is_deductible=False):
        """
        Récupère une taxe par son taux.

        Args:
            rate (float): Taux de la taxe
            is_deductible (bool, optional): Si la taxe est déductible. Defaults to False.

        Returns:
            Tax: L'objet taxe correspondant ou None si non trouvé
        """
        try:
            tax = Tax.objects.filter(
                amount=rate,
                type='percent',
                tax_category='vat',
                is_deductible=is_deductible,
                active=True,
            ).first()
            return tax
        except Exception:
            return None

    @staticmethod
    def calculate_tax_amount(base_amount, rate_key='standard', is_tax_exempt=False):
        """
        Calcule le montant de taxe à partir d'un montant de base et d'un taux.

        Args:
            base_amount (Decimal): Montant de base
            rate_key (str, optional): Clé du taux à utiliser. Defaults to 'standard'.
            is_tax_exempt (bool, optional): Si l'opération est exonérée de taxe. Defaults to False.

        Returns:
            Decimal: Montant de la taxe
        """
        if is_tax_exempt:
            return Decimal('0.0')

        rates = TaxService.VAT_RATES
        rate = rates.get(rate_key, rates['standard'])

        # Calcul avec arrondi à 2 décimales
        tax_amount = Decimal(base_amount) * Decimal(rate) / Decimal(100)
        return tax_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    @staticmethod
    def calculate_tax_included_base(total_amount, rate_key='standard'):
        """
        Calcule le montant de base HT à partir d'un montant TTC et d'un taux.

        Args:
            total_amount (Decimal): Montant total TTC
            rate_key (str, optional): Clé du taux à utiliser. Defaults to 'standard'.

        Returns:
            Decimal: Montant de base HT
        """
        rates = TaxService.VAT_RATES
        rate = rates.get(rate_key, rates['standard'])

        # Calcul avec arrondi à 2 décimales
        base_amount = Decimal(total_amount) * Decimal(100) / Decimal(100 + rate)
        return base_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    @staticmethod
    def calculate_vat_from_document(document, discount_amount=None):
        """
        Calcule les montants de TVA pour un document commercial (facture, devis, etc.).

        Args:
            document: Document commercial avec des lignes (items)
            discount_amount (Decimal, optional): Montant de remise globale. Defaults to None.

        Returns:
            dict: Dictionnaire avec les montants de TVA par taux et les totaux
        """
        # Vérifier si le document est exonéré de taxe
        is_tax_exempt = hasattr(document, 'is_tax_exempt') and document.is_tax_exempt

        if is_tax_exempt:
            return {
                'vat_amounts': {},
                'total_untaxed': document.total_untaxed
                if hasattr(document, 'total_untaxed')
                else Decimal('0.0'),
                'total_tax': Decimal('0.0'),
                'total_amount': document.total_amount
                if hasattr(document, 'total_amount')
                else Decimal('0.0'),
                'is_tax_exempt': True,
            }

        # Initialiser les totaux
        subtotal = Decimal('0.0')
        vat_amounts = {}

        # Parcourir les lignes du document
        if hasattr(document, 'items'):
            for item in document.items.all():
                # Récupérer le taux de TVA de la ligne
                vat_rate = item.vat_rate if hasattr(item, 'vat_rate') else 20

                # Calculer le montant HT de la ligne
                line_amount = item.quantity * item.unit_price

                # Appliquer la remise de ligne si présente
                if hasattr(item, 'discount_percentage') and item.discount_percentage:
                    line_amount = line_amount * (1 - item.discount_percentage / 100)

                # Ajouter au sous-total
                subtotal += line_amount

                # Ajouter au dictionnaire des TVA
                if vat_rate not in vat_amounts:
                    vat_amounts[vat_rate] = Decimal('0.0')

                # Ajouter le montant de TVA
                vat_amounts[vat_rate] += TaxService.calculate_tax_amount(
                    line_amount, None, False
                )

        # Appliquer la remise globale si présente
        if discount_amount:
            subtotal -= discount_amount

            # Recalculer les montants de TVA après remise
            vat_amounts = {}

            if hasattr(document, 'items'):
                total_before_discount = sum(
                    item.quantity * item.unit_price for item in document.items.all()
                )
                discount_ratio = Decimal('1.0')

                if total_before_discount > 0:
                    discount_ratio = (
                        total_before_discount - discount_amount
                    ) / total_before_discount

                for item in document.items.all():
                    # Récupérer le taux de TVA de la ligne
                    vat_rate = item.vat_rate if hasattr(item, 'vat_rate') else 20

                    # Calculer le montant HT de la ligne avec remise
                    line_amount = item.quantity * item.unit_price * discount_ratio

                    # Ajouter au dictionnaire des TVA
                    if vat_rate not in vat_amounts:
                        vat_amounts[vat_rate] = Decimal('0.0')

                    # Ajouter le montant de TVA
                    vat_amounts[vat_rate] += TaxService.calculate_tax_amount(
                        line_amount, None, False
                    )

        # Calculer le total des taxes
        total_tax = sum(vat_amounts.values())

        # Calculer le montant total
        total_amount = subtotal + total_tax

        return {
            'vat_amounts': vat_amounts,
            'total_untaxed': subtotal,
            'total_tax': total_tax,
            'total_amount': total_amount,
            'is_tax_exempt': False,
        }

    @staticmethod
    def is_exempt_operation(operation_type, currency=None):
        """
        Détermine si une opération est exonérée de TVA.

        Args:
            operation_type (str): Type d'opération
            currency: Devise de l'opération. Defaults to None.

        Returns:
            bool: True si l'opération est exonérée, False sinon
        """
        # Exportations (facturé en devise étrangère)
        if currency and hasattr(currency, 'code') and currency.code != 'MAD':
            return True

        # Autres cas d'exonération selon l'article 92 du CGI
        tax_exempt_operations = [
            'export',
            'investment',
            'agriculture',
            'education',
            'health',
        ]
        return operation_type in tax_exempt_operations

    @staticmethod
    def get_vat_accounts():
        """
        Récupère les comptes comptables liés à la TVA.

        Returns:
            dict: Dictionnaire des comptes de TVA
        """
        vat_accounts = {
            'collected': None,  # TVA collectée
            'deductible': None,  # TVA déductible
            'payable': None,  # TVA à payer
            'credit': None,  # Crédit de TVA
        }

        try:
            vat_accounts['collected'] = Account.objects.filter(
                code__startswith='4455', is_active=True
            ).first()
            vat_accounts['deductible'] = Account.objects.filter(
                code__startswith='3455', is_active=True
            ).first()
            vat_accounts['payable'] = Account.objects.filter(
                code__startswith='4456', is_active=True
            ).first()
            vat_accounts['credit'] = Account.objects.filter(
                code__startswith='3456', is_active=True
            ).first()
        except Exception:
            pass

        return vat_accounts

    @staticmethod
    def prepare_vat_declaration(start_date, end_date):
        """
        Prépare les données pour une déclaration de TVA.

        Args:
            start_date (date): Date de début de la période
            end_date (date): Date de fin de la période

        Returns:
            dict: Données de la déclaration de TVA
        """
        from django.db.models import Sum

        from ..models import JournalEntryLine

        # Récupérer les comptes de TVA
        vat_accounts = TaxService.get_vat_accounts()

        # Initialiser les données de la déclaration
        declaration_data = {
            'period': {'start_date': start_date, 'end_date': end_date},
            'vat_collected': {'details': [], 'total': Decimal('0.0')},
            'vat_deductible': {'details': [], 'total': Decimal('0.0')},
            'vat_payable': Decimal('0.0'),
            'vat_credit': Decimal('0.0'),
        }

        # Récupérer les montants de TVA collectée
        if vat_accounts['collected']:
            collected_lines = JournalEntryLine.objects.filter(
                account_id=vat_accounts['collected'],
                entry_id__date__gte=start_date,
                entry_id__date__lte=end_date,
                entry_id__state='posted',
            )

            # Regrouper par taxe
            collected_by_tax = collected_lines.values('tax_line_id').annotate(
                total=Sum('credit') - Sum('debit')
            )

            total_collected = Decimal('0.0')
            for item in collected_by_tax:
                tax_id = item['tax_line_id']
                amount = item['total']

                if tax_id:
                    try:
                        tax = Tax.objects.get(id=tax_id)
                        declaration_data['vat_collected']['details'].append(
                            {
                                'tax': {
                                    'id': tax.id,
                                    'name': tax.name,
                                    'rate': tax.amount,
                                },
                                'amount': float(amount),
                            }
                        )
                    except Tax.DoesNotExist:
                        declaration_data['vat_collected']['details'].append(
                            {
                                'tax': {
                                    'id': None,
                                    'name': _('TVA collectée'),
                                    'rate': None,
                                },
                                'amount': float(amount),
                            }
                        )
                else:
                    declaration_data['vat_collected']['details'].append(
                        {
                            'tax': {
                                'id': None,
                                'name': _('TVA collectée'),
                                'rate': None,
                            },
                            'amount': float(amount),
                        }
                    )

                total_collected += amount

            declaration_data['vat_collected']['total'] = float(total_collected)

        # Récupérer les montants de TVA déductible
        if vat_accounts['deductible']:
            deductible_lines = JournalEntryLine.objects.filter(
                account_id=vat_accounts['deductible'],
                entry_id__date__gte=start_date,
                entry_id__date__lte=end_date,
                entry_id__state='posted',
            )

            # Regrouper par taxe
            deductible_by_tax = deductible_lines.values('tax_line_id').annotate(
                total=Sum('debit') - Sum('credit')
            )

            total_deductible = Decimal('0.0')
            for item in deductible_by_tax:
                tax_id = item['tax_line_id']
                amount = item['total']

                if tax_id:
                    try:
                        tax = Tax.objects.get(id=tax_id)
                        declaration_data['vat_deductible']['details'].append(
                            {
                                'tax': {
                                    'id': tax.id,
                                    'name': tax.name,
                                    'rate': tax.amount,
                                },
                                'amount': float(amount),
                            }
                        )
                    except Tax.DoesNotExist:
                        declaration_data['vat_deductible']['details'].append(
                            {
                                'tax': {
                                    'id': None,
                                    'name': _('TVA déductible'),
                                    'rate': None,
                                },
                                'amount': float(amount),
                            }
                        )
                else:
                    declaration_data['vat_deductible']['details'].append(
                        {
                            'tax': {
                                'id': None,
                                'name': _('TVA déductible'),
                                'rate': None,
                            },
                            'amount': float(amount),
                        }
                    )

                total_deductible += amount

            declaration_data['vat_deductible']['total'] = float(total_deductible)

        # Calculer le solde de TVA
        vat_balance = total_collected - total_deductible

        if vat_balance > 0:
            declaration_data['vat_payable'] = float(vat_balance)
        else:
            declaration_data['vat_credit'] = float(-vat_balance)

        return declaration_data

    @staticmethod
    def generate_vat_declaration_entry(period_id, user=None):
        """
        Génère l'écriture comptable de déclaration de TVA pour une période.

        Args:
            period_id: ID de la période fiscale
            user: Utilisateur qui génère l'écriture. Defaults to None.

        Returns:
            JournalEntry: L'écriture générée

        Raises:
            ValueError: Si des données sont manquantes ou invalides
        """
        from django.db import transaction

        from ..models import FiscalPeriod, Journal, JournalEntry, JournalEntryLine

        # Récupérer la période fiscale
        try:
            period = FiscalPeriod.objects.get(id=period_id)
        except FiscalPeriod.DoesNotExist:
            raise ValueError(_('Période fiscale non trouvée'))

        # Préparer les données de la déclaration
        declaration_data = TaxService.prepare_vat_declaration(
            start_date=period.start_date, end_date=period.end_date
        )

        # Vérifier s'il y a un solde à déclarer
        vat_payable = Decimal(str(declaration_data['vat_payable']))
        vat_credit = Decimal(str(declaration_data['vat_credit']))

        if vat_payable == 0 and vat_credit == 0:
            raise ValueError(_('Aucun solde de TVA à déclarer pour cette période'))

        # Récupérer les comptes de TVA
        vat_accounts = TaxService.get_vat_accounts()

        if not vat_accounts['collected'] or not vat_accounts['deductible']:
            raise ValueError(_('Comptes de TVA non configurés'))

        if vat_payable > 0 and not vat_accounts['payable']:
            raise ValueError(_('Compte de TVA à payer non configuré'))

        if vat_credit > 0 and not vat_accounts['credit']:
            raise ValueError(_('Compte de crédit de TVA non configuré'))

        # Récupérer le journal pour la déclaration
        try:
            journal = Journal.objects.get(code='OD')  # Journal des opérations diverses
        except Journal.DoesNotExist:
            raise ValueError(_('Journal des opérations diverses non trouvé'))

        # Créer l'écriture comptable dans une transaction
        with transaction.atomic():
            # Créer l'écriture
            entry = JournalEntry.objects.create(
                journal_id=journal,
                name=journal.next_sequence(period.end_date),
                date=period.end_date,
                period_id=period,
                ref=_('Déclaration TVA {}').format(period.name),
                narration=_('Déclaration de TVA pour la période {}').format(
                    period.name
                ),
                is_manual=False,
                created_by=user,
                source_module='accounting',
                source_model='FiscalPeriod',
                source_id=period.id,
            )

            # Créer les lignes - TVA collectée
            if (
                vat_accounts['collected']
                and declaration_data['vat_collected']['total'] > 0
            ):
                JournalEntryLine.objects.create(
                    entry_id=entry,
                    account_id=vat_accounts['collected'],
                    name=_('TVA collectée pour {}').format(period.name),
                    debit=declaration_data['vat_collected']['total'],
                    credit=0,
                )

            # Créer les lignes - TVA déductible
            if (
                vat_accounts['deductible']
                and declaration_data['vat_deductible']['total'] > 0
            ):
                JournalEntryLine.objects.create(
                    entry_id=entry,
                    account_id=vat_accounts['deductible'],
                    name=_('TVA déductible pour {}').format(period.name),
                    debit=0,
                    credit=declaration_data['vat_deductible']['total'],
                )

            # Créer les lignes - Solde de TVA
            if vat_payable > 0:
                JournalEntryLine.objects.create(
                    entry_id=entry,
                    account_id=vat_accounts['payable'],
                    name=_('TVA à payer pour {}').format(period.name),
                    debit=0,
                    credit=vat_payable,
                )
            elif vat_credit > 0:
                JournalEntryLine.objects.create(
                    entry_id=entry,
                    account_id=vat_accounts['credit'],
                    name=_('Crédit de TVA pour {}').format(period.name),
                    debit=vat_credit,
                    credit=0,
                )

            # Valider l'écriture
            entry.post()

            return entry

    @staticmethod
    def generate_tax_lines(account_lines):
        """
        Génère les lignes de taxe correspondant à des lignes de compte.

        Args:
            account_lines (list): Liste de dictionnaires représentant des lignes de compte
                Format attendu: [
                    {
                        'account_id': account_id,
                        'name': name,
                        'debit': debit,
                        'credit': credit,
                        'tax_id': tax_id,  # Optionnel, ID de la taxe à appliquer
                        'tax_included': True/False  # Optionnel, si les montants incluent déjà la taxe
                    },
                    ...
                ]

        Returns:
            list: Liste de dictionnaires représentant les lignes de taxe
        """
        tax_lines = []

        for line in account_lines:
            tax_id = line.get('tax_id')

            if not tax_id:
                continue

            # Récupérer la taxe
            try:
                tax = Tax.objects.get(id=tax_id)
            except Tax.DoesNotExist:
                continue

            # Vérifier si la taxe a un compte associé
            if not tax.account_id:
                continue

            # Déterminer le montant de base et le sens (débit/crédit)
            base_amount = Decimal('0.0')
            is_debit = False

            if line.get('debit', 0) > 0:
                base_amount = line.get('debit', 0)
                is_debit = (
                    False  # Si la ligne principale est débitée, la taxe est créditée
                )
            elif line.get('credit', 0) > 0:
                base_amount = line.get('credit', 0)
                is_debit = (
                    True  # Si la ligne principale est créditée, la taxe est débitée
                )

            # Si le montant inclut déjà la taxe, calculer la base HT
            if line.get('tax_included', False):
                base_amount = TaxService.calculate_tax_included_base(base_amount, None)

            # Calculer le montant de taxe
            tax_amount = base_amount * (tax.amount / 100)

            # Arrondir à 2 décimales
            tax_amount = tax_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

            # Ne créer la ligne de taxe que si le montant est non nul
            if tax_amount > 0:
                tax_line = {
                    'account_id': tax.account_id.id,
                    'name': _('TVA sur {}').format(line.get('name', '')),
                    'debit': tax_amount if is_debit else 0,
                    'credit': 0 if is_debit else tax_amount,
                    'tax_line_id': tax.id,
                    'tax_base_amount': base_amount,
                }

                tax_lines.append(tax_line)

        return tax_lines
