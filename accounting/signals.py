from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from decimal import Decimal

# Modèles de comptabilité
from .models import (
    JournalEntry, JournalEntryLine, FiscalYear, FiscalPeriod,
    Asset, AssetDepreciation
)

# Suppression de l'import problématique:
# from .services.accounting_service import AccountingService

# Importer les modèles d'autres modules
try:
    from sales.models import Invoice, Quote, Order, Payment
except ImportError:
    Invoice = None
    Quote = None
    Order = None
    Payment = None

try:
    from payroll.models import PayrollRun, PaySlip
except ImportError:
    PayrollRun = None
    PaySlip = None

# Signaux internes au module accounting

@receiver(pre_save, sender=JournalEntry)
def journal_entry_pre_save(sender, instance, **kwargs):
    """Signal déclenché avant la sauvegarde d'une écriture comptable."""
    # Si c'est une nouvelle écriture, générer un nom
    if not instance.pk and not instance.name and instance.journal_id:
        instance.name = instance.journal_id.next_sequence(instance.date)

@receiver(post_save, sender=FiscalYear)
def fiscal_year_post_save(sender, instance, created, **kwargs):
    """Signal déclenché après la sauvegarde d'un exercice fiscal."""
    # Si c'est un nouvel exercice et que son statut est 'open', créer les périodes
    if created and instance.state == 'open':
        instance.create_periods()

@receiver(post_save, sender=Asset)
def asset_post_save(sender, instance, created, **kwargs):
    """Signal déclenché après la sauvegarde d'une immobilisation."""
    # Si c'est une nouvelle immobilisation et que l'état est 'draft', calculer les amortissements
    if created and instance.state == 'draft':
        try:
            instance.compute_depreciation_board()
        except Exception as e:
            # Ne pas bloquer la sauvegarde si le calcul échoue
            pass

# Signaux d'intégration avec d'autres modules

if Invoice:
    @receiver(post_save, sender=Invoice)
    def invoice_post_save(sender, instance, created, **kwargs):
        """Signal déclenché après la sauvegarde d'une facture."""
        # Générer une écriture comptable uniquement si la facture est validée
        # et qu'il n'existe pas déjà une écriture pour cette facture
        if instance.state == 'validated':
            # Vérifier si une écriture comptable existe déjà pour cette facture
            existing_entry = JournalEntry.objects.filter(
                source_module='sales',
                source_model='Invoice',
                source_id=instance.id
            ).first()

            if not existing_entry:
                # Créer l'écriture comptable
                AccountingService.create_invoice_entry(instance)

if Payment:
    @receiver(post_save, sender=Payment)
    def payment_post_save(sender, instance, created, **kwargs):
        """Signal déclenché après la sauvegarde d'un paiement."""
        # Générer une écriture comptable uniquement si le paiement est validé
        # et qu'il n'existe pas déjà une écriture pour ce paiement
        if instance.state == 'validated':
            # Vérifier si une écriture comptable existe déjà pour ce paiement
            existing_entry = JournalEntry.objects.filter(
                source_module='sales',
                source_model='Payment',
                source_id=instance.id
            ).first()

            if not existing_entry:
                # Créer l'écriture comptable
                AccountingService.create_payment_entry(instance)

if PayrollRun:
    @receiver(post_save, sender=PayrollRun)
    def payroll_run_post_save(sender, instance, created, **kwargs):
        """Signal déclenché après la sauvegarde d'un lancement de paie."""
        # Générer une écriture comptable uniquement si le lancement est validé
        # et qu'il n'existe pas déjà une écriture pour ce lancement
        if instance.state == 'validated':
            # Vérifier si une écriture comptable existe déjà pour ce lancement
            existing_entry = JournalEntry.objects.filter(
                source_module='payroll',
                source_model='PayrollRun',
                source_id=instance.id
            ).first()

            if not existing_entry:
                # Créer l'écriture comptable
                AccountingService.create_payroll_entry(instance)

# Services d'intégration spécifiques

