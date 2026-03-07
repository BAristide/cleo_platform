from datetime import date
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from ..models import Account, FiscalPeriod, Journal, JournalEntry, JournalEntryLine


class JournalEntryService:
    """Service pour la gestion des écritures comptables."""

    @staticmethod
    def create_entry(
        journal_code,
        entry_date,
        narration,
        lines,
        ref='',
        is_manual=True,
        user=None,
        source_info=None,
    ):
        """
        Crée une écriture comptable complète avec ses lignes.

        Args:
            journal_code (str): Code du journal
            entry_date (date): Date de l'écriture
            narration (str): Libellé de l'écriture
            lines (list): Liste des lignes d'écriture sous forme de dictionnaires
            ref (str, optional): Référence externe. Defaults to ''.
            is_manual (bool, optional): Si l'écriture est manuelle. Defaults to True.
            user: Utilisateur qui crée l'écriture. Defaults to None.
            source_info (dict, optional): Informations sur la source de l'écriture. Defaults to None.
                Format attendu: {'module': 'module_name', 'model': 'model_name', 'id': object_id}

        Returns:
            JournalEntry: L'écriture créée

        Raises:
            ValueError: Si des données sont invalides ou manquantes
            Exception: Si une erreur se produit lors de la création
        """
        # Validation des données
        if not journal_code:
            raise ValueError(_('Le code du journal est requis'))

        if isinstance(entry_date, str):
            from datetime import datetime as dt

            entry_date = dt.strptime(entry_date, '%Y-%m-%d').date()
        if not isinstance(entry_date, date):
            raise ValueError(_('La date doit être un objet date'))

        if not lines or not isinstance(lines, list) or len(lines) < 2:
            raise ValueError(
                _('Au moins deux lignes sont requises pour créer une écriture')
            )

        # Récupérer le journal
        try:
            journal = Journal.objects.get(code=journal_code)
        except Journal.DoesNotExist:
            raise ValueError(_('Journal non trouvé: {}').format(journal_code))

        # Déterminer la période fiscale
        try:
            period = FiscalPeriod.objects.get(
                start_date__lte=entry_date, end_date__gte=entry_date, state='open'
            )
        except FiscalPeriod.DoesNotExist:
            raise ValueError(
                _('Aucune période fiscale ouverte pour cette date: {}').format(
                    entry_date
                )
            )

        # Vérifier l'équilibre des lignes
        total_debit = sum(line.get('debit', 0) for line in lines)
        total_credit = sum(line.get('credit', 0) for line in lines)

        if round(total_debit, 2) != round(total_credit, 2):
            raise ValueError(
                _("L'écriture n'est pas équilibrée: débit={}, crédit={}").format(
                    total_debit, total_credit
                )
            )

        # Créer l'écriture et ses lignes dans une transaction
        with transaction.atomic():
            # Créer l'écriture
            entry = JournalEntry.objects.create(
                journal_id=journal,
                name=journal.next_sequence(entry_date),
                date=entry_date,
                period_id=period,
                ref=ref,
                narration=narration,
                is_manual=is_manual,
                created_by=user,
            )

            # Ajouter les informations de source si fournies
            if source_info and isinstance(source_info, dict):
                entry.source_module = source_info.get('module', '')
                entry.source_model = source_info.get('model', '')
                entry.source_id = source_info.get('id')
                entry.save(update_fields=['source_module', 'source_model', 'source_id'])

            # Créer les lignes
            for i, line_data in enumerate(lines):
                account_code = line_data.get('account_code')
                account_id = line_data.get('account_id')

                # Récupérer le compte
                if account_code and not account_id:
                    try:
                        account = Account.objects.get(code=account_code)
                    except Account.DoesNotExist:
                        raise ValueError(
                            _('Compte non trouvé: {}').format(account_code)
                        )
                elif account_id:
                    try:
                        account = Account.objects.get(id=account_id)
                    except Account.DoesNotExist:
                        raise ValueError(
                            _('Compte non trouvé: ID={}').format(account_id)
                        )
                else:
                    raise ValueError(
                        _(
                            "Le code ou l'ID du compte est requis pour la ligne {}"
                        ).format(i + 1)
                    )

                # Récupérer les valeurs de débit/crédit
                debit = Decimal(line_data.get('debit', 0))
                credit = Decimal(line_data.get('credit', 0))

                # Validation basique
                if debit < 0 or credit < 0:
                    raise ValueError(
                        _('Les montants débit/crédit doivent être positifs')
                    )

                if debit > 0 and credit > 0:
                    raise ValueError(
                        _('Une ligne ne peut pas avoir à la fois un débit et un crédit')
                    )

                # Créer la ligne
                JournalEntryLine.objects.create(
                    entry_id=entry,
                    account_id=account,
                    name=line_data.get('name', ''),
                    partner_id=line_data.get('partner_id'),
                    debit=debit,
                    credit=credit,
                    currency_id=line_data.get('currency_id'),
                    amount_currency=line_data.get('amount_currency', 0),
                    date_maturity=line_data.get('date_maturity'),
                    ref=line_data.get('ref', ''),
                    analytic_account_id=line_data.get('analytic_account_id'),
                    tax_line_id=line_data.get('tax_line_id'),
                    tax_base_amount=line_data.get('tax_base_amount', 0),
                )

            return entry

    @staticmethod
    def create_simple_entry(
        journal_code,
        entry_date,
        narration,
        debit_lines,
        credit_lines,
        ref='',
        is_manual=True,
        user=None,
        source_info=None,
    ):
        """
        Crée une écriture comptable en fournissant simplement les lignes de débit et de crédit.

        Args:
            journal_code (str): Code du journal
            entry_date (date): Date de l'écriture
            narration (str): Libellé de l'écriture
            debit_lines (list): Liste des lignes de débit sous forme de dictionnaires avec 'account_code' et 'amount'
            credit_lines (list): Liste des lignes de crédit sous forme de dictionnaires avec 'account_code' et 'amount'
            ref (str, optional): Référence externe. Defaults to ''.
            is_manual (bool, optional): Si l'écriture est manuelle. Defaults to True.
            user: Utilisateur qui crée l'écriture. Defaults to None.
            source_info (dict, optional): Informations sur la source de l'écriture. Defaults to None.
                Format attendu: {'module': 'module_name', 'model': 'model_name', 'id': object_id}

        Returns:
            JournalEntry: L'écriture créée

        Raises:
            ValueError: Si des données sont invalides ou manquantes
            Exception: Si une erreur se produit lors de la création
        """
        # Validation des données
        if not debit_lines or not credit_lines:
            raise ValueError(_('Les lignes de débit et de crédit sont requises'))

        # Calculer les totaux
        total_debit = sum(Decimal(line.get('amount', 0)) for line in debit_lines)
        total_credit = sum(Decimal(line.get('amount', 0)) for line in credit_lines)

        # Vérifier l'équilibre
        if round(total_debit, 2) != round(total_credit, 2):
            raise ValueError(
                _("L'écriture n'est pas équilibrée: débit={}, crédit={}").format(
                    total_debit, total_credit
                )
            )

        # Préparer les lignes
        lines = []

        # Lignes de débit
        for debit_line in debit_lines:
            lines.append(
                {
                    'account_code': debit_line.get('account_code'),
                    'account_id': debit_line.get('account_id'),
                    'name': debit_line.get('name', narration),
                    'debit': debit_line.get('amount', 0),
                    'credit': 0,
                    'partner_id': debit_line.get('partner_id'),
                    'date_maturity': debit_line.get('date_maturity'),
                    'ref': debit_line.get('ref', ref),
                    'analytic_account_id': debit_line.get('analytic_account_id'),
                }
            )

        # Lignes de crédit
        for credit_line in credit_lines:
            lines.append(
                {
                    'account_code': credit_line.get('account_code'),
                    'account_id': credit_line.get('account_id'),
                    'name': credit_line.get('name', narration),
                    'debit': 0,
                    'credit': credit_line.get('amount', 0),
                    'partner_id': credit_line.get('partner_id'),
                    'date_maturity': credit_line.get('date_maturity'),
                    'ref': credit_line.get('ref', ref),
                    'analytic_account_id': credit_line.get('analytic_account_id'),
                }
            )

        # Créer l'écriture
        return JournalEntryService.create_entry(
            journal_code=journal_code,
            entry_date=entry_date,
            narration=narration,
            lines=lines,
            ref=ref,
            is_manual=is_manual,
            user=user,
            source_info=source_info,
        )

    @staticmethod
    def duplicate_entry(entry_id, new_date=None, new_ref=None, user=None):
        """
        Duplique une écriture comptable existante.

        Args:
            entry_id: ID de l'écriture à dupliquer
            new_date (date, optional): Nouvelle date pour l'écriture dupliquée. Defaults to None (date courante).
            new_ref (str, optional): Nouvelle référence pour l'écriture dupliquée. Defaults to None.
            user: Utilisateur qui crée l'écriture. Defaults to None.

        Returns:
            JournalEntry: La nouvelle écriture créée

        Raises:
            ValueError: Si l'écriture d'origine n'est pas trouvée
            Exception: Si une erreur se produit lors de la duplication
        """
        # Récupérer l'écriture d'origine
        try:
            original_entry = JournalEntry.objects.get(id=entry_id)
        except JournalEntry.DoesNotExist:
            raise ValueError(_('Écriture non trouvée: ID={}').format(entry_id))

        # Déterminer la date de la nouvelle écriture
        if not new_date:
            new_date = timezone.now().date()

        # Déterminer la référence de la nouvelle écriture
        if new_ref is None:
            new_ref = original_entry.ref

        # Déterminer la période fiscale pour la nouvelle date
        try:
            period = FiscalPeriod.objects.get(
                start_date__lte=new_date, end_date__gte=new_date, state='open'
            )
        except FiscalPeriod.DoesNotExist:
            raise ValueError(
                _('Aucune période fiscale ouverte pour cette date: {}').format(new_date)
            )

        # Créer la nouvelle écriture
        with transaction.atomic():
            new_entry = JournalEntry.objects.create(
                journal_id=original_entry.journal_id,
                name=original_entry.journal_id.next_sequence(new_date),
                date=new_date,
                period_id=period,
                ref=new_ref,
                narration=original_entry.narration,
                is_manual=True,  # La copie est toujours manuelle
                created_by=user if user else original_entry.created_by,
            )

            # Dupliquer les lignes
            for line in original_entry.lines.all():
                JournalEntryLine.objects.create(
                    entry_id=new_entry,
                    account_id=line.account_id,
                    name=line.name,
                    partner_id=line.partner_id,
                    debit=line.debit,
                    credit=line.credit,
                    currency_id=line.currency_id,
                    amount_currency=line.amount_currency,
                    date_maturity=None,  # Ne pas copier l'échéance
                    ref=line.ref,
                    analytic_account_id=line.analytic_account_id,
                    tax_line_id=line.tax_line_id,
                    tax_base_amount=line.tax_base_amount,
                )

            return new_entry

    @staticmethod
    def reverse_entry(entry_id, reversal_date=None, reversal_ref=None, user=None):
        """
        Crée une écriture d'extourne (inverse) pour une écriture existante.

        Args:
            entry_id: ID de l'écriture à extourner
            reversal_date (date, optional): Date de l'extourne. Defaults to None (date courante).
            reversal_ref (str, optional): Référence de l'extourne. Defaults to None.
            user: Utilisateur qui crée l'écriture. Defaults to None.

        Returns:
            JournalEntry: L'écriture d'extourne créée

        Raises:
            ValueError: Si l'écriture d'origine n'est pas trouvée ou n'est pas validée
            Exception: Si une erreur se produit lors de l'extourne
        """
        # Récupérer l'écriture d'origine
        try:
            original_entry = JournalEntry.objects.get(id=entry_id)
        except JournalEntry.DoesNotExist:
            raise ValueError(_('Écriture non trouvée: ID={}').format(entry_id))

        # Vérifier que l'écriture est validée
        if original_entry.state != 'posted':
            raise ValueError(_('Seules les écritures validées peuvent être extournées'))

        # Déterminer la date de l'extourne
        if not reversal_date:
            reversal_date = timezone.now().date()

        # Déterminer la référence de l'extourne
        if reversal_ref is None:
            reversal_ref = _('Extourne de {}').format(
                original_entry.ref or original_entry.name
            )

        # Déterminer la période fiscale pour la date d'extourne
        try:
            period = FiscalPeriod.objects.get(
                start_date__lte=reversal_date, end_date__gte=reversal_date, state='open'
            )
        except FiscalPeriod.DoesNotExist:
            raise ValueError(
                _('Aucune période fiscale ouverte pour cette date: {}').format(
                    reversal_date
                )
            )

        # Créer l'écriture d'extourne
        with transaction.atomic():
            reversal_entry = JournalEntry.objects.create(
                journal_id=original_entry.journal_id,
                name=original_entry.journal_id.next_sequence(reversal_date),
                date=reversal_date,
                period_id=period,
                ref=reversal_ref,
                narration=_('Extourne de {}').format(original_entry.narration),
                is_manual=False,
                created_by=user if user else original_entry.created_by,
            )

            # Créer les lignes d'extourne (inverser débit et crédit)
            for line in original_entry.lines.all():
                JournalEntryLine.objects.create(
                    entry_id=reversal_entry,
                    account_id=line.account_id,
                    name=_('Extourne de {}').format(line.name),
                    partner_id=line.partner_id,
                    debit=line.credit,  # Inverser débit et crédit
                    credit=line.debit,  # Inverser débit et crédit
                    currency_id=line.currency_id,
                    amount_currency=-line.amount_currency
                    if line.amount_currency
                    else 0,  # Inverser le montant en devise
                    ref=line.ref,
                    analytic_account_id=line.analytic_account_id,
                    tax_line_id=line.tax_line_id,
                    tax_base_amount=line.tax_base_amount,
                )

            # Valider l'écriture d'extourne
            reversal_entry.post()

            return reversal_entry

    @staticmethod
    def create_invoice_entry(invoice, user=None):
        """
        Crée une écriture comptable pour une facture client.
        Résolution des comptes via AccountResolver (indépendant du pack comptable).
        Gère les factures standard, acomptes et avoirs.
        """
        from accounting.services.account_resolver import AccountResolver

        # Vérifier qu'aucune écriture n'existe déjà
        existing = JournalEntry.objects.filter(
            source_module='sales',
            source_model='Invoice',
            source_id=invoice.id,
        ).first()
        if existing:
            return existing

        # Résolution des comptes via AccountResolver
        client_code = AccountResolver.get_code('client_receivable')
        revenue_code = AccountResolver.get_code('sales_revenue')
        vat_code = AccountResolver.get_code('vat_collected')

        is_credit_note = getattr(invoice, 'type', 'standard') == 'credit_note'

        subtotal = abs(invoice.subtotal)
        tax_amount = abs(invoice.tax_amount) if invoice.tax_amount else Decimal('0')
        total = abs(invoice.total)
        is_tax_exempt = getattr(invoice, 'is_tax_exempt', False)

        # Nom du client
        client_name = invoice.company.name if invoice.company else ''
        ref = invoice.number or ''
        prefix = 'Avoir' if is_credit_note else 'Facture'
        narration = f'{prefix} {ref} — {client_name}'

        lines = []

        if is_credit_note:
            # Avoir: Débit 701 + TVA, Crédit 411
            if subtotal > 0:
                lines.append(
                    {
                        'account_code': revenue_code,
                        'name': f'{prefix} {ref}',
                        'debit': subtotal,
                        'credit': 0,
                    }
                )
            if tax_amount > 0 and not is_tax_exempt:
                lines.append(
                    {
                        'account_code': vat_code,
                        'name': f'TVA {prefix.lower()} {ref}',
                        'debit': tax_amount,
                        'credit': 0,
                    }
                )
            lines.append(
                {
                    'account_code': client_code,
                    'name': f'{prefix} {ref}',
                    'debit': 0,
                    'credit': total,
                }
            )
        else:
            # Facture standard/acompte: Débit 411, Crédit 701 + TVA
            lines.append(
                {
                    'account_code': client_code,
                    'name': f'{prefix} {ref}',
                    'debit': total,
                    'credit': 0,
                    'date_maturity': getattr(invoice, 'due_date', None),
                }
            )
            if subtotal > 0:
                lines.append(
                    {
                        'account_code': revenue_code,
                        'name': f'{prefix} {ref}',
                        'debit': 0,
                        'credit': subtotal,
                    }
                )
            if tax_amount > 0 and not is_tax_exempt:
                lines.append(
                    {
                        'account_code': vat_code,
                        'name': f'TVA {prefix.lower()} {ref}',
                        'debit': 0,
                        'credit': tax_amount,
                    }
                )

        entry = JournalEntryService.create_entry(
            journal_code='VEN',
            entry_date=invoice.date,
            narration=narration,
            lines=lines,
            ref=ref,
            is_manual=False,
            user=user,
            source_info={
                'module': 'sales',
                'model': 'Invoice',
                'id': invoice.id,
            },
        )

        entry.post()
        return entry

    @staticmethod
    def create_payment_entry(payment, user=None):
        """
        Crée une écriture comptable pour un paiement client.
        Résolution des comptes via AccountResolver (indépendant du pack comptable).
        """
        from accounting.services.account_resolver import AccountResolver

        # Vérifier qu'aucune écriture n'existe déjà
        existing = JournalEntry.objects.filter(
            source_module='sales',
            source_model='Payment',
            source_id=payment.id,
        ).first()
        if existing:
            return existing

        # Journal banque ou caisse selon le mode de paiement
        method = getattr(payment, 'method', 'bank_transfer')
        if method == 'cash':
            journal_code = 'CSH'
            bank_code = AccountResolver.get_code('cash')
        else:
            journal_code = 'BNK'
            bank_code = AccountResolver.get_code('bank')

        # Compte client via AccountResolver
        client_code = AccountResolver.get_code('client_receivable')

        invoice = payment.invoice
        client_name = invoice.company.name if invoice and invoice.company else ''
        ref = payment.reference or ''
        narration = f'Paiement client {ref} — {client_name}'
        amount = abs(payment.amount)

        lines = [
            {
                'account_code': bank_code,
                'name': f'Paiement {ref}',
                'debit': amount,
                'credit': 0,
            },
            {
                'account_code': client_code,
                'name': f'Paiement {ref}',
                'debit': 0,
                'credit': amount,
            },
        ]

        entry = JournalEntryService.create_entry(
            journal_code=journal_code,
            entry_date=payment.date,
            narration=narration,
            lines=lines,
            ref=ref,
            is_manual=False,
            user=user,
            source_info={
                'module': 'sales',
                'model': 'Payment',
                'id': payment.id,
            },
        )

        entry.post()
        return entry

    @staticmethod
    def create_payroll_entry(payroll_run, user=None):
        """
        Crée une écriture comptable pour un lancement de paie.
        Résolution des comptes via AccountResolver (indépendant du pack comptable).

        Schéma comptable :
            Débit  : salary_expense (brut) + social_charges_expense (patronales)
            Crédit : salary_payable (net) + social_charges_payable (cotisations + IR)
        """
        from accounting.services.account_resolver import AccountResolver

        # Protection anti-doublon
        existing = JournalEntry.objects.filter(
            source_module='payroll',
            source_model='PayrollRun',
            source_id=payroll_run.id,
        ).first()
        if existing:
            return existing

        # Vérifier que le lancement est dans un état valide
        if payroll_run.status not in ['calculated', 'validated', 'paid']:
            raise ValueError(
                _(
                    'Seuls les lancements calculés, validés ou payés peuvent être comptabilisés'
                )
            )

        # Date de l'écriture = fin de période
        entry_date = payroll_run.period.end_date

        # Libellé et référence
        period_name = (
            payroll_run.period.name
            if payroll_run.period
            else entry_date.strftime('%m/%Y')
        )
        narration = f'Salaires {period_name}'
        ref = f'PAIE-{payroll_run.id}'

        # Agréger les montants depuis les bulletins calculés
        total_gross = Decimal(0)
        total_employer = Decimal(0)
        total_employee = Decimal(0)
        total_ir = Decimal(0)
        total_net = Decimal(0)

        payslips = payroll_run.payslips.exclude(status='draft')
        if not payslips.exists():
            raise ValueError(_('Aucun bulletin calculé dans ce lancement'))

        for payslip in payslips:
            total_gross += payslip.gross_salary or Decimal(0)
            total_employer += (payslip.cnss_employer or Decimal(0)) + (
                payslip.amo_employer or Decimal(0)
            )
            total_employee += (payslip.cnss_employee or Decimal(0)) + (
                payslip.amo_employee or Decimal(0)
            )
            total_ir += payslip.income_tax or Decimal(0)
            total_net += payslip.net_salary or Decimal(0)

        if total_gross <= 0:
            raise ValueError(
                _('Le salaire brut total est nul — vérifiez les bulletins')
            )

        # Résolution dynamique des comptes
        salary_code = AccountResolver.get_code('salary_expense')
        charges_code = AccountResolver.get_code('social_charges_expense')
        dues_code = AccountResolver.get_code('salary_payable')
        social_code = AccountResolver.get_code('social_charges_payable')

        # Lignes d'écriture
        # Débit : brut + charges patronales
        # Crédit : net à payer + cotisations sociales (salariales + patronales) + IR
        lines = [
            {
                'account_code': salary_code,
                'name': f'Salaires bruts {period_name}',
                'debit': total_gross,
                'credit': 0,
            },
            {
                'account_code': charges_code,
                'name': f'Charges patronales {period_name}',
                'debit': total_employer,
                'credit': 0,
            },
            {
                'account_code': dues_code,
                'name': f'Net à payer {period_name}',
                'debit': 0,
                'credit': total_net,
            },
            {
                'account_code': social_code,
                'name': f'Cotisations et IR à payer {period_name}',
                'debit': 0,
                'credit': total_employer + total_employee + total_ir,
            },
        ]

        # Déterminer le user auth.User pour l'écriture
        entry_user = user
        if not entry_user and payroll_run.validated_by:
            entry_user = getattr(payroll_run.validated_by, 'user', None)
        if not entry_user and payroll_run.created_by:
            entry_user = getattr(payroll_run.created_by, 'user', None)

        entry = JournalEntryService.create_entry(
            journal_code='SAL',
            entry_date=entry_date,
            narration=narration,
            lines=lines,
            ref=ref,
            is_manual=False,
            user=entry_user,
            source_info={
                'module': 'payroll',
                'model': 'PayrollRun',
                'id': payroll_run.id,
            },
        )

        entry.post()
        return entry

    @staticmethod
    def create_supplier_invoice_entry(supplier_invoice, user=None):
        """
        Crée une écriture comptable pour une facture fournisseur.
        Résolution des comptes via AccountResolver (indépendant du pack comptable).
        """
        from accounting.services.account_resolver import AccountResolver

        # Vérifier qu'aucune écriture n'existe déjà
        existing = JournalEntry.objects.filter(
            source_module='purchasing',
            source_model='SupplierInvoice',
            source_id=supplier_invoice.id,
        ).first()
        if existing:
            return existing

        # Résolution des comptes via AccountResolver
        purchase_code = AccountResolver.get_code('purchase_expense')
        supplier_code = AccountResolver.get_code('supplier_payable')
        vat_code = AccountResolver.get_code('vat_deductible')

        is_credit_note = getattr(supplier_invoice, 'type', 'standard') == 'credit_note'

        subtotal = abs(supplier_invoice.subtotal)
        tax_amount = (
            abs(supplier_invoice.tax_amount)
            if supplier_invoice.tax_amount
            else Decimal('0')
        )
        total = abs(supplier_invoice.total)

        ref = supplier_invoice.number or ''
        supplier_name = (
            supplier_invoice.supplier.name if supplier_invoice.supplier else ''
        )
        prefix = 'Avoir' if is_credit_note else 'Facture'
        narration = f'{prefix} fournisseur {ref} — {supplier_name}'

        lines = []

        if is_credit_note:
            # Avoir: Débit 401, Crédit 601 + TVA
            lines.append(
                {
                    'account_code': supplier_code,
                    'name': f'{prefix} {ref}',
                    'debit': total,
                    'credit': 0,
                }
            )
            if subtotal > 0:
                lines.append(
                    {
                        'account_code': purchase_code,
                        'name': f'{prefix} {ref}',
                        'debit': 0,
                        'credit': subtotal,
                    }
                )
            if tax_amount > 0:
                lines.append(
                    {
                        'account_code': vat_code,
                        'name': f'TVA {prefix.lower()} {ref}',
                        'debit': 0,
                        'credit': tax_amount,
                    }
                )
        else:
            # Facture: Débit 601 + TVA, Crédit 401
            if subtotal > 0:
                lines.append(
                    {
                        'account_code': purchase_code,
                        'name': f'{prefix} {ref}',
                        'debit': subtotal,
                        'credit': 0,
                    }
                )
            if tax_amount > 0:
                lines.append(
                    {
                        'account_code': vat_code,
                        'name': f'TVA {prefix.lower()} {ref}',
                        'debit': tax_amount,
                        'credit': 0,
                    }
                )
            lines.append(
                {
                    'account_code': supplier_code,
                    'name': f'{prefix} {ref}',
                    'debit': 0,
                    'credit': total,
                    'date_maturity': getattr(supplier_invoice, 'due_date', None),
                }
            )

        entry = JournalEntryService.create_entry(
            journal_code='ACH',
            entry_date=supplier_invoice.date,
            narration=narration,
            lines=lines,
            ref=ref,
            is_manual=False,
            user=user,
            source_info={
                'module': 'purchasing',
                'model': 'SupplierInvoice',
                'id': supplier_invoice.id,
            },
        )

        entry.post()
        return entry

    @staticmethod
    def create_expense_entry(expense_report, user=None):
        """
        Crée une écriture comptable pour une note de frais approuvée Finance.
        Résolution des comptes via AccountResolver (indépendant du pack comptable).

        Schéma comptable :
            Débit  : purchase_expense (charges)
            Crédit : employee_expense_payable (dette envers l'employé)
        """
        from accounting.services.account_resolver import AccountResolver

        # Protection anti-doublon
        existing = JournalEntry.objects.filter(
            source_module='hr',
            source_model='ExpenseReport',
            source_id=expense_report.id,
        ).first()
        if existing:
            return existing

        total = expense_report.total_amount
        if total <= 0:
            raise ValueError(
                _('Le montant total de la note de frais est nul ou négatif')
            )

        # Résolution dynamique des comptes
        expense_code = AccountResolver.get_code('purchase_expense')
        payable_code = AccountResolver.get_code('employee_expense_payable')

        # Date et libellés
        entry_date = expense_report.updated_at.date()
        employee_name = expense_report.employee.full_name
        ref = f'NDF-{expense_report.id:04d}'
        narration = f'Note de frais — {employee_name} — {expense_report.period_month}'

        lines = [
            {
                'account_code': expense_code,
                'name': f'Frais {expense_report.title} — {employee_name}',
                'debit': total,
                'credit': Decimal('0'),
            },
            {
                'account_code': payable_code,
                'name': f'À rembourser — {employee_name}',
                'debit': Decimal('0'),
                'credit': total,
            },
        ]

        entry = JournalEntryService.create_entry(
            journal_code='OD',
            entry_date=entry_date,
            narration=narration,
            lines=lines,
            ref=ref,
            is_manual=False,
            user=user,
            source_info={
                'module': 'hr',
                'model': 'ExpenseReport',
                'id': expense_report.id,
            },
        )

        entry.post()
        return entry

    @staticmethod
    def create_supplier_payment_entry(supplier_payment, user=None):
        """
        Crée une écriture comptable pour un paiement fournisseur.
        Résolution des comptes via AccountResolver (indépendant du pack comptable).
        """
        from accounting.services.account_resolver import AccountResolver

        # Vérifier qu'aucune écriture n'existe déjà
        existing = JournalEntry.objects.filter(
            source_module='purchasing',
            source_model='SupplierPayment',
            source_id=supplier_payment.id,
        ).first()
        if existing:
            return existing

        # Journal banque ou caisse selon le mode de paiement
        method = getattr(supplier_payment, 'method', 'bank_transfer')
        if method == 'cash':
            journal_code = 'CSH'
            bank_code = AccountResolver.get_code('cash')
        else:
            journal_code = 'BNK'
            bank_code = AccountResolver.get_code('bank')

        # Compte fournisseur via AccountResolver
        supplier_code = AccountResolver.get_code('supplier_payable')

        invoice = supplier_payment.invoice
        ref = supplier_payment.reference or ''
        supplier_name = invoice.supplier.name if invoice and invoice.supplier else ''
        narration = f'Paiement fournisseur {ref} — {supplier_name}'
        amount = abs(supplier_payment.amount)

        lines = [
            {
                'account_code': supplier_code,
                'name': f'Paiement {ref}',
                'debit': amount,
                'credit': 0,
            },
            {
                'account_code': bank_code,
                'name': f'Paiement {ref}',
                'debit': 0,
                'credit': amount,
            },
        ]

        entry = JournalEntryService.create_entry(
            journal_code=journal_code,
            entry_date=supplier_payment.date,
            narration=narration,
            lines=lines,
            ref=ref,
            is_manual=False,
            user=user,
            source_info={
                'module': 'purchasing',
                'model': 'SupplierPayment',
                'id': supplier_payment.id,
            },
        )

        entry.post()
        return entry
