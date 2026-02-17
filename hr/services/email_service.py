from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags


class EmailService:
    """Classe utilitaire pour l'envoi d'emails."""

    @staticmethod
    def send_email(template_name, context, subject, recipient_email, attachments=None):
        """
        Envoie un email à partir d'un template.

        Args:
            template_name (str): Nom du template email
            context (dict): Contexte pour le template
            subject (str): Sujet de l'email
            recipient_email (str): Email du destinataire
            attachments (list): Liste de chemins de fichiers à joindre

        Returns:
            bool: True si l'email a été envoyé, False sinon
        """
        try:
            # Préparation du contenu de l'email
            html_content = render_to_string(template_name, context)
            text_content = strip_tags(html_content)

            # Création du message
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[recipient_email],
            )

            # Ajout de la version HTML
            email.attach_alternative(html_content, 'text/html')

            # Ajout des pièces jointes
            if attachments:
                for attachment_path in attachments:
                    email.attach_file(attachment_path)

            # Envoi de l'email
            email.send()
            return True

        except Exception as e:
            print(f"Erreur lors de l'envoi de l'email: {str(e)}")
            return False

    @staticmethod
    def send_mission_notification(
        mission, to_employee=True, to_manager=False, to_hr=False
    ):
        """
        Envoie une notification pour une mission.

        Args:
            mission: L'objet Mission
            to_employee (bool): Si True, envoie à l'employé concerné
            to_manager (bool): Si True, envoie au manager de l'employé
            to_hr (bool): Si True, envoie aux RH

        Returns:
            bool: True si l'email a été envoyé, False sinon
        """
        context = {
            'mission': mission,
            'employee': mission.employee,
        }

        template_name = 'hr/emails/mission_notification.html'
        subject = f'Mission: {mission.title} - {mission.get_status_display()}'

        # Liste des destinataires
        recipients = []

        # Ajouter l'employé
        if to_employee and mission.employee and mission.employee.email:
            recipients.append(mission.employee.email)

        # Ajouter le manager
        if (
            to_manager
            and mission.employee
            and mission.employee.manager
            and mission.employee.manager.email
        ):
            recipients.append(mission.employee.manager.email)

        # Ajouter les RH (tous les employés avec le rôle RH)
        if to_hr:
            from ..models import Employee

            hr_emails = Employee.objects.filter(is_hr=True, is_active=True).values_list(
                'email', flat=True
            )
            recipients.extend(hr_emails)

        # Envoyer l'email à chaque destinataire
        success = True
        for recipient in recipients:
            if not EmailService.send_email(template_name, context, subject, recipient):
                success = False

        return success

    @staticmethod
    def send_training_plan_notification(
        training_plan, to_employee=True, to_manager=False, to_hr=False
    ):
        """
        Envoie une notification pour un plan de formation.

        Args:
            training_plan: L'objet TrainingPlan
            to_employee (bool): Si True, envoie à l'employé concerné
            to_manager (bool): Si True, envoie au manager de l'employé
            to_hr (bool): Si True, envoie aux RH

        Returns:
            bool: True si l'email a été envoyé, False sinon
        """
        context = {
            'training_plan': training_plan,
            'employee': training_plan.employee,
            'items': training_plan.training_items.all(),
        }

        template_name = 'hr/emails/training_plan_notification.html'
        subject = f'Plan de formation {training_plan.year} - {training_plan.get_status_display()}'

        # Liste des destinataires
        recipients = []

        # Ajouter l'employé
        if to_employee and training_plan.employee and training_plan.employee.email:
            recipients.append(training_plan.employee.email)

        # Ajouter le manager
        if (
            to_manager
            and training_plan.employee
            and training_plan.employee.manager
            and training_plan.employee.manager.email
        ):
            recipients.append(training_plan.employee.manager.email)

        # Ajouter les RH (tous les employés avec le rôle RH)
        if to_hr:
            from ..models import Employee

            hr_emails = Employee.objects.filter(is_hr=True, is_active=True).values_list(
                'email', flat=True
            )
            recipients.extend(hr_emails)

        # Envoyer l'email à chaque destinataire
        success = True
        for recipient in recipients:
            if not EmailService.send_email(template_name, context, subject, recipient):
                success = False

        return success
