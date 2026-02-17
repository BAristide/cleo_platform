import os

from django.conf import settings
from django.core.mail import EmailMessage
from django.template.loader import render_to_string

from .pdf_generator import PDFGenerator


class EmailService:
    """Service pour envoyer des emails avec pièces jointes"""

    @staticmethod
    def send_quote_email(quote, recipient_email, subject=None):
        """Envoie un devis par email"""
        # Si le sujet n'est pas spécifié, utiliser un sujet par défaut
        if not subject:
            subject = f'Devis {quote.number} - ECINTELLIGENCE'

        # Préparer le contexte pour le template d'email
        context = {
            'quote': quote,
            'company': quote.company,
            'contact': quote.contact,
            'company_info': {
                'name': 'ECINTELLIGENCE',
                'address': 'La Marina Casablanca | Tour Oceanes 3 Bureau 03 Rez-De-Jardin',
                'city': 'Casablanca',
                'country': 'Maroc',
                'email': 'infos@ecintelligence.ma',
                'phone': '+(212) 5220 48-727/0666 366 018',
            },
        }

        # Générer le contenu de l'email à partir du template
        message = render_to_string('sales/emails/quote_email.html', context)

        # Vérifier que le PDF existe, sinon le générer
        if not quote.pdf_file:
            # Générer le PDF si nécessaire
            pdf_path = PDFGenerator.generate_quote_pdf(quote)
        else:
            pdf_path = os.path.join(settings.MEDIA_ROOT, quote.pdf_file)

        # Créer l'email
        email = EmailMessage(
            subject=subject,
            body=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient_email],
            reply_to=[settings.DEFAULT_FROM_EMAIL],
        )
        email.content_subtype = 'html'  # Pour interpréter le HTML

        # Ajouter la pièce jointe
        with open(pdf_path, 'rb') as f:
            email.attach(f'Devis_{quote.number}.pdf', f.read(), 'application/pdf')

        # Envoyer l'email
        try:
            email.send()
            return True
        except Exception as e:
            print(f"Erreur lors de l'envoi de l'email: {str(e)}")
            return False

    @staticmethod
    def send_order_email(order, recipient_email, subject=None):
        """Envoie un bon de commande par email"""
        # Si le sujet n'est pas spécifié, utiliser un sujet par défaut
        if not subject:
            subject = f'Commande {order.number} - ECINTELLIGENCE'

        # Préparer le contexte pour le template d'email
        context = {
            'order': order,
            'company': order.company,
            'contact': order.contact,
            'company_info': {
                'name': 'ECINTELLIGENCE',
                'address': 'La Marina Casablanca | Tour Oceanes 3 Bureau 03 Rez-De-Jardin',
                'city': 'Casablanca',
                'country': 'Maroc',
                'email': 'infos@ecintelligence.ma',
                'phone': '+(212) 5220 48-727/0666 366 018',
            },
        }

        # Générer le contenu de l'email à partir du template
        message = render_to_string('sales/emails/order_email.html', context)

        # Vérifier que le PDF existe, sinon le générer
        if not order.pdf_file:
            # Générer le PDF si nécessaire
            pdf_path = PDFGenerator.generate_order_pdf(order)
        else:
            pdf_path = os.path.join(settings.MEDIA_ROOT, order.pdf_file)

        # Créer l'email
        email = EmailMessage(
            subject=subject,
            body=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient_email],
            reply_to=[settings.DEFAULT_FROM_EMAIL],
        )
        email.content_subtype = 'html'  # Pour interpréter le HTML

        # Ajouter la pièce jointe
        with open(pdf_path, 'rb') as f:
            email.attach(f'Commande_{order.number}.pdf', f.read(), 'application/pdf')

        # Envoyer l'email
        try:
            email.send()
            return True
        except Exception as e:
            print(f"Erreur lors de l'envoi de l'email: {str(e)}")
            return False

    @staticmethod
    def send_invoice_email(invoice, recipient_email, subject=None):
        """Envoie une facture par email"""
        # Si le sujet n'est pas spécifié, utiliser un sujet par défaut
        if not subject:
            subject = f'Facture {invoice.number} - ECINTELLIGENCE'

        # Préparer le contexte pour le template d'email
        context = {
            'invoice': invoice,
            'company': invoice.company,
            'contact': invoice.contact,
            'company_info': {
                'name': 'ECINTELLIGENCE',
                'address': 'La Marina Casablanca | Tour Oceanes 3 Bureau 03 Rez-De-Jardin',
                'city': 'Casablanca',
                'country': 'Maroc',
                'email': 'infos@ecintelligence.ma',
                'phone': '+(212) 5220 48-727/0666 366 018',
            },
        }

        # Générer le contenu de l'email à partir du template
        message = render_to_string('sales/emails/invoice_email.html', context)

        # Vérifier que le PDF existe, sinon le générer
        if not invoice.pdf_file:
            # Générer le PDF si nécessaire
            pdf_path = PDFGenerator.generate_invoice_pdf(invoice)
        else:
            pdf_path = os.path.join(settings.MEDIA_ROOT, invoice.pdf_file)

        # Créer l'email
        email = EmailMessage(
            subject=subject,
            body=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient_email],
            reply_to=[settings.DEFAULT_FROM_EMAIL],
        )
        email.content_subtype = 'html'  # Pour interpréter le HTML

        # Ajouter la pièce jointe
        with open(pdf_path, 'rb') as f:
            email.attach(f'Facture_{invoice.number}.pdf', f.read(), 'application/pdf')

        # Envoyer l'email
        try:
            email.send()
            return True
        except Exception as e:
            print(f"Erreur lors de l'envoi de l'email: {str(e)}")
            return False
