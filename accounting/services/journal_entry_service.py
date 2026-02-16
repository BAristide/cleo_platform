from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django.db import transaction
from decimal import Decimal
from datetime import datetime, date

from ..models import (
    Journal, Account, JournalEntry, JournalEntryLine, FiscalPeriod
)

class JournalEntryService:
    """Service pour la gestion des écritures comptables."""
    
    @staticmethod
    def create_entry(journal_code, entry_date, narration, lines, ref='', is_manual=True, user=None, source_info=None):
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
            raise ValueError(_("Le code du journal est requis"))
        
        if not isinstance(entry_date, date):
            raise ValueError(_("La date doit être un objet date"))
        
        if not lines or not isinstance(lines, list) or len(lines) < 2:
            raise ValueError(_("Au moins deux lignes sont requises pour créer une écriture"))
        
        # Récupérer le journal
        try:
            journal = Journal.objects.get(code=journal_code)
        except Journal.DoesNotExist:
            raise ValueError(_("Journal non trouvé: {}").format(journal_code))
        
        # Déterminer la période fiscale
        try:
            period = FiscalPeriod.objects.get(
                start_date__lte=entry_date,
                end_date__gte=entry_date,
                state='open'
            )
        except FiscalPeriod.DoesNotExist:
            raise ValueError(_("Aucune période fiscale ouverte pour cette date: {}").format(entry_date))
        
        # Vérifier l'équilibre des lignes
        total_debit = sum(line.get('debit', 0) for line in lines)
        total_credit = sum(line.get('credit', 0) for line in lines)
        
        if round(total_debit, 2) != round(total_credit, 2):
            raise ValueError(_("L'écriture n'est pas équilibrée: débit={}, crédit={}").format(total_debit, total_credit))
        
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
                created_by=user
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
                        raise ValueError(_("Compte non trouvé: {}").format(account_code))
                elif account_id:
                    try:
                        account = Account.objects.get(id=account_id)
                    except Account.DoesNotExist:
                        raise ValueError(_("Compte non trouvé: ID={}").format(account_id))
                else:
                    raise ValueError(_("Le code ou l'ID du compte est requis pour la ligne {}").format(i+1))
                
                # Récupérer les valeurs de débit/crédit
                debit = Decimal(line_data.get('debit', 0))
                credit = Decimal(line_data.get('credit', 0))
                
                # Validation basique
                if debit < 0 or credit < 0:
                    raise ValueError(_("Les montants débit/crédit doivent être positifs"))
                
                if debit > 0 and credit > 0:
                    raise ValueError(_("Une ligne ne peut pas avoir à la fois un débit et un crédit"))
                
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
                    tax_base_amount=line_data.get('tax_base_amount', 0)
                )
            
            return entry

    @staticmethod
    def create_simple_entry(journal_code, entry_date, narration, debit_lines, credit_lines, ref='', is_manual=True, user=None, source_info=None):
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
            raise ValueError(_("Les lignes de débit et de crédit sont requises"))
        
        # Calculer les totaux
        total_debit = sum(Decimal(line.get('amount', 0)) for line in debit_lines)
        total_credit = sum(Decimal(line.get('amount', 0)) for line in credit_lines)
        
        # Vérifier l'équilibre
        if round(total_debit, 2) != round(total_credit, 2):
            raise ValueError(_("L'écriture n'est pas équilibrée: débit={}, crédit={}").format(total_debit, total_credit))
        
        # Préparer les lignes
        lines = []
        
        # Lignes de débit
        for debit_line in debit_lines:
            lines.append({
                'account_code': debit_line.get('account_code'),
                'account_id': debit_line.get('account_id'),
                'name': debit_line.get('name', narration),
                'debit': debit_line.get('amount', 0),
                'credit': 0,
                'partner_id': debit_line.get('partner_id'),
                'date_maturity': debit_line.get('date_maturity'),
                'ref': debit_line.get('ref', ref),
                'analytic_account_id': debit_line.get('analytic_account_id')
            })
        
        # Lignes de crédit
        for credit_line in credit_lines:
            lines.append({
                'account_code': credit_line.get('account_code'),
                'account_id': credit_line.get('account_id'),
                'name': credit_line.get('name', narration),
                'debit': 0,
                'credit': credit_line.get('amount', 0),
                'partner_id': credit_line.get('partner_id'),
                'date_maturity': credit_line.get('date_maturity'),
                'ref': credit_line.get('ref', ref),
                'analytic_account_id': credit_line.get('analytic_account_id')
            })
        
        # Créer l'écriture
        return JournalEntryService.create_entry(
            journal_code=journal_code,
            entry_date=entry_date,
            narration=narration,
            lines=lines,
            ref=ref,
            is_manual=is_manual,
            user=user,
            source_info=source_info
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
            raise ValueError(_("Écriture non trouvée: ID={}").format(entry_id))
        
        # Déterminer la date de la nouvelle écriture
        if not new_date:
            new_date = timezone.now().date()
        
        # Déterminer la référence de la nouvelle écriture
        if new_ref is None:
            new_ref = original_entry.ref
        
        # Déterminer la période fiscale pour la nouvelle date
        try:
            period = FiscalPeriod.objects.get(
                start_date__lte=new_date,
                end_date__gte=new_date,
                state='open'
            )
        except FiscalPeriod.DoesNotExist:
            raise ValueError(_("Aucune période fiscale ouverte pour cette date: {}").format(new_date))
        
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
                created_by=user if user else original_entry.created_by
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
                    tax_base_amount=line.tax_base_amount
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
            raise ValueError(_("Écriture non trouvée: ID={}").format(entry_id))
        
        # Vérifier que l'écriture est validée
        if original_entry.state != 'posted':
            raise ValueError(_("Seules les écritures validées peuvent être extournées"))
        
        # Déterminer la date de l'extourne
        if not reversal_date:
            reversal_date = timezone.now().date()
        
        # Déterminer la référence de l'extourne
        if reversal_ref is None:
            reversal_ref = _("Extourne de {}").format(original_entry.ref or original_entry.name)
        
        # Déterminer la période fiscale pour la date d'extourne
        try:
            period = FiscalPeriod.objects.get(
                start_date__lte=reversal_date,
                end_date__gte=reversal_date,
                state='open'
            )
        except FiscalPeriod.DoesNotExist:
            raise ValueError(_("Aucune période fiscale ouverte pour cette date: {}").format(reversal_date))
        
        # Créer l'écriture d'extourne
        with transaction.atomic():
            reversal_entry = JournalEntry.objects.create(
                journal_id=original_entry.journal_id,
                name=original_entry.journal_id.next_sequence(reversal_date),
                date=reversal_date,
                period_id=period,
                ref=reversal_ref,
                narration=_("Extourne de {}").format(original_entry.narration),
                is_manual=False,
                created_by=user if user else original_entry.created_by
            )
            
            # Créer les lignes d'extourne (inverser débit et crédit)
            for line in original_entry.lines.all():
                JournalEntryLine.objects.create(
                    entry_id=reversal_entry,
                    account_id=line.account_id,
                    name=_("Extourne de {}").format(line.name),
                    partner_id=line.partner_id,
                    debit=line.credit,  # Inverser débit et crédit
                    credit=line.debit,  # Inverser débit et crédit
                    currency_id=line.currency_id,
                    amount_currency=-line.amount_currency if line.amount_currency else 0,  # Inverser le montant en devise
                    ref=line.ref,
                    analytic_account_id=line.analytic_account_id,
                    tax_line_id=line.tax_line_id,
                    tax_base_amount=line.tax_base_amount
                )
            
            # Valider l'écriture d'extourne
            reversal_entry.post()
            
            return reversal_entry
    
    @staticmethod
    def create_invoice_entry(invoice):
        """
        Crée une écriture comptable pour une facture.
        Méthode de convenance pour les intégrations avec le module Sales.
        
        Args:
            invoice: Objet facture du module Sales
            
        Returns:
            JournalEntry: L'écriture créée
            
        Raises:
            ValueError: Si des données sont invalides ou manquantes
            Exception: Si une erreur se produit lors de la création
        """
        # Vérifier que la facture est valide
        if not hasattr(invoice, 'state') or invoice.state != 'validated':
            raise ValueError(_("Seules les factures validées peuvent être comptabilisées"))
        
        # Préparer les données de base
        journal_code = 'VEN'  # Journal des ventes
        entry_date = invoice.date
        narration = _("Facture {} - {}").format(invoice.number, invoice.customer.name if hasattr(invoice, 'customer') and invoice.customer else '')
        ref = invoice.number
        
        # Informations de source
        source_info = {
            'module': 'sales',
            'model': 'Invoice',
            'id': invoice.id
        }
        
        # Préparer les lignes
        lines = []
        
        # 1. Ligne client (débit)
        lines.append({
            'account_code': '411000',  # Compte client
            'name': _("Facture {}").format(invoice.number),
            'partner_id': invoice.customer.id if hasattr(invoice, 'customer') and invoice.customer else None,
            'debit': invoice.total_amount,
            'credit': 0,
            'date_maturity': invoice.due_date if hasattr(invoice, 'due_date') else None
        })
        
        # 2. Ligne produit (crédit)
        lines.append({
            'account_code': '701000',  # Ventes de produits
            'name': _("Facture {}").format(invoice.number),
            'partner_id': invoice.customer.id if hasattr(invoice, 'customer') and invoice.customer else None,
            'debit': 0,
            'credit': invoice.total_untaxed if hasattr(invoice, 'total_untaxed') else invoice.total_amount
        })
        
        # 3. Ligne TVA (crédit) - uniquement si non exonéré
        is_tax_exempt = hasattr(invoice, 'is_tax_exempt') and invoice.is_tax_exempt
        has_tax = hasattr(invoice, 'total_tax') and invoice.total_tax > 0
        
        if has_tax and not is_tax_exempt:
            lines.append({
                'account_code': '445500',  # TVA collectée
                'name': _("TVA sur facture {}").format(invoice.number),
                'partner_id': invoice.customer.id if hasattr(invoice, 'customer') and invoice.customer else None,
                'debit': 0,
                'credit': invoice.total_tax
            })
        
        # Créer l'écriture
        try:
            entry = JournalEntryService.create_entry(
                journal_code=journal_code,
                entry_date=entry_date,
                narration=narration,
                lines=lines,
                ref=ref,
                is_manual=False,
                user=invoice.created_by if hasattr(invoice, 'created_by') else None,
                source_info=source_info
            )
            
            # Valider l'écriture
            entry.post()
            
            return entry
        except Exception as e:
            # Propager l'erreur pour permettre à l'appelant de la gérer
            raise ValueError(_("Erreur lors de la création de l'écriture comptable: {}").format(str(e)))
    
    @staticmethod
    def create_payment_entry(payment):
        """
        Crée une écriture comptable pour un paiement.
        Méthode de convenance pour les intégrations avec le module Sales.
        
        Args:
            payment: Objet paiement du module Sales
            
        Returns:
            JournalEntry: L'écriture créée
            
        Raises:
            ValueError: Si des données sont invalides ou manquantes
            Exception: Si une erreur se produit lors de la création
        """
        # Vérifier que le paiement est valide
        if not hasattr(payment, 'state') or payment.state != 'validated':
            raise ValueError(_("Seuls les paiements validés peuvent être comptabilisés"))
        
        # Déterminer le journal et le compte selon le mode de paiement
        if hasattr(payment, 'payment_method'):
            if payment.payment_method in ['bank_transfer', 'check', 'credit_card']:
                journal_code = 'BNK'  # Journal de banque
                bank_account_code = '514000'  # Compte bancaire
            else:
                journal_code = 'CSH'  # Journal de caisse
                bank_account_code = '516000'  # Compte caisse
        else:
            # Par défaut, on utilise le journal de banque
            journal_code = 'BNK'
            bank_account_code = '514000'
        
        # Préparer les données de base
        entry_date = payment.date
        narration = _("Paiement {} - {}").format(
            payment.reference if hasattr(payment, 'reference') else '',
            payment.customer.name if hasattr(payment, 'customer') and payment.customer else ''
        )
        ref = payment.reference if hasattr(payment, 'reference') else ''
        
        # Informations de source
        source_info = {
            'module': 'sales',
            'model': 'Payment',
            'id': payment.id
        }
        
        # Préparer les lignes
        debit_lines = [{
            'account_code': bank_account_code,
            'name': _("Paiement {}").format(payment.reference if hasattr(payment, 'reference') else ''),
            'partner_id': payment.customer.id if hasattr(payment, 'customer') and payment.customer else None,
            'amount': payment.amount
        }]
        
        credit_lines = [{
            'account_code': '411000',  # Compte client
            'name': _("Paiement {}").format(payment.reference if hasattr(payment, 'reference') else ''),
            'partner_id': payment.customer.id if hasattr(payment, 'customer') and payment.customer else None,
            'amount': payment.amount
        }]
        
        # Créer l'écriture
        try:
            entry = JournalEntryService.create_simple_entry(
                journal_code=journal_code,
                entry_date=entry_date,
                narration=narration,
                debit_lines=debit_lines,
                credit_lines=credit_lines,
                ref=ref,
                is_manual=False,
                user=payment.created_by if hasattr(payment, 'created_by') else None,
                source_info=source_info
            )
            
            # Valider l'écriture
            entry.post()
            
            return entry
        except Exception as e:
            # Propager l'erreur pour permettre à l'appelant de la gérer
            raise ValueError(_("Erreur lors de la création de l'écriture comptable: {}").format(str(e)))
    
    @staticmethod
    def create_payroll_entry(payroll_run):
        """
        Crée une écriture comptable pour un lancement de paie.
        Méthode de convenance pour les intégrations avec le module Payroll.
        
        Args:
            payroll_run: Objet lancement de paie du module Payroll
            
        Returns:
            JournalEntry: L'écriture créée
            
        Raises:
            ValueError: Si des données sont invalides ou manquantes
            Exception: Si une erreur se produit lors de la création
        """
        # Vérifier que le lancement de paie est valide
        if not hasattr(payroll_run, 'state') or payroll_run.state not in ['calculated', 'validated', 'paid']:
            raise ValueError(_("Seuls les lancements de paie validés peuvent être comptabilisés"))
        
        # Préparer les données de base
        journal_code = 'SAL'  # Journal des salaires
        
        # Déterminer la date de l'écriture (date de fin de période)
        if hasattr(payroll_run, 'period') and hasattr(payroll_run.period, 'end_date'):
            entry_date = payroll_run.period.end_date
        else:
            entry_date = payroll_run.date if hasattr(payroll_run, 'date') else timezone.now().date()
        
        # Libellé de l'écriture
        period_name = payroll_run.period.name if hasattr(payroll_run, 'period') and payroll_run.period else entry_date.strftime('%m/%Y')
        narration = _("Salaires {}").format(period_name)
        
        # Référence de l'écriture
        ref = _("PAIE-{}").format(payroll_run.id)
        
        # Informations de source
        source_info = {
            'module': 'payroll',
            'model': 'PayrollRun',
            'id': payroll_run.id
        }
        
        # Récupérer les montants totaux
        total_gross = Decimal(0)
        total_employer = Decimal(0)
        total_employee = Decimal(0)
        total_net = Decimal(0)
        
        # Si l'objet a des bulletins associés
        if hasattr(payroll_run, 'payslips'):
            for payslip in payroll_run.payslips.all():
                total_gross += payslip.gross_salary if hasattr(payslip, 'gross_salary') else Decimal(0)
                total_employer += payslip.employer_contribution if hasattr(payslip, 'employer_contribution') else Decimal(0)
                total_employee += payslip.employee_contribution if hasattr(payslip, 'employee_contribution') else Decimal(0)
                total_net += payslip.net_salary if hasattr(payslip, 'net_salary') else Decimal(0)
        else:
            # Utiliser les montants globaux du lancement
            total_gross = payroll_run.total_gross if hasattr(payroll_run, 'total_gross') else Decimal(0)
            total_employer = payroll_run.total_employer_contribution if hasattr(payroll_run, 'total_employer_contribution') else Decimal(0)
            total_employee = payroll_run.total_employee_contribution if hasattr(payroll_run, 'total_employee_contribution') else Decimal(0)
            total_net = payroll_run.total_net if hasattr(payroll_run, 'total_net') else Decimal(0)
        
        # Vérifier que les montants sont cohérents
        if total_gross <= 0 or total_net <= 0:
            raise ValueError(_("Les montants de paie sont invalides ou manquants"))
        
        # Préparer les lignes
        lines = []
        
        # 1. Salaires bruts (débit)
        lines.append({
            'account_code': '641000',  # Salaires
            'name': _("Salaires bruts"),
            'debit': total_gross,
            'credit': 0
        })
        
        # 2. Charges patronales (débit)
        lines.append({
            'account_code': '645000',  # Charges sociales
            'name': _("Charges sociales patronales"),
            'debit': total_employer,
            'credit': 0
        })
        
        # 3. Salaires nets à payer (crédit)
        lines.append({
            'account_code': '421000',  # Salaires à payer
            'name': _("Salaires nets à payer"),
            'debit': 0,
            'credit': total_net
        })
        
        # 4. Charges sociales à payer (crédit)
        lines.append({
            'account_code': '431000',  # Organismes sociaux
            'name': _("Charges sociales à payer"),
            'debit': 0,
            'credit': total_employer + total_employee
        })
        
        # Créer l'écriture
        try:
            entry = JournalEntryService.create_entry(
                journal_code=journal_code,
                entry_date=entry_date,
                narration=narration,
                lines=lines,
                ref=ref,
                is_manual=False,
                user=payroll_run.created_by if hasattr(payroll_run, 'created_by') else None,
                source_info=source_info
            )
            
            # Valider l'écriture
            entry.post()
            
            return entry
        except Exception as e:
            # Propager l'erreur pour permettre à l'appelant de la gérer
            raise ValueError(_("Erreur lors de la création de l'écriture comptable: {}").format(str(e)))