class AccountingService:
    """Service d'intégration avec la comptabilité."""

    @staticmethod
    def create_invoice_entry(invoice):
        """Crée une écriture comptable pour une facture."""
        from .models import Journal, Account, JournalEntry, JournalEntryLine, FiscalPeriod

        try:
            # Récupérer le journal des ventes
            journal = Journal.objects.get(code='VEN')

            # Déterminer la période fiscale
            try:
                period = FiscalPeriod.objects.get(
                    start_date__lte=invoice.date,
                    end_date__gte=invoice.date,
                    state='open'
                )
            except FiscalPeriod.DoesNotExist:
                # Pas de période ouverte, on ne peut pas créer l'écriture
                return None

            # Créer l'écriture
            entry = JournalEntry.objects.create(
                journal_id=journal,
                date=invoice.date,
                period_id=period,
                ref=invoice.number,
                narration=f"Facture {invoice.number} - {invoice.customer.name if invoice.customer else ''}",
                source_module='sales',
                source_model='Invoice',
                source_id=invoice.id,
                is_manual=False,
                created_by=invoice.created_by if hasattr(invoice, 'created_by') else None
            )

            # Comptes comptables
            customer_account = Account.objects.get(code='411000')  # Compte client
            revenue_account = Account.objects.get(code='701000')  # Ventes de produits
            tax_account = Account.objects.get(code='445500')  # TVA collectée

            # Créer les lignes d'écriture
            # 1. Ligne client (débit)
            JournalEntryLine.objects.create(
                entry_id=entry,
                account_id=customer_account,
                name=f"Facture {invoice.number}",
                partner_id=invoice.customer if hasattr(invoice, 'customer') else None,
                debit=invoice.total_amount,
                credit=0,
                date=invoice.date,
                date_maturity=invoice.due_date if hasattr(invoice, 'due_date') else None
            )

            # 2. Ligne produit (crédit)
            JournalEntryLine.objects.create(
                entry_id=entry,
                account_id=revenue_account,
                name=f"Facture {invoice.number}",
                partner_id=invoice.customer if hasattr(invoice, 'customer') else None,
                debit=0,
                credit=invoice.total_untaxed if hasattr(invoice, 'total_untaxed') else invoice.total_amount,
                date=invoice.date
            )

            # 3. Ligne TVA (crédit) - uniquement si non exonéré
            if hasattr(invoice, 'total_tax') and invoice.total_tax > 0 and not (hasattr(invoice, 'is_tax_exempt') and invoice.is_tax_exempt):
                JournalEntryLine.objects.create(
                    entry_id=entry,
                    account_id=tax_account,
                    name=f"TVA sur facture {invoice.number}",
                    partner_id=invoice.customer if hasattr(invoice, 'customer') else None,
                    debit=0,
                    credit=invoice.total_tax,
                    date=invoice.date
                )

            # Valider l'écriture
            entry.post()

            return entry
        except Exception as e:
            # Log l'erreur
            print(f"Erreur lors de la création de l'écriture comptable pour la facture {invoice.number}: {str(e)}")
            # On ne relance pas l'erreur pour ne pas bloquer la sauvegarde de la facture
            return None

    @staticmethod
    def create_payment_entry(payment):
        """Crée une écriture comptable pour un paiement."""
        from .models import Journal, Account, JournalEntry, JournalEntryLine, FiscalPeriod

        try:
            # Déterminer le journal (banque ou caisse selon le mode de paiement)
            if hasattr(payment, 'payment_method'):
                if payment.payment_method in ['bank_transfer', 'check', 'credit_card']:
                    journal = Journal.objects.get(code='BNK')
                    bank_account = Account.objects.get(code='514000')  # Compte bancaire
                else:
                    journal = Journal.objects.get(code='CSH')
                    bank_account = Account.objects.get(code='516000')  # Compte caisse
            else:
                # Par défaut, on utilise le journal de banque
                journal = Journal.objects.get(code='BNK')
                bank_account = Account.objects.get(code='514000')  # Compte bancaire

            # Déterminer la période fiscale
            try:
                period = FiscalPeriod.objects.get(
                    start_date__lte=payment.date,
                    end_date__gte=payment.date,
                    state='open'
                )
            except FiscalPeriod.DoesNotExist:
                # Pas de période ouverte, on ne peut pas créer l'écriture
                return None

            # Créer l'écriture
            entry = JournalEntry.objects.create(
                journal_id=journal,
                date=payment.date,
                period_id=period,
                ref=payment.reference if hasattr(payment, 'reference') else '',
                narration=f"Paiement {payment.reference if hasattr(payment, 'reference') else ''} - {payment.customer.name if hasattr(payment, 'customer') and payment.customer else ''}",
                source_module='sales',
                source_model='Payment',
                source_id=payment.id,
                is_manual=False,
                created_by=payment.created_by if hasattr(payment, 'created_by') else None
            )

            # Comptes comptables
            customer_account = Account.objects.get(code='411000')  # Compte client

            # Créer les lignes d'écriture
            # 1. Ligne banque/caisse (débit)
            JournalEntryLine.objects.create(
                entry_id=entry,
                account_id=bank_account,
                name=f"Paiement {payment.reference if hasattr(payment, 'reference') else ''}",
                partner_id=payment.customer if hasattr(payment, 'customer') else None,
                debit=payment.amount,
                credit=0,
                date=payment.date
            )

            # 2. Ligne client (crédit)
            JournalEntryLine.objects.create(
                entry_id=entry,
                account_id=customer_account,
                name=f"Paiement {payment.reference if hasattr(payment, 'reference') else ''}",
                partner_id=payment.customer if hasattr(payment, 'customer') else None,
                debit=0,
                credit=payment.amount,
                date=payment.date
            )

            # Valider l'écriture
            entry.post()

            return entry
        except Exception as e:
            # Log l'erreur
            print(f"Erreur lors de la création de l'écriture comptable pour le paiement {payment.id}: {str(e)}")
            # On ne relance pas l'erreur pour ne pas bloquer la sauvegarde du paiement
            return None

    @staticmethod
    def create_payroll_entry(payroll_run):
        """Crée une écriture comptable pour un lancement de paie."""
        from .models import Journal, Account, JournalEntry, JournalEntryLine, FiscalPeriod

        try:
            # Récupérer le journal des salaires
            journal = Journal.objects.get(code='SAL')

            # Déterminer la période fiscale
            period_date = payroll_run.period.end_date if hasattr(payroll_run, 'period') else payroll_run.date

            try:
                period = FiscalPeriod.objects.get(
                    start_date__lte=period_date,
                    end_date__gte=period_date,
                    state='open'
                )
            except FiscalPeriod.DoesNotExist:
                # Pas de période ouverte, on ne peut pas créer l'écriture
                return None

            # Créer l'écriture
            entry = JournalEntry.objects.create(
                journal_id=journal,
                date=period_date,
                period_id=period,
                ref=f"PAIE-{payroll_run.id}",
                narration=f"Salaires {payroll_run.period.name if hasattr(payroll_run, 'period') else period_date.strftime('%m/%Y')}",
                source_module='payroll',
                source_model='PayrollRun',
                source_id=payroll_run.id,
                is_manual=False,
                created_by=payroll_run.created_by if hasattr(payroll_run, 'created_by') else None
            )

            # Comptes comptables
            salary_account = Account.objects.get(code='641000')  # Salaires
            social_account = Account.objects.get(code='645000')  # Charges sociales
            salary_payable = Account.objects.get(code='421000')  # Salaires à payer
            social_payable = Account.objects.get(code='431000')  # Organismes sociaux

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

            # Créer les lignes d'écriture
            # 1. Salaires bruts (débit)
            JournalEntryLine.objects.create(
                entry_id=entry,
                account_id=salary_account,
                name="Salaires bruts",
                debit=total_gross,
                credit=0,
                date=period_date
            )

            # 2. Charges patronales (débit)
            JournalEntryLine.objects.create(
                entry_id=entry,
                account_id=social_account,
                name="Charges sociales patronales",
                debit=total_employer,
                credit=0,
                date=period_date
            )

            # 3. Salaires nets à payer (crédit)
            JournalEntryLine.objects.create(
                entry_id=entry,
                account_id=salary_payable,
                name="Salaires nets à payer",
                debit=0,
                credit=total_net,
                date=period_date
            )

            # 4. Charges sociales à payer (crédit)
            JournalEntryLine.objects.create(
                entry_id=entry,
                account_id=social_payable,
                name="Charges sociales à payer",
                debit=0,
                credit=total_employer + total_employee,
                date=period_date
            )

            # Valider l'écriture
            entry.post()

            return entry
        except Exception as e:
            # Log l'erreur
            print(f"Erreur lors de la création de l'écriture comptable pour le lancement de paie {payroll_run.id}: {str(e)}")
            # On ne relance pas l'erreur pour ne pas bloquer la sauvegarde du lancement
            return None
