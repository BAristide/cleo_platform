from django.db.models import Sum, F, Q
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from decimal import Decimal
from datetime import datetime, date, timedelta

from ..models import (
    Account, JournalEntry, JournalEntryLine, FiscalPeriod
)

class FinancialReportService:
    """Service de génération des états financiers."""

    @staticmethod
    def get_account_balance(account_id, start_date=None, end_date=None, sign=1):
        """Calcule le solde d'un compte pour une période donnée."""
        from ..models import Account, JournalEntryLine
        
        # Récupérer le compte
        try:
            account = Account.objects.get(id=account_id)
        except Account.DoesNotExist:
            return Decimal('0.0')

        # Filtre de base: écritures validées
        query = JournalEntryLine.objects.filter(
            account_id=account,
            entry_id__state='posted'
        )

        # Filtrer par date
        if start_date:
            query = query.filter(entry_id__date__gte=start_date)
        if end_date:
            query = query.filter(entry_id__date__lte=end_date)

        # Calculer les totaux
        debit_sum = query.aggregate(sum=Sum('debit'))['sum'] or Decimal('0.0')
        credit_sum = query.aggregate(sum=Sum('credit'))['sum'] or Decimal('0.0')

        # Calculer le solde
        balance = debit_sum - credit_sum

        # Ajuster le signe selon le type de compte
        if not account.type_id.is_debit:
            balance = -balance

        # Appliquer le signe supplémentaire si nécessaire
        return balance * sign

    @staticmethod
    def generate_general_ledger(start_date=None, end_date=None, account_ids=None):
        """Génère le grand livre pour une période et un ensemble de comptes."""
        from ..models import Account, JournalEntryLine

        # Si pas de dates spécifiées, utiliser l'année en cours
        if not start_date or not end_date:
            now = timezone.now().date()
            start_date = date(now.year, 1, 1)
            end_date = date(now.year, 12, 31)

        # Si pas de comptes spécifiés, utiliser tous les comptes
        if not account_ids:
            accounts = Account.objects.filter(is_active=True).order_by('code')
        else:
            accounts = Account.objects.filter(id__in=account_ids, is_active=True).order_by('code')

        # Récupérer les écritures pour chaque compte
        ledger = []
        for account in accounts:
            # Solde initial
            initial_balance = FinancialReportService.get_account_balance(
                account.id, 
                end_date=start_date - timedelta(days=1)
            )
            
            # Écritures de la période
            lines = JournalEntryLine.objects.filter(
                account_id=account,
                entry_id__date__gte=start_date,
                entry_id__date__lte=end_date,
                entry_id__state='posted'
            ).order_by('entry_id__date', 'entry_id__id')
            
            # Calculer le solde cumulé
            cumulative_balance = initial_balance
            entries = []
            
            for line in lines:
                cumulative_balance += line.debit - line.credit
                entries.append({
                    'date': line.entry_id.date,
                    'journal': line.entry_id.journal_id.code,
                    'entry': line.entry_id.name,
                    'reference': line.entry_id.ref,
                    'partner': line.partner_id.name if line.partner_id else '',
                    'label': line.name,
                    'debit': float(line.debit),
                    'credit': float(line.credit),
                    'balance': float(cumulative_balance)
                })
            
            if initial_balance != 0 or entries:
                ledger.append({
                    'account': {
                        'id': account.id,
                        'code': account.code,
                        'name': account.name,
                        'type': account.type_id.name if account.type_id else ''
                    },
                    'initial_balance': float(initial_balance),
                    'entries': entries,
                    'final_balance': float(cumulative_balance)
                })
        
        return {
            'start_date': start_date,
            'end_date': end_date,
            'ledger': ledger
        }

    @staticmethod
    def generate_trial_balance(date=None, period_id=None):
        """Génère la balance des comptes à une date donnée."""
        from ..models import Account, JournalEntryLine, FiscalPeriod

        if not date:
            if period_id:
                try:
                    period = FiscalPeriod.objects.get(id=period_id)
                    date = period.end_date
                except FiscalPeriod.DoesNotExist:
                    date = timezone.now().date()
            else:
                date = timezone.now().date()
        
        # Récupérer tous les comptes actifs
        accounts = Account.objects.filter(is_active=True).order_by('code')
        
        # Calculer les soldes
        balance = []
        for account in accounts:
            # Solde débiteur et créditeur
            debit_sum = JournalEntryLine.objects.filter(
                account_id=account,
                entry_id__date__lte=date,
                entry_id__state='posted'
            ).aggregate(sum=Sum('debit'))['sum'] or Decimal('0.0')
            
            credit_sum = JournalEntryLine.objects.filter(
                account_id=account,
                entry_id__date__lte=date,
                entry_id__state='posted'
            ).aggregate(sum=Sum('credit'))['sum'] or Decimal('0.0')
            
            # Solde
            balance_amount = debit_sum - credit_sum
            
            # Formatage du solde
            if balance_amount > 0:
                debit_balance = balance_amount
                credit_balance = Decimal('0.0')
            else:
                debit_balance = Decimal('0.0')
                credit_balance = -balance_amount
            
            if debit_sum > 0 or credit_sum > 0:
                balance.append({
                    'account': {
                        'id': account.id,
                        'code': account.code,
                        'name': account.name,
                        'type': account.type_id.name if account.type_id else ''
                    },
                    'debit_sum': float(debit_sum),
                    'credit_sum': float(credit_sum),
                    'debit_balance': float(debit_balance),
                    'credit_balance': float(credit_balance)
                })
        
        # Calcul des totaux
        total_debit_sum = sum(item['debit_sum'] for item in balance)
        total_credit_sum = sum(item['credit_sum'] for item in balance)
        total_debit_balance = sum(item['debit_balance'] for item in balance)
        total_credit_balance = sum(item['credit_balance'] for item in balance)
        
        return {
            'date': date,
            'balance': balance,
            'total_debit_sum': total_debit_sum,
            'total_credit_sum': total_credit_sum,
            'total_debit_balance': total_debit_balance,
            'total_credit_balance': total_credit_balance
        }

    @staticmethod
    def generate_balance_sheet(date=None, period_id=None):
        """Génère le bilan à une date donnée."""
        from ..models import Account, FiscalPeriod

        if not date:
            if period_id:
                try:
                    period = FiscalPeriod.objects.get(id=period_id)
                    date = period.end_date
                except FiscalPeriod.DoesNotExist:
                    date = timezone.now().date()
            else:
                date = timezone.now().date()
            
        # Récupérer les comptes de bilan (classes 1, 2, 3, 4 et 5)
        asset_accounts = Account.objects.filter(code__regex=r'^[235].*', is_active=True)
        liability_accounts = Account.objects.filter(code__regex=r'^[14].*', is_active=True)
        
        # Calculer les soldes
        assets = []
        for account in asset_accounts:
            balance = FinancialReportService.get_account_balance(account.id, end_date=date)
            if balance != 0:
                assets.append({
                    'account': {
                        'id': account.id,
                        'code': account.code,
                        'name': account.name,
                        'type': account.type_id.name if account.type_id else ''
                    },
                    'balance': float(balance)
                })
        
        liabilities = []
        for account in liability_accounts:
            balance = FinancialReportService.get_account_balance(account.id, end_date=date)
            if balance != 0:
                liabilities.append({
                    'account': {
                        'id': account.id,
                        'code': account.code,
                        'name': account.name,
                        'type': account.type_id.name if account.type_id else ''
                    },
                    'balance': float(balance)
                })
        
        # Calcul des totaux
        total_assets = sum(item['balance'] for item in assets)
        total_liabilities = sum(item['balance'] for item in liabilities)
        
        return {
            'date': date,
            'assets': assets,
            'liabilities': liabilities,
            'total_assets': total_assets,
            'total_liabilities': total_liabilities,
            'difference': total_assets - total_liabilities
        }

    @staticmethod
    def generate_income_statement(start_date=None, end_date=None, period_id=None):
        """Génère le compte de résultat pour une période."""
        from ..models import Account, FiscalPeriod

        if not start_date or not end_date:
            if period_id:
                try:
                    period = FiscalPeriod.objects.get(id=period_id)
                    start_date = period.start_date
                    end_date = period.end_date
                except FiscalPeriod.DoesNotExist:
                    # Période par défaut: l'année en cours
                    now = timezone.now().date()
                    start_date = date(now.year, 1, 1)
                    end_date = date(now.year, 12, 31)
            else:
                # Période par défaut: l'année en cours
                now = timezone.now().date()
                start_date = date(now.year, 1, 1)
                end_date = date(now.year, 12, 31)
        
        # Récupérer les comptes de charges et produits (classes 6 et 7)
        expense_accounts = Account.objects.filter(code__regex=r'^6.*', is_active=True)
        income_accounts = Account.objects.filter(code__regex=r'^7.*', is_active=True)
        
        # Calculer les soldes
        expenses = []
        for account in expense_accounts:
            balance = FinancialReportService.get_account_balance(
                account.id, 
                start_date=start_date, 
                end_date=end_date
            )
            if balance != 0:
                expenses.append({
                    'account': {
                        'id': account.id,
                        'code': account.code,
                        'name': account.name,
                        'type': account.type_id.name if account.type_id else ''
                    },
                    'balance': float(balance)
                })
        
        incomes = []
        for account in income_accounts:
            balance = FinancialReportService.get_account_balance(
                account.id, 
                start_date=start_date, 
                end_date=end_date,
                sign=-1  # Les produits sont créditeurs, on inverse le signe
            )
            if balance != 0:
                incomes.append({
                    'account': {
                        'id': account.id,
                        'code': account.code,
                        'name': account.name,
                        'type': account.type_id.name if account.type_id else ''
                    },
                    'balance': float(balance)
                })
        
        # Calcul des totaux
        total_expenses = sum(item['balance'] for item in expenses)
        total_incomes = sum(item['balance'] for item in incomes)
        
        return {
            'start_date': start_date,
            'end_date': end_date,
            'expenses': expenses,
            'incomes': incomes,
            'total_expenses': total_expenses,
            'total_incomes': total_incomes,
            'result': total_incomes - total_expenses
        }

    @staticmethod
    def generate_vat_declaration(period_id):
        """Génère la déclaration de TVA pour une période."""
        from ..models import Account, FiscalPeriod
        
        try:
            period = FiscalPeriod.objects.get(id=period_id)
        except FiscalPeriod.DoesNotExist:
            raise ValueError(_("Période fiscale non trouvée"))
        
        # Comptes de TVA
        vat_collected_accounts = Account.objects.filter(
            code__regex=r'^4455.*',
            is_active=True
        )
        vat_deductible_accounts = Account.objects.filter(
            code__regex=r'^3455.*',
            is_active=True
        )
        
        # TVA collectée
        vat_collected_details = []
        vat_collected_total = Decimal('0.0')
        
        for account in vat_collected_accounts:
            balance = FinancialReportService.get_account_balance(
                account.id, 
                start_date=period.start_date, 
                end_date=period.end_date,
                sign=-1  # Les comptes de TVA collectée sont créditeurs, on inverse le signe
            )
            if balance != 0:
                vat_collected_details.append({
                    'account': {
                        'id': account.id,
                        'code': account.code,
                        'name': account.name,
                    },
                    'balance': float(balance)
                })
                vat_collected_total += balance
        
        # TVA déductible
        vat_deductible_details = []
        vat_deductible_total = Decimal('0.0')
        
        for account in vat_deductible_accounts:
            balance = FinancialReportService.get_account_balance(
                account.id, 
                start_date=period.start_date, 
                end_date=period.end_date
            )
            if balance != 0:
                vat_deductible_details.append({
                    'account': {
                        'id': account.id,
                        'code': account.code,
                        'name': account.name,
                    },
                    'balance': float(balance)
                })
                vat_deductible_total += balance
        
        # Résultat de la TVA
        vat_due = vat_collected_total - vat_deductible_total
        is_credit = vat_due < 0
        
        return {
            'period': {
                'id': period.id,
                'name': period.name,
                'start_date': period.start_date,
                'end_date': period.end_date
            },
            'vat_collected': {
                'details': vat_collected_details,
                'total': float(vat_collected_total)
            },
            'vat_deductible': {
                'details': vat_deductible_details,
                'total': float(vat_deductible_total)
            },
            'vat_due': float(vat_due),
            'is_credit': is_credit,
            'absolute_vat_due': float(abs(vat_due))
        }
