# payroll/signals.py
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

from .models import (
    Employee, EmployeePayroll, PaySlip, PayrollRun, 
    AdvanceSalary, ContractType
)

@receiver(post_save, sender=Employee)
def create_employee_payroll(sender, instance, created, **kwargs):
    """Crée automatiquement les informations de paie pour un nouvel employé."""
    if created:
        # Vérifier si EmployeePayroll existe déjà
        if not hasattr(instance, 'payroll_info'):
            # Récupérer le type de contrat CDI par défaut
            default_contract = ContractType.objects.filter(code='CDI').first()
            if not default_contract:
                default_contract = ContractType.objects.create(
                    code='CDI',
                    name='Contrat à Durée Indéterminée',
                    is_active=True
                )
            
            # Créer les infos de paie par défaut
            EmployeePayroll.objects.create(
                employee=instance,
                contract_type=default_contract,
                base_salary=0,  # À remplir manuellement
                payment_method='bank_transfer'
            )

@receiver(pre_save, sender=PayrollRun)
def update_payroll_run_status_dates(sender, instance, **kwargs):
    """Met à jour les dates de statut du lancement de paie."""
    try:
        old_instance = PayrollRun.objects.get(pk=instance.pk)
        
        # Si passage au statut calculé
        if old_instance.status != 'calculated' and instance.status == 'calculated':
            instance.calculated_date = timezone.now()
        
        # Si passage au statut validé
        if old_instance.status != 'validated' and instance.status == 'validated':
            instance.validated_date = timezone.now()
        
        # Si passage au statut payé
        if old_instance.status != 'paid' and instance.status == 'paid':
            instance.paid_date = timezone.now()
            
    except PayrollRun.DoesNotExist:
        # Nouveau lancement de paie, rien à faire
        pass

@receiver(post_save, sender=PayrollRun)
def update_payslips_status(sender, instance, **kwargs):
    """Met à jour le statut des bulletins de paie lorsque le lancement change de statut."""
    if instance.status in ['validated', 'paid', 'cancelled']:
        # Mettre à jour tous les bulletins de ce lancement
        instance.payslips.filter(status='calculated').update(status=instance.status)
        
        # Si le lancement est payé, marquer les bulletins comme payés
        if instance.status == 'paid':
            instance.payslips.filter(is_paid=False).update(
                is_paid=True,
                payment_date=timezone.now().date()
            )

@receiver(post_save, sender=PaySlip)
def generate_payslip_pdf(sender, instance, **kwargs):
    """Génère automatiquement le PDF du bulletin quand il est calculé ou validé."""
    if instance.status in ['calculated', 'validated'] and not instance.pdf_file:
        from .services.pdf_generator import PayrollPDFGenerator
        PayrollPDFGenerator.generate_payslip_pdf(instance)
